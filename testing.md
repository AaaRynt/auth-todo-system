# 自动化测试

使用 Vitest 运行测试。纯函数、API 和 Session 测试使用 Node 环境；第五批前端测试使用 jsdom。已有依赖版本保持不变，前四批没有新增依赖，第五批仅新增以下固定版本的开发依赖：

| 开发依赖                      | 版本     | 用途                       |
| ----------------------------- | -------- | -------------------------- |
| `@testing-library/react`      | `16.3.3` | 渲染真实 React 组件与 Hook |
| `@testing-library/user-event` | `14.6.7` | 模拟输入、点击和键盘交互   |
| `@testing-library/jest-dom`   | `7.0.1`  | DOM、表单值与按钮状态断言  |
| `jsdom`                       | `30.1.2` | 提供浏览器 DOM 环境        |

本次使用 Node `24.19.0` 验证。jsdom `30.1.2` 需要 Node `^22.22.2 || ^24.15.0 || >=26.0.0`。

```bash
pnpm test
pnpm test:watch
pnpm test:ui
pnpm test:integration
```

`pnpm test` 执行不依赖数据库的测试并退出；`pnpm test:watch` 监听文件变化；`pnpm test:ui` 只运行前端 `.test.tsx` 文件；`pnpm test:integration` 单独运行真实 PostgreSQL 测试。这些命令都不运行 Next.js build。

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

## Session 测试

第三批 `lib/auth/session.test.ts` 直接测试真实 session 模块，只 mock Prisma 和 `next/headers` 的 cookie store。SHA-256 和随机 token 使用真实 Node crypto；时间固定，每个用例后恢复时间与环境变量，不需要数据库或 Next.js 请求上下文。

23 个用例覆盖：

- 创建 session：32 字节随机 token、数据库仅保存 hash、30 天有效期、先持久化再设置 cookie、持久化失败不发 cookie。
- Cookie 属性：`HttpOnly`、`SameSite=Lax`、根路径、生产环境 `Secure`；清除 cookie 时 `maxAge=0`。
- 当前用户：没有或空 cookie、session 不存在、查询使用 token hash、仅返回公开字段。
- 过期边界：到期前 1 毫秒仍有效，恰好到期及已过期均失效，删除过期 session 并清除 cookie。
- 退出登录：仅删除当前 token 对应的 session，没有 token 或记录已被删除时仍能清 cookie，重复退出不报错。
- 异常：session 查询失败不返回用户，cookie 写入失败向调用方抛错。

可只运行第三批：

```bash
pnpm test lib/auth/session.test.ts
```

这些测试验证 session 模块使用的数据库参数与 cookie 属性，不验证浏览器实际接收 `Set-Cookie`、Next.js 请求上下文或真实数据库的持久化和并发行为。

## PostgreSQL 集成测试

第四批使用真实 Prisma、session、密码校验和 Route Handler，仅模拟 `next/headers` 的 cookie store，不模拟数据库或事务。21 个用例覆盖：

| 测试文件                                         | 覆盖行为                                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `tests/integration/ownership.test.ts`            | A/B 用户列表隔离、越权修改与删除失败后数据保持、拒绝跨用户 groupId、真实 Todo 创建和更新删除 |
| `tests/integration/group-deletion.test.ts`       | 删除分组将任务移到该用户 Inbox、缺失 Inbox 时创建、删除失败时回滚任务移动及 Inbox 创建       |
| `tests/integration/account-deletion.test.ts`     | 注销账号级联删除全部 session/group/todo、保留其他用户数据、错误密码不删除数据                |
| `tests/integration/database-constraints.test.ts` | 绕过 API 时复合外键仍拒绝跨用户分组关联、同用户重名分组被数据库拒绝、不同用户可有同名分组    |

运行前需要 PostgreSQL 的 `initdb` 和 `postgres` 在 PATH 中。也可通过 `POSTGRES_BIN` 指定它们所在目录，例如本机 Postgres.app：

```bash
POSTGRES_BIN=/Applications/Postgres.app/Contents/Versions/latest/bin pnpm test:integration
```

无需启动既有 PostgreSQL 服务或提供数据库连接串。`tests/run-integration-tests.mjs` 在系统临时目录建立独立 PostgreSQL 实例，使用随机本机端口和临时数据库名，运行现有三个 migration，再执行集成测试；结束后关闭实例并删除临时目录。运行正常结束或测试失败均执行清理。

runner 为子进程设置独立 `DATABASE_URL`/`TEST_DATABASE_URL`，不会使用开发库连接。集成测试 setup 先验证临时连接串再导入 Prisma，没有 `TEST_DATABASE_URL` 时直接失败。普通 `pnpm test` 排除集成测试目录，仍然不需要数据库。

`tests/test-database-url.test.ts` 的 13 个普通单元用例验证数据库连接串保护，包括拒绝开发库名、远程地址及改变连接目的地的 query 参数。

事务回滚用例安装临时 PostgreSQL trigger，让任务移动后的分组 DELETE 真实失败，再查询原任务和分组，检查新 Inbox 也被回滚。测试串行执行，trigger 在用例结束时移除；fixture 按测试用户 id 清理，整个实例最后被销毁。

可只运行一类集成测试：

```bash
pnpm test:integration tests/integration/group-deletion.test.ts
```

