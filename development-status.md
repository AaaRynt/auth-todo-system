# Auth Todo System - Development Status

最后更新：2026-05-27

## 1. 当前结论

项目已经不再是只保存在浏览器里的 Todo 原型。目前代码实现了：

- 基于 PostgreSQL 与 Prisma 7 的账号、session、group、todo 数据模型。
- 注册、登录、保持登录态、退出、修改昵称、修改密码、注销账号的认证闭环。
- Todo 的查询、新建、修改、完成切换、删除与清理已完成项。
- Group 的查询、新建、改名、删除，以及删除 group 时将 todo 移动到 `Inbox`。
- Todo 与 Group 的后端查询、创建、更新和删除都绑定当前登录用户。
- 全局 necessary cookie notice banner。

目前适合描述为：

```text
业务代码已达到可演示的 database-backed MVP；
本地 migration history 已对齐，下一阶段应集中在可靠性测试与部署准备。
```

本文档已同步本轮可靠性修正；本轮没有执行 build。

## 2. 技术栈与结构

| 分类               | 当前实现                                                          |
| ------------------ | ----------------------------------------------------------------- |
| Web framework      | Next.js App Router + React 19 + TypeScript                        |
| UI                 | Tailwind CSS v4、本地 shadcn/Radix 风格组件、lucide-react、sonner |
| 数据库             | PostgreSQL，本地开发目标为 PostgreSQL.app                         |
| ORM                | Prisma 7 新 generator 架构 + `@prisma/adapter-pg`                 |
| Prisma Client 输出 | `app/generated/prisma/`                                           |
| 包管理             | pnpm                                                              |
| 认证方式           | 数据库 session + HttpOnly cookie                                  |

重要入口：

- `prisma/schema.prisma`：数据库实体与关系。
- `lib/prisma.ts`：Prisma Client 与 PostgreSQL adapter 初始化。
- `lib/auth/session.ts`：登录态 cookie 与 session 读取。
- `lib/todo-data.ts`：Todo/Group 的校验、序列化与 `Inbox` 规则。
- `app/main/todo/todo-provider.tsx`：前端 Todo/Group 请求与页面共享状态。
- `app/main/layout.tsx`：主应用侧栏、group 导航与账号入口。

## 3. 数据库设计

### 3.1 当前模型

| 模型      | 职责           | 关键约束                                     |
| --------- | -------------- | -------------------------------------------- |
| `User`    | 账号与 profile | `username` 唯一，包含 `nickname` 与密码 hash |
| `Session` | 登录 session   | token hash 唯一；删除 User 时级联删除        |
| `Group`   | 用户的任务分组 | 归属 `userId`；`@@unique([userId, name])`    |
| `Todo`    | 用户任务       | 同时保存 `userId` 与 `groupId`               |

Todo 和 Group 使用复合关系：

```prisma
group Group @relation(fields: [groupId, userId], references: [id, userId], onDelete: Cascade)
```

这条约束的作用是：一个 Todo 无法在数据库层面关联到其他用户的 Group。API 层的 ownership 校验之外，数据库仍提供了一层隔离保证。

### 3.2 Group 删除策略

当前选择的是“保留 Todo”而不是级联删除业务数据：

- `Inbox` 是默认 group，不能改名或删除。
- 删除其他 group 时，其 todos 会在 transaction 中移动到当前用户的 `Inbox`。
- 删除确认弹窗会显示预计移动的 todo 数量。

对任务应用来说，这个策略比直接删除任务更合理，因为删除分类不应默认导致任务丢失。

### 3.3 Migration 状态：已对齐

代码仓库中存在三个 migration：

| 本地 migration                         | 内容                        |
| -------------------------------------- | --------------------------- |
| `20260512170000-init-auth`             | 创建 `User`、`Session`      |
| `20260519000000-add-user-nickname`     | 增加并回填 `nickname`       |
| `20260524141948_add_todo_models`       | 创建 `Group`、`Todo` 与关系 |

此前仓库中的 Todo/Group migration 文件名为 `20260524000000-add-group-todo-models`，数据库已登记的名称为 `20260524141948_add_todo_models`。本轮将仓库中的 migration 路径对齐到数据库既有记录，SQL 内容未改变，也没有重置数据库或删除业务数据。

本轮执行 `pnpm prisma migrate status` 的结果是：

```text
3 migrations found in prisma/migrations
Database schema is up to date!
```

后续原则不变：migration 一旦被共享或部署，就应保留其历史名称与内容，通过新增 migration 演进数据库，而不是重写已应用历史。

## 4. 认证与账号能力

### 4.1 API 完成情况

| API                        | 状态   | 能力                                               |
| -------------------------- | ------ | -------------------------------------------------- |
| `POST /api/auth/register`  | 已实现 | 注册，默认 `nickname = username`，自动创建 session |
| `POST /api/auth/login`     | 已实现 | 校验密码并创建 session                             |
| `GET /api/auth/me`         | 已实现 | 返回当前登录用户                                   |
| `POST /api/auth/logout`    | 已实现 | 删除当前 session 并清 cookie                       |
| `PATCH /api/auth/password` | 已实现 | 校验当前密码后修改密码                             |
| `PATCH /api/auth/account`  | 已实现 | 修改 nickname                                      |
| `DELETE /api/auth/account` | 已实现 | 校验密码后注销账号                                 |

