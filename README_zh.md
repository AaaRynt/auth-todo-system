# Auth Todo System

Auth Todo System 是一个基于数据库持久化的待办事项应用，使用 Next.js App Router、React、TypeScript、Prisma 和 PostgreSQL 构建。项目把账号认证和按用户隔离的 Todo/Group 管理放在同一个完整应用里。

English documentation: [README.md](README.md)

## 功能特性

- 用户注册、登录、保持登录态、退出登录、修改昵称、修改密码和注销账号。
- 使用 HttpOnly cookie 保存登录态，数据库只保存 session token 的 hash。
- 使用 Node.js `scrypt` 进行密码哈希，并实现基础密码强度规则。
- Todo 和 Group 数据按当前登录用户隔离，API 层和数据库关系层都有约束。
- 支持新建、编辑、完成/取消完成、删除、过滤、搜索、优先级和清理已完成 Todo。
- 支持新建、重命名、删除 Group；删除非 `Inbox` 分组时会把任务移动到 `Inbox`。
- 通过 Prisma 7 和 `@prisma/adapter-pg` 接入 PostgreSQL。
- 支持主题切换、主题预设、toast 反馈、必要 cookie 提示和当前 Todo JSON 导出。

## 技术栈

| 分类       | 技术                                                  |
| ---------- | ----------------------------------------------------- |
| 框架       | Next.js App Router                                    |
| UI         | React 19、Tailwind CSS v4、本地 shadcn/Radix 风格组件 |
| 语言       | TypeScript                                            |
| 数据库     | PostgreSQL                                            |
| ORM        | Prisma 7 + `@prisma/adapter-pg`                       |
| 包管理     | pnpm                                                  |
| 图标与反馈 | lucide-react、Remix Icon、sonner                      |

## 项目结构

```text
app/
  api/                 auth、todos、groups 的 Route Handlers
  auth/                登录和注册页面
  main/                登录后的 Todo 工作区
  generated/prisma/    Prisma Client 生成目录
components/
  features/            面向用户的功能组件
  ui/                  可复用 UI 基础组件
lib/
  auth/                密码、session、profile 辅助逻辑
  prisma.ts            Prisma Client 初始化
  todo-data.ts         Todo 和 Group 校验/序列化逻辑
prisma/
  migrations/          数据库 migration 历史
  schema.prisma        User、Session、Group、Todo 模型
types/                 共享 TypeScript 类型
```

## 数据模型

项目主要包含四个模型：

- `User`：账号、昵称和密码 hash。
- `Session`：登录 session 的 token hash 和过期时间。
- `Group`：当前用户的任务分组，包含默认的 `Inbox`。
- `Todo`：当前用户的任务，包含标题、完成状态、优先级和分组关系。

Todo 通过 `groupId` 和 `userId` 同时关联 Group，因此数据库层面也能防止一个 Todo 关联到其他用户的 Group。

## 本地启动

安装依赖：

```bash
pnpm install
```

创建本地 `.env` 文件，并配置 PostgreSQL 连接字符串：

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/auth_todo_system"
```

本地开发时应用数据库迁移：

```bash
pnpm prisma migrate dev
```

启动开发服务器：

```bash
pnpm dev
```

然后打开 `http://localhost:3000`。

## 可用脚本

| 脚本              | 说明                                           |
| ----------------- | ---------------------------------------------- |
| `pnpm dev`        | 启动 Next.js 开发服务器。                      |
| `pnpm lint`       | 运行 ESLint。                                  |
| `pnpm start`      | 在已有生产构建后启动生产服务器。               |
| `pnpm build`      | 执行 `prisma migrate deploy` 和 `next build`。 |
| `pnpm prisma ...` | 通过 pnpm 运行 Prisma 命令。                   |

## API 概览

认证相关：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `PATCH /api/auth/password`
- `PATCH /api/auth/account`
- `DELETE /api/auth/account`

Todo 和 Group：

- `GET /api/todos`
- `POST /api/todos`
- `PATCH /api/todos/[todoId]`
- `DELETE /api/todos/[todoId]`
- `GET /api/groups`
- `POST /api/groups`
- `PATCH /api/groups/[groupId]`
- `DELETE /api/groups/[groupId]`

所有 Todo 和 Group 接口都要求当前用户已登录，并且只操作当前用户自己的数据。

## 当前状态

项目目前是一个 database-backed MVP，适合本地演示。账号认证、账号管理、Todo CRUD、Group CRUD 和多用户数据隔离已经实现。当前尚未建立自动化测试。