这些测试不启动 Next.js HTTP 服务或浏览器，因此不验证实际 `Set-Cookie`、页面交互与 HTTP 层行为；并发时序也不在本批范围内。

## 前端交互测试

第五批增加 7 个前端测试文件、77 个用例，真实渲染组件、Hook 和 Radix 控件，使用 user-event 操作表单与按钮。请求通过 mock fetch 隔离，Next.js navigation、toast 与删除音效通过 mock 观察，不启动 Next.js 或连接数据库。

| 测试文件                                     | 用例数 | 覆盖行为                                                                                                                |
| -------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| `app/main/todo/todo-provider.test.tsx`       | 25     | 加载/错误/空数据、reload 恢复、Todo/Group CRUD 与计数同步、失败保持状态、按分组清理完成项、部分删除失败后重载           |
| `app/main/todo/todo-page.test.tsx`           | 9      | 加载与 Retry、All/Active/Completed 筛选、搜索、分组范围及进度、空状态、新建防重复提交与失败恢复、完成状态切换           |
| `app/main/todo/delete-todo-popover.test.tsx` | 3      | 取消不删除、等待删除时禁用按钮、成功关闭并播放音效、失败保留弹窗并重试                                                  |
| `app/auth/auth-forms.test.tsx`               | 17     | 登录注册校验、密码确认及条款、显示/隐藏密码、防重复提交、用户名去空格但密码保留、成功跳转、网络/HTTP/无效 JSON 失败反馈 |
| `components/auth-guard.test.tsx`             | 7      | 公共路由跳过认证、私有内容在认证前隐藏、未授权/网络失败跳转、路由切换后忽略过期请求结果                                 |
| `components/features/account.test.tsx`       | 12     | 昵称修改、改密、注销和退出的成功/失败反馈、请求等待状态、成功后清理密码与欢迎标记                                       |
| `components/features/cookie-notice.test.tsx` | 4      | 首次展示、接受后隐藏及保存、下次访问不显示、浏览器存储不可用时仍可展示与关闭                                            |

每个前端测试通过文件内 `@vitest-environment jsdom` 指令选择 DOM 环境，普通 Node 测试仍使用原环境。`tests/frontend/setup.ts` 提供 DOM 断言、组件卸载、存储清理、fetch 隔离与不测量布局的 ResizeObserver 替身；`tests/frontend/test-helpers.ts` 提供固定数据和可手动完成的 Promise，以检查请求等待状态。

可只运行前端测试，或单个前端文件：

```bash
pnpm test:ui
pnpm test app/main/todo/todo-page.test.tsx
```

第六批补充 5 个文件、40 个关键交互与组件连接用例：

| 测试文件                                  | 用例数 | 覆盖行为                                                                                                                             |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `app/main/todo/todo-edit-dialog.test.tsx` | 7      | 已完成任务不可编辑、空标题校验、取消草稿、重新打开读取最新 props、修改分组与优先级、保存等待及防重复、失败保留草稿并重试             |
| `app/main/todo/new-group-dialog.test.tsx` | 5      | 空名称、取消草稿、大小写不敏感同名直接跳转、特殊字符 URL 编码、使用服务端名称、等待禁用与失败恢复                                    |
| `components/features/group-edit.test.tsx` | 11     | 改名校验和草稿重置、当前/非当前分组改名与删除的跳转、删除数量提示、等待禁用、失败反馈及重试                                          |
| `app/main/layout.test.tsx`                | 11     | 真实侧栏搜索连接任务列表、当前分组高亮和 URL 编码、All Tasks 导航、Inbox 隐藏管理入口、无效路由、实际改名/删除请求与跳转、Retry 重载 |
| `components/features/export.test.tsx`     | 6      | 加载/错误时禁止导出、完整 JSON 和 Unix 秒时间戳、空数据、下载文件名、下载失败反馈与重试、成功和失败都清理临时 URL                    |

本批测试复现并修正两处实际问题：侧栏解析 `/main/group/<name>` 时误保留开头 `/`，造成高亮及当前分组改名/删除跳转失效；导出开始下载失败时未释放已创建的 object URL，现通过 `finally` 清理。没有新增依赖或修改依赖版本。

当前普通测试共 28 个文件、378 个用例，其中前端测试 12 个文件、117 个用例；独立 PostgreSQL 集成测试 4 个文件、21 个用例；合计 399 个用例。

这些测试验证 DOM 行为和发出的请求，不验证实际 HTTP 服务、浏览器 cookie、页面布局或音效播放。第五批搜索测试通过小型测试控件写入 TodoProvider，第六批另以真实 MainLayout 和 TodoPage 验证侧栏搜索连接；主布局测试仅替换无关的主题选择器，不模拟侧栏、任务列表或 TodoProvider。任务编辑的优先级下拉框使用真实 Radix Select，通过键盘选项操作；仅替换 jsdom 缺失的滚动方法并在测试后恢复。导出测试读取真实 Blob 的 JSON 内容，模拟下载入口与 object URL，不证明浏览器实际保存文件。数据库持久化由第四批集成测试负责。

## 后续测试范围

后续优先补充浏览器完整流程与并发边界测试。

分组删除的实际移动数量、大小写不敏感的数据库唯一约束、改密后撤销其他 session 仍属于待修正的业务边界，本批测试没有将这些现有缺陷固定为预期行为。