### 4.2 安全设计现状

- 密码通过 Node `scrypt` 加 salt 后存储，不保存明文。
- 密码策略要求至少 6 位，且包含大小写字母和数字。
- session cookie 为 `HttpOnly`、`SameSite=Lax`，生产环境启用 `Secure`。
- 数据库只保存 session token 的 hash。
- session 有 30 天过期时间。
- 删除账号会通过外键 cascade 删除 session、groups 和 todos。

### 4.3 认证前端

已实现：

- 登录与注册真实请求。
- 密码显隐切换。
- 修改 nickname 的 dialog 与成功 toast。
- 修改密码 dialog。
- 退出登录。
- 输入密码确认后的注销账号。
- `AuthGuard` 在私有页面请求 `/api/auth/me` 并引导未登录用户回到 `/auth`。

明确不纳入当前项目范围：

- Forgot password 流程。
- 头像上传。

当前仍可后续增强：

- 更完整的个人资料字段。

## 5. Todo 与 Group 后端化

### 5.1 API 完成情况

| API                            | 状态   | 用户隔离方式                                  |
| ------------------------------ | ------ | --------------------------------------------- |
| `GET /api/todos`               | 已实现 | `where: { userId: currentUser.id }`           |
| `POST /api/todos`              | 已实现 | 创建时写入当前 `userId`                       |
| `PATCH /api/todos/[todoId]`    | 已实现 | 先用 `id + userId` 查找 ownership             |
| `DELETE /api/todos/[todoId]`   | 已实现 | `deleteMany` 限定 `id + userId`               |
| `GET /api/groups`              | 已实现 | 只列出当前用户 groups                         |
| `POST /api/groups`             | 已实现 | 创建时写入当前 `userId`                       |
| `PATCH /api/groups/[groupId]`  | 已实现 | 先用 `id + userId` 校验 ownership             |
| `DELETE /api/groups/[groupId]` | 已实现 | 校验 ownership，并在 transaction 内移动 todos |

### 5.2 前端数据流

核心数据现在不再通过 `localStorage` 保存：

```text
页面进入 /main
  -> TodoProvider 并行请求 GET /api/todos 与 GET /api/groups
  -> API 通过 session 得到当前 userId
  -> Prisma 读取 PostgreSQL 中该用户的数据
  -> Provider 存入 React state
  -> UI 展示列表、统计和 group 数量
```

Todo 与 Group 的创建、修改、删除均走 API；成功后 Provider 更新当前页面 state。`localStorage` 当前只用于主题与 cookie notice 等界面偏好，不承载核心 Todo 数据。

### 5.3 已完成的页面能力

- 新建 Todo，并选择或输入 group 与 priority。
- 编辑 Todo title、group、priority。
- 完成 / 取消完成 Todo。
- 删除单条 Todo，并有确认交互。
- 按 All / Active / Completed 过滤。
- 根据 title 搜索。
- 查看 All Tasks 和指定 group。
- 显示任务进度统计。
- 新建、重命名、删除 group。
- group 侧栏显示数据库返回的 todo 数量。
- 删除 group 前说明移动到 `Inbox` 的任务数量。

## 6. 辅助体验功能

已完成：

- Theme toggle。
- Toast 消息。
- Necessary cookie notice：首次访问显示，确认状态存入 `localStorage`，不会作为 analytics consent manager 使用。
- 主要 Todo 列表加载失败时显示错误和 Retry。
- 新建、编辑、删除等主要 Todo/Group 操作有 loading 或错误反馈。

## 7. 当前完成度判断

| 模块                   | 判断                       |
| ---------------------- | -------------------------- |
| 基础页面和设计系统     | 可演示                     |
| 注册/登录/session 闭环 | 已完成核心功能             |
| Account 操作           | 已完成核心功能             |
| Todo PostgreSQL CRUD   | 已完成代码接入             |
| Group PostgreSQL CRUD  | 已完成代码接入             |
| 多用户数据隔离         | API 与数据库关系均有实现   |
| Migration 基线         | 已对齐                     |
| 自动化测试             | 未建立                     |
| 部署准备               | 未完成                     |
| 产品增强功能           | 可后续规划                 |

因此下一阶段应优先补关键测试、收紧剩余一致性边界，并准备部署与作品说明。

## 8. 已处理事项与优化优先级

### 本轮已处理

#### 8.1 Migration history 分叉

仓库中的 Todo/Group migration 已和数据库登记的名称对齐。验证结果为：

```text
pnpm prisma migrate status
Database schema is up to date!
```

#### 8.2 修正文案与真实存储不一致

`app/main/todo/empty-state.tsx` 中关于 Todo 保存在浏览器本地的旧文案已移除，界面不再与 PostgreSQL 持久化事实冲突。

#### 8.3 为认证/账号表单补网络异常收口

