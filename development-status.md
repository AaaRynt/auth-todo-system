# Auth Todo System Development Status

最后更新：2026-05-19

## 1. 项目定位

这个项目目前已经从一个前端 Todo 原型，推进到了“有真实登录闭环的个人任务系统”阶段。

当前更准确的定位是：

- 一个基于账号体系的个人 Todo 管理应用。
- 认证系统已经接入真实 PostgreSQL 数据库。
- Todo 功能目前仍主要运行在浏览器本地状态和 `localStorage`。
- 下一阶段重点是把 Todo / Group 从本地数据迁移到后端数据库，并且和当前登录用户绑定。

如果未来要作为个人主力项目，建议继续保持这个方向：先把基础数据闭环做稳，再逐步补体验、统计、搜索、归档、部署和移动端适配。

## 2. 技术栈

当前项目使用：

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn / Radix 风格的本地 UI 组件
- lucide-react 图标
- sonner toast
- Prisma 7 新 generator 架构
- PostgreSQL，本地开发使用 PostgreSQL.app
- `@prisma/adapter-pg` 连接 PostgreSQL
- pnpm 包管理

重要约定：

- 不执行 build 命令。
- 文件和文件夹使用 lowercase kebab-case。
- 类型以 `T` 或 `I` 开头。
- 跨目录导入使用 `@/`。
- feature 组件集中在 `components/features/`。
- UI 基础组件集中在 `components/ui/`。
- 每个文件开头保留项目路径注释。

## 3. 当前数据库设计

Prisma schema 在 `prisma/schema.prisma`。

当前只有认证相关模型：

