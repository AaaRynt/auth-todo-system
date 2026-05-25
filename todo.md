**已完成**

Todo 与 Group 已切换为 PostgreSQL 后端数据流，旧的 `/api/main` 已移除。

新增 API：

- [app/api/todos/route.ts](/Users/rynt/Desktop/Code/auth-todo-system/app/api/todos/route.ts)：`GET /api/todos`、`POST /api/todos`
- [app/api/todos/[todoId]/route.ts](/Users/rynt/Desktop/Code/auth-todo-system/app/api/todos/[todoId]/route.ts)：`PATCH`、`DELETE`
- [app/api/groups/route.ts](/Users/rynt/Desktop/Code/auth-todo-system/app/api/groups/route.ts)：`GET /api/groups`、`POST /api/groups`
- [app/api/groups/[groupId]/route.ts](/Users/rynt/Desktop/Code/auth-todo-system/app/api/groups/[groupId]/route.ts)：`PATCH`、`DELETE`
- [lib/todo-data.ts](/Users/rynt/Desktop/Code/auth-todo-system/lib/todo-data.ts)：统一 Todo/Group 校验、序列化与 `Inbox` 处理

所有 API 都使用当前 session 的 `userId`：

- 查询只读取当前用户数据
- 创建自动写入当前用户
- 更新、删除先验证 ownership
- 非法或其他用户的 `groupId` 不可用于 Todo

**前端接入**

- [todo-provider.tsx](/Users/rynt/Desktop/Code/auth-todo-system/app/main/todo/todo-provider.tsx)：不再用 `localStorage` 保存 todos/groups；初始化从 API 加载；新增、修改、勾选、删除、清空、Group CRUD 全部调用后端
- [layout.tsx](/Users/rynt/Desktop/Code/auth-todo-system/app/main/layout.tsx)：sidebar 使用真实 Group 数据，接入加载/错误状态和分组管理
- [group-edit.tsx](/Users/rynt/Desktop/Code/auth-todo-system/components/features/group-edit.tsx)：完成 rename 与删除确认 Dialog
- [new-group-dialog.tsx](/Users/rynt/Desktop/Code/auth-todo-system/app/main/todo/new-group-dialog.tsx)：创建数据库 Group
- [todo-page.tsx](/Users/rynt/Desktop/Code/auth-todo-system/app/main/todo/todo-page.tsx)、[todo-edit-dialog.tsx](/Users/rynt/Desktop/Code/auth-todo-system/app/main/todo/todo-edit-dialog.tsx)、[todo-item.tsx](/Users/rynt/Desktop/Code/auth-todo-system/app/main/todo/todo-item.tsx)、[delete-todo-popover.tsx](/Users/rynt/Desktop/Code/auth-todo-system/app/main/todo/delete-todo-popover.tsx)：异步 CRUD、loading/error 状态和真实删除提示

**Group 删除策略**

采用“移动到 `Inbox`”而不是级联删除任务：

- `Inbox` 不允许改名或删除
- 删除其他 Group 前会弹出确认 Dialog
- 删除后，该组 Todo 自动移动到当前用户的 `Inbox`
- 这样不会因为误删分组导致任务丢失

**验证结果**

已通过：

```bash
pnpm exec prettier --check ...
pnpm lint
pnpm exec next typegen
pnpm exec tsc --noEmit --incremental false
pnpm prisma validate
pnpm prisma generate
git diff --check
```

**你现在需要验证**

你当前运行中的 Next dev server 缓存了旧 Prisma Client，日志中已有：

```text
Cannot read properties of undefined (reading 'findMany')
Cannot read properties of undefined (reading 'upsert')
```

先在原来运行服务的终端重启：

```bash
# Ctrl+C 停止当前 pnpm dev
pnpm dev
```

然后在浏览器验证：

1. 登录后进入 `/main/all`，新增 Todo，刷新页面后数据仍存在。
2. 修改 Todo 标题、priority、group，并切换完成状态。
3. 删除 Todo，确认 Prisma Studio 中记录消失。
4. 新建 Group，在 sidebar 显示。
5. 重命名 Group，确认 sidebar、页面 URL 和 Todo 分组同步更新。
6. 删除含有 Todo 的 Group，确认任务被移动到 `Inbox`。

数据库查看：

```bash
pnpm prisma studio
```

当前代码已具备完整 Todo/Group 数据库闭环；重启 dev server 后即可进行实际展示验证。
