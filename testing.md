# 单元测试

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

## 后续测试范围

当前尚未覆盖 API ownership、session、数据库约束与级联删除、分组删除事务或前端交互。数据库行为需要独立 PostgreSQL 测试数据库的集成测试，不能由这批单元测试证明。