```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  nickname     String
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  sessions Session[]
}

model Session {
  id        String   @id @default(uuid())
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  userId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

当前 migration：

- `20260512170000-init-auth`：创建 `User` 和 `Session`。
- `20260519000000-add-user-nickname`：给 `User` 增加 `nickname`，并把已有用户的 nickname 回填为 username。

这两个 migration 不应该合并。它们是数据库演进历史，和 Git commit 类似，应该按时间顺序保留。

## 4. Prisma 配置

项目保留了 Prisma 7 新 generator 架构：

```prisma
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
}
```

所以执行：

```bash
pnpm prisma generate
```

会生成 Prisma Client 到：

```text
app/generated/prisma/
```

本地数据库连接通过 `.env` 的 `DATABASE_URL` 控制，当前开发方式是普通本地 PostgreSQL：

```env
DATABASE_URL="postgresql://localhost:5432/auth_todo_system"
```

Prisma 客户端封装在 `lib/prisma.ts`，使用 `PrismaPg` adapter。

## 5. 认证系统现状

认证后端已经形成闭环。

已完成 API：

- `POST /api/auth/register`
  - 注册用户。
  - 默认 `nickname = username`。
  - 密码会被 hash 后保存。
  - 注册成功后自动创建 session。

- `POST /api/auth/login`
  - 校验 username 和 password。
  - 登录成功后创建 session。

- `GET /api/auth/me`
  - 读取当前 session。
  - 返回当前用户信息。

- `POST /api/auth/logout`
  - 删除当前 session。
  - 清理 cookie。

- `PATCH /api/auth/password`
  - 修改密码。
  - 需要当前密码。
  - 新密码必须满足密码策略。

- `PATCH /api/auth/account`
  - 修改用户 profile。
  - 当前只支持 nickname。

- `DELETE /api/auth/account`
  - 注销账号。
  - 需要输入当前密码。
  - 删除用户后 session 会被清理。

密码策略在 `lib/auth/password.ts`：

- 至少 6 个字符。
- 必须包含小写字母。
- 必须包含大写字母。
- 必须包含数字。

session 设计在 `lib/auth/session.ts`：

- cookie 名称：`auth-todo-session`。
- cookie 是 HttpOnly。
- SameSite 使用 `lax`。
- session token 只把 hash 存入数据库。
- session 过期时间是 30 天。
- 删除 User 时，Session 通过 cascade 一起删除。

## 6. 认证前端现状

认证页面在 `app/auth/`。

当前页面和组件：

- `app/auth/page.tsx`
  - 控制 Login / Signup 切换。
  - 把输入中的 username 传给旁边展示区。

- `app/auth/login.tsx`
  - 调用真实 `/api/auth/login`。
  - 有 loading、error、禁用提交状态。
  - password 有 Eye / EyeOff。
  - 登录成功后跳转 `/main`。
  - `Forgot password?` 目前只是占位，功能未实现。

- `app/auth/signup.tsx`
  - 调用真实 `/api/auth/register`。
  - 有前端密码策略校验。
  - 有 terms checkbox。
  - password / confirm password 有 Eye / EyeOff。
  - 注册成功后跳转 `/main`。

路由保护：

- `components/auth-guard.tsx`
  - 公共路径：`/`、`/auth`。
  - 非公共路径访问前请求 `/api/auth/me`。
  - 未登录时跳转 `/auth`。

根路径：

- `app/page.tsx`
  - 根据 `/api/auth/me` 判断跳转 `/main` 或 `/auth`。

## 7. Main 页面设计

主应用布局在 `app/main/layout.tsx`。

当前结构：

- 顶部固定 header。
- 左侧固定 sidebar。
- 右侧主内容区域。
- `TodoProvider` 包住整个 main 区域。
- sidebar 中包含：
  - 搜索框。
  - New Group 弹窗。
  - All Tasks 入口。
  - Group 列表。
  - Account 用户菜单。

Account 菜单在 `components/features/account.tsx`。

已完成：

- 显示当前 nickname。
- 显示账号创建天数。
- Edit profile。
- 修改 nickname。
- 修改密码。
- 退出登录。
- 注销账号。

未完成：

- 头像上传。
- profile 更多字段。
- 更完整的账号设置页。

## 8. Todo 当前实现

Todo 目前是前端本地实现，核心在 `app/main/todo/todo-provider.tsx`。

数据来源：

- `todos` 存在浏览器 `localStorage`。
- `groups` 也存在浏览器 `localStorage`。
- 目前 Todo 数据还没有进入 PostgreSQL。
- 目前 Todo 数据还没有和 User 绑定。

当前 Todo 功能：

- 新建 Todo。
- Todo title。
- Todo group。
- Todo priority。
- priority 包括：
  - low
  - normal
  - high
  - urgent
- 标记完成 / 未完成。
- 编辑 Todo。
- 删除 Todo。
- 清空已完成 Todo。
- 按 All / Active / Completed 筛选。
- 搜索 Todo title。
- 按 group 页面查看。
- 创建 group。
- group 自动去重。
- group 路由：`/main/group/[group]`。

当前 Todo 页面：

- `app/main/all/page.tsx`
  - 所有任务。

- `app/main/group/[group]/page.tsx`
  - 某个分组下的任务。

- `app/main/todo/todo-page.tsx`
  - Todo 主页面组合。

- `app/main/todo/todo-item.tsx`
  - 单条 Todo。

- `app/main/todo/todo-edit-dialog.tsx`
  - 编辑 Todo 弹窗。

- `app/main/todo/new-group-dialog.tsx`
  - 新建分组弹窗。

- `app/main/todo/delete-todo-popover.tsx`
  - 删除确认。

## 9. UI 和交互设计

当前 UI 的方向是偏工作台 / 管理工具风格：

- 左侧导航 + 右侧内容。
- 轻量卡片承载关键操作。
- 表单使用 `Field`、`FieldLabel`、`FieldError`、`FieldDescription`。
- 主要操作有 loading 和 disabled 状态。
- 重要成功 / 删除行为使用 toast。
- 弹窗使用 Dialog / Popover。
- 图标来自 lucide-react。

已经做过的语义化优化：

- 登录、注册错误提示和输入框有关联。
- 修改密码、注销账号、编辑 profile 使用真实 form。
- Todo 新建、编辑、New Group 使用真实 form。
- 部分输入控件已补 `id`、`name`、`required`、`aria-invalid`、`aria-describedby`。

仍需注意：

- `SearchableSelect` 目前只是基础 combobox 形态，还不是完整 ARIA combobox/listbox 实现。
- `Forgot password?` 是占位链接。
- 部分 UI 组件还可以继续统一语义和样式。

## 10. 当前完成度判断

可以认为项目当前处在：

```text
认证闭环已完成，Todo 仍是本地原型，正在准备进入后端化阶段。
```

已完成度：

- 项目框架：完成。
- UI 基础：初步完成。
- 本地 Todo 原型：完成度较高。
- 注册 / 登录：完成。
- session：完成。
- 修改密码：完成。
- 退出登录：完成。
- 注销账号：完成。
- nickname：完成。
- PostgreSQL + Prisma：基础完成。
- Todo 后端：未开始。
- Group 后端：未开始。
- 部署：未开始。
- 测试体系：未开始。

## 11. 当前主要风险

### 11.1 Todo 还没有用户隔离

现在 Todo 存在浏览器 localStorage 中，不属于某个后端 User。

结果是：

- 换浏览器会丢。
- 换设备不会同步。
- 登出后本地 Todo 可能还在。
- 多用户共用同一浏览器时容易混在一起。

作为个人主力项目，下一步最重要的是把 Todo 和 User 绑定到数据库。

### 11.2 AuthGuard 是客户端保护

目前 `AuthGuard` 是 client component，通过请求 `/api/auth/me` 做跳转。

这对当前阶段够用，但未来如果做更严肃的项目，可以考虑：

- middleware 保护私有路由。
- server component 中读取 session。
- API 层继续保持强校验。

最重要的是：后端 API 必须永远校验当前用户，不能只依赖前端跳转。

### 11.3 TodoProvider 未来需要替换

`TodoProvider` 现在管理本地状态和 localStorage。后端化后可能会变成：

- 页面加载时从 API 拉取 Todo。
- 新建 / 修改 / 删除调用 API。
- 成功后更新本地状态。
- localStorage 只保留 UI 偏好，不再保存核心业务数据。

### 11.4 迁移和生成文件要区分

需要保留：

- `prisma/schema.prisma`
- `prisma/migrations/`

可以重新生成：

- `app/generated/prisma/`

不需要提交：

- `.next/`
- `tsconfig.tsbuildinfo`
- `cookies.txt`

## 12. 下一阶段建议路线

### Phase 1：稳定认证和项目清理

目标：让当前认证能力作为稳定底座。

建议任务：

- 检查当前 dirty files，确认哪些是要保留的改动。
- 确认 `app/generated/prisma/` 是否决定提交到 Git。
- 清理临时文件：`cookies.txt`、空的 `temp.md` 等。
- 决定 `components/ui/avatar.tsx` 是否纳入项目。
- 把 README 从 create-next-app 默认内容改成项目说明。

### Phase 2：设计 Todo 后端模型

建议新增模型：

```prisma
model Group {
  id        String   @id @default(uuid())
  name      String
  slug      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  userId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  todos  Todo[]

  @@unique([userId, slug])
}