登录、注册、修改昵称、修改密码、退出登录和注销账号均已处理网络请求失败：

- 表单请求使用 `try/catch/finally`，网络失败会显示错误并恢复 loading 状态。
- 退出登录失败使用 toast 反馈，也会恢复按钮状态。

#### 8.4 产品范围收敛

Forgot password 与头像上传不再作为该项目的待实现能力；登录页不再展示无实际功能的忘记密码入口，账号组件也不再保留头像上传待办。

### P1：准备部署或公开展示前处理

#### 8.5 让 group 名称唯一约束与业务规则一致

API 使用大小写不敏感判断 group 重名，但数据库当前唯一约束是 `@@unique([userId, name])`，PostgreSQL 默认区分大小写。并发请求或绕过前端时，业务规则和数据库约束可能不一致。

建议设计一个可迁移的标准化字段，例如 `normalizedName`，并在数据库层对 `[userId, normalizedName]` 唯一约束。

#### 8.6 修正删除 group 的实际移动数量

当前 `movedTodoCount` 在 transaction 前读取。若恰好同时有任务写入该 group，弹窗预估数与实际移动数可能不同。

建议从 transaction 中 `updateMany()` 的 `count` 返回实际移动数量，并用该结果生成完成后的 toast。

#### 8.7 密码修改后的 session 管理

当前修改密码后，既有 session 仍然有效。对于公开部署的账号系统，更合理的策略是：

- 修改密码后撤销其他设备的 sessions。
- 保留或轮换当前 session，使用户不会被意外登出。

#### 8.8 补 API 级关键测试

最重要的测试不是 UI 截图，而是 ownership：

- 用户 A 创建 Todo，用户 B 的 `GET /api/todos` 不可见。
- 用户 B 不可 PATCH/DELETE 用户 A 的 Todo。
- 用户 B 不可改名/删除用户 A 的 Group。
- 删除 Group 时任务准确移动到该用户自己的 `Inbox`。
- 删除账号后相关数据被 cascade 清理。

### P2：完成作品包装与下一阶段体验

- 把默认 metadata description 和默认 README 改为真实项目说明。
- 将 `clearCompleted` 从多个 DELETE 请求改为单个后端 bulk endpoint，保证原子性并减少请求。
- 把 group 页面路由从可变的 display name 改为稳定 id 或 slug，减少 rename 对 URL 的影响。
- 将 `priority` 从任意字符串提升为数据库可约束的值。
- 再评估归档、due date、排序与部署。

## 9. 推荐执行顺序

### Milestone A：基础可靠性修正（已完成）

1. 对齐 migration history，当前数据库状态检查通过。
2. 修正 empty-state 的本地存储旧文案。
3. 为认证和账号操作补请求异常处理。
4. 移除 Forgot password / 头像上传待办范围。

### Milestone B：加强可靠性与安全边界

1. 修复 group 删除移动数量的 transaction 返回值。
2. 落实大小写不敏感的 group 唯一约束。
3. 增加 ownership 和 cascade 的 API 集成测试。
4. 设计修改密码后的 session 撤销策略。

### Milestone C：准备作品展示

1. 配置部署数据库与环境变量。
2. 验证注册到 Todo/Group CRUD 的完整演示路径。
3. 准备 README 中的架构说明、功能截图和本地启动步骤。
4. 再决定增加 due date、archive 或排序等产品功能。

## 10. 本次扫描验证记录

本轮执行且通过：

```bash
pnpm prisma migrate status
pnpm prisma validate
pnpm exec tsc --noEmit --incremental false
pnpm exec prettier --check development-status.md app/auth/login.tsx app/auth/signup.tsx components/features/account.tsx
git diff --check
```

本轮执行并完成、但存在与本轮修复无关的 warning：

```bash
pnpm lint
```

当前未跟踪文件 `components/features/theme.tsx` 中的 `useEffect` 和 `useState` import 未被使用，ESLint 报告两个 warning；提交或接入该组件前应清理。

未执行：

- `pnpm build`，项目约定禁止运行。
- 浏览器端完整回归测试。
- 会重置数据库或删除业务数据的命令。

## 11. 建议优先阅读的代码

为了理解目前系统如何工作，阅读顺序建议为：

1. `prisma/schema.prisma`：先理解 User、Session、Group、Todo 如何关联。
2. `lib/auth/session.ts`：理解 cookie 如何换取当前用户身份。
3. `app/api/todos/route.ts`：理解创建和查询如何绑定 `userId`。
4. `app/api/groups/[groupId]/route.ts`：理解 ownership 与删除分组事务。
5. `lib/todo-data.ts`：理解统一校验、序列化与默认 `Inbox`。
6. `app/main/todo/todo-provider.tsx`：理解 API 数据如何进入 UI 状态。
7. `app/main/todo/todo-page.tsx` 与 `app/main/layout.tsx`：理解最终交互展示。

## 12. 工作区提示

本轮开始时，Git 工作区已经存在一项不是本次可靠性修改产生的删除：

```text
components/ui/avatar.tsx
```

该删除与“不做头像上传”的范围选择一致，但提交前仍应由你确认是否一起纳入提交。
