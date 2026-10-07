# 单元测试与 API 行为测试

使用已有的 Vitest 依赖，在 Node 环境中运行。没有新增依赖或修改已有依赖版本。

```bash
pnpm test
pnpm test:watch
```

`pnpm test` 执行一次并退出；`pnpm test:watch` 在文件变化时重新执行测试。两者都不运行 Next.js build。

## 当前覆盖范围

| 测试文件                     | 覆盖行为                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `lib/auth/password.test.ts`  | 密码策略、真实 scrypt hash 与验证、随机 salt、密码空格保留、缺失 salt/key 的 hash     |
| `lib/auth/profile.test.ts`   | 昵称规范化、非字符串输入、空昵称、24/25 字符边界                                      |
| `lib/todo-data.test.ts`      | 标题和分组名规范化及长度边界、Inbox 大小写归一化、priority 校验、Todo/Group 序列化    |
| `lib/normalize-todo.test.ts` | 缺失字段默认值、完整数据保留、输入不被修改、false 和时间戳 0、分组空格、priority 回退 |

`todo-data` 的单元测试 mock 了 `@/lib/prisma`，任何数据库访问都会抛错，因此不需要 `DATABASE_URL` 或运行中的 PostgreSQL，也不会读写开发数据库。

密码测试使用真实的 Node crypto；默认字段测试固定时间和随机 UUID，并在测试后恢复。这些测试验证业务规则和数据转换，不依赖 UI 快照。

## API 行为测试

第二批测试直接调用真实 Route Handler，使用真实 `Request`、`NextResponse`、密码校验和数据转换逻辑。Prisma 与 session 模块通过 mock 隔离，每个测试重置 mock，不需要启动 Next.js 或连接数据库。

| 测试文件                                 | 覆盖行为                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| `app/api/todos/route.test.ts`            | 未登录、按用户查询、空列表、输入校验、拒绝外部 groupId、默认 Inbox、创建任务和新分组 |
| `app/api/todos/[todoId]/route.test.ts`   | ownership、非法更新、完成状态切换、修改任务、移动分组、限定用户删除                  |
| `app/api/groups/route.test.ts`           | 按用户查询、默认 Inbox、名称校验、大小写不敏感重名检查、创建分组                     |
| `app/api/groups/[groupId]/route.test.ts` | ownership、Inbox 保护、改名校验与冲突、事务内移动任务再删除、移动失败时停止删除      |
| `app/api/auth/register/route.test.ts`    | 注册校验、重复用户名、真实密码 hash、默认昵称、创建用户后创建 session                |
| `app/api/auth/login/route.test.ts`       | 输入校验、错误密码与用户不存在、正确登录、不返回密码 hash、session 创建失败          |
| `app/api/auth/password/route.test.ts`    | 登录保护、新密码策略、拒绝相同密码、验证旧密码、只修改当前用户的 hash                |
| `app/api/auth/account/route.test.ts`     | 昵称校验、只修改当前用户、注销前验证密码、注销成功后清理 session                     |
| `app/api/auth/me/route.test.ts`          | 未登录响应、当前用户响应                                                             |
| `app/api/auth/logout/route.test.ts`      | 调用 session 清理、清理失败不返回成功                                                |

`tests/api-test-helpers.ts` 提供测试数据、请求构造与 mock。ownership 测试检查实际查询和删除参数中的 `userId`，并检查拒绝请求没有后续写入；它们验证 API 使用的隔离条件，不证明真实数据库中的多用户隔离。

分组删除测试验证事务 callback 中的操作与顺序，无法证明 PostgreSQL 事务回滚；注销账号测试也无法证明数据库级联清理。异常传播测试直接检查 handler 抛错，不验证 Next.js 的最终 HTTP 500 响应。

可只运行第二批：

```bash
pnpm test app/api
```

## 后续测试范围

后续仍需补充 session token/cookie/过期行为、真实数据库多用户隔离、约束与级联删除、分组删除事务回滚，以及前端交互。数据库行为需要独立 PostgreSQL 测试数据库的集成测试。

分组删除的实际移动数量、大小写不敏感的数据库唯一约束、改密后撤销其他 session 仍属于待修正的业务边界，本批测试没有将这些现有缺陷固定为预期行为。