model Todo {
  id        String   @id @default(uuid())
  title     String
  priority  String
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  userId  String
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  groupId String
  group   Group  @relation(fields: [groupId], references: [id], onDelete: Cascade)
}
```

这只是建议草案，真正写 migration 前需要再确认：

- group 是否允许重名。
- 是否需要 slug。
- Todo 是否需要 due date。
- 是否需要 description。
- 是否需要 order / sortIndex。
- priority 是否继续用字符串，还是用 enum。

### Phase 3：补 Todo API

建议 API：

- `GET /api/todos`
  - 获取当前用户 Todo。

- `POST /api/todos`
  - 新建 Todo。

- `PATCH /api/todos/[todoId]`
  - 修改 title / group / priority / completed。

- `DELETE /api/todos/[todoId]`
  - 删除 Todo。

- `POST /api/todos/clear-completed`
  - 清理当前用户已完成 Todo。

- `GET /api/groups`
  - 获取当前用户 group。

- `POST /api/groups`
  - 创建 group。

- `PATCH /api/groups/[groupId]`
  - 重命名 group。

- `DELETE /api/groups/[groupId]`
  - 删除 group。

每个 API 都必须：

- 调用 `getCurrentUser()`。
- 未登录返回 401。
- 只读写当前用户自己的数据。
- 校验输入。
- 返回清晰错误信息。

### Phase 4：把前端 Todo 从 localStorage 切到 API

建议顺序：

1. 先保留当前 UI。
2. 重写 `TodoProvider` 的数据来源。
3. 首屏请求 `/api/todos` 和 `/api/groups`。
4. 新增 / 编辑 / 删除 / 完成状态都调用 API。
5. 成功后更新本地 React state。
6. 最后移除核心数据的 localStorage 依赖。

这样改动可控，不需要重写页面。

### Phase 5：补个人主力项目体验

建议功能：

- Todo 详情描述。
- 截止日期。
- 今日 / 本周视图。
- 归档。
- 置顶。
- 拖拽排序。
- 快捷键。
- 批量操作。
- 搜索增强。
- group 颜色。
- 任务统计。
- 移动端适配。

### Phase 6：部署和长期维护

建议准备：

- README 项目说明。
- `.env.example`。
- 生产数据库。
- Vercel 部署配置。
- Prisma migrate deploy 流程。
- 基础测试。
- 错误日志。
- 数据备份策略。

## 13. 当前推荐的下一步

最推荐下一步：

```text
先设计 Todo / Group 的 Prisma schema，再做第一版 Todo 后端 API。
```

不要一开始就大改 UI。当前 UI 已经能支撑 Todo 的基本操作，真正缺的是数据持久化和用户隔离。

建议第一个后端化目标：

```text
登录用户可以创建 Todo，刷新页面后 Todo 仍然从数据库加载回来。
```

做到这一点后，这个项目就会从“带登录的本地 Todo”升级成“真正的个人 Todo 系统”。
