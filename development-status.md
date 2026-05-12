# auth-todo-system 开发现状

扫描日期：2026-05-11  
扫描范围：`app/`、`components/`、`lib/`、`prisma/`、根目录配置与项目脚本

## 1. 项目概览

这是一个基于 Next.js App Router 的本地待办系统，目前主要能力集中在：

- 本地登录态入口
- 受保护的 `/main` 工作区
- 分组驱动的任务侧边栏
- 本地持久化 Todo CRUD
- Todo 分组过滤、状态过滤、标题搜索
- 暗色/亮色主题切换
- 基于 shadcn/radix 风格的 UI 组件体系

当前项目仍偏前端本地应用形态，虽然已经引入 Prisma/Postgres 配置，但业务逻辑尚未接入数据库。

## 2. 技术栈

- 框架：Next.js `16.2.4`
- 运行时：React `19.2.4`
- 样式：Tailwind CSS `4.2.4`
- UI 基础：Radix UI、shadcn 风格组件、class-variance-authority
- 图标：lucide-react、Remix Icon
- 通知：sonner
- 主题：next-themes
- ORM 配置：Prisma `7.8.0`
- 包管理：pnpm workspace

## 3. 当前目录结构重点

```text
app/
  auth/                  登录/注册页面
  data/                  类型与常量
  main/                  主工作区路由
    all/                 全部任务页
    group/[group]/       分组任务页
    todo/                Todo 可复用页面与状态模块
components/
  features/              业务功能组件
  ui/                    通用 UI 组件
lib/
  normalize-todo.ts      Todo 数据兼容处理
  play-trash-sound.ts    删除音效
  utils.ts               工具函数
prisma/
  schema.prisma          Prisma 配置
```

根目录存在 `.DS_Store` 相关文件进入源码树的情况：`app/.DS_Store`、`app/main/.DS_Store`、`components/.DS_Store`。

## 4. 路由现状

| 路由                  | 状态   | 说明                                                 |
| --------------------- | ------ | ---------------------------------------------------- |
| `/`                   | 已实现 | 根据 `localStorage.user` 重定向到 `/main` 或 `/auth` |
| `/auth`               | 已实现 | 登录/注册 UI，登录会写入本地用户                     |
| `/main`               | 已实现 | 重定向到 `/main/all`                                 |
| `/main/all`           | 已实现 | 显示全部 Todo                                        |
| `/main/group/[group]` | 已实现 | 按分组显示 Todo                                      |
| `/main/todo`          | 已实现 | 兼容旧入口，重定向到 `/main/all`                     |
| `/main/account`       | 占位   | 页面仍是简单文案，占位状态                           |

之前的静态侧边栏项 `Todo / Chart / Setting / Account` 已不再作为主导航展示。

## 5. 认证与用户状态

当前认证是纯本地实现：

- `app/auth/page.tsx` 登录时写入 `localStorage.user`
- `components/auth-guard.tsx` 使用 `localStorage.user` 保护非公开路由
- `app/main/layout.tsx` 读取用户并显示欢迎 toast
- `components/features/account.tsx` 在侧边栏底部显示用户名称与账号创建天数

用户类型位于 `app/data/type.ts`：

```ts
export type TlocalUser = {
  id: string
  username: string
  password: string
  createdAt: number
} | null
```

现状风险：

- 密码明文存储在 `localStorage`
- 登录并不校验已有用户，只要输入用户名和密码就会覆盖本地用户
- 注册表单目前主要是 UI，缺少真正的提交保存逻辑
- Account 弹层里的编辑表单还没有保存逻辑
- 退出登录按钮已经展示，但还没有实际清除用户和跳转逻辑

## 6. Todo 数据与状态

Todo 类型位于 `app/data/type.ts`：

```ts
export type Ttodo = {
  id: string
  title: string
  group: string
  priority: Tpriority
  completed: boolean
  createdAt: number
}
```

状态核心在 `app/main/todo/todo-provider.tsx`：

- `todos` 存储在 `localStorage.todos`
- 空分组存储在 `localStorage.todo-groups`
- 启动时用 `normalizeTodo` 兼容旧数据
- 提供新增、更新、切换完成、删除、清空已完成等操作
- 搜索关键词也在 provider 中管理，但不持久化

Todo 页面复用结构：

- `/main/all` 渲染 `TodoPage`
- `/main/group/[group]` 渲染同一个 `TodoPage`，传入 `groupName`
- Todo CRUD 逻辑没有为分组页复制一份

## 7. 分组能力

当前分组能力：

- 侧边栏动态显示所有分组
- 默认分组为 `Inbox`
- 新建空分组后自动跳转到 `/main/group/[group]`
- Todo 新增和编辑时可以选择或创建分组
- 分组页面自动过滤对应分组的 Todo
- All 页面保留分组标题展示，单分组页面隐藏分组标题

待完善点：

- `GroupEdit` 中 Rename / Delete 目前还不是完整功能
- 删除分组目前没有处理该分组下 Todo 的迁移或删除策略
- 分组名称没有统一的 URL 展示别名策略，当前直接使用 `encodeURIComponent`

## 8. 搜索与过滤

当前搜索符合轻量设计：

- 搜索入口位于 `/main` 侧边栏
- 只按 Todo 标题搜索
- 纯客户端过滤
- 没有引入模糊搜索库
- 不涉及后端搜索

状态过滤：

- `All`
- `Active`
- `Completed`

清空已完成：

- All 页面清空全部已完成 Todo
- 分组页面只清空当前分组已完成 Todo

## 9. UI 与布局

当前主布局：

- Header 固定在顶部
- Main 区域通过 `mt-14` 避开 Header
- Aside 固定为 `100dvh - 3.5rem`
- 分组列表内部滚动，侧边栏整体保持完整显示
- 底部 Account 组件以 Popover 形式展示账号操作入口

UI 组件来源：

- `components/ui/` 存放通用组件
- `components/features/` 存放业务组件
- `components/features/index.ts` 使用 Barrel File 聚合导出

需要注意：

- `GroupEdit` 放在 `Link` 内部，内部还有 Popover/Button，后续实现编辑行为时要小心嵌套交互导致导航误触发
- Account Popover 内的 destructive 按钮还没有业务逻辑

## 10. 数据库与后端状态

Prisma 文件存在于 `prisma/schema.prisma`，当前内容只有 generator 和 datasource：

- 已声明 PostgreSQL datasource
- 已声明 Prisma client 输出目录
- 没有 model
- Todo、User、Group 业务都没有接入数据库
- 当前 persistence 仍完全依赖浏览器本地存储

这符合当前轻量本地应用状态，但如果后续要做真实账号或跨设备同步，需要重新设计认证和数据层。

## 11. 静态检查结果

本次扫描执行了：

```text
pnpm lint
```

结果：通过。

未执行生产打包流程。

## 12. 当前主要风险

1. 认证安全性不足  
   用户和密码都存储在浏览器本地，适合 demo，不适合真实账号系统。

2. 注册流程未完成  
   Sign up 表单有校验 UI，但没有真正写入用户。

3. Account 操作未完成  
   编辑账号和退出登录都已出现入口，但缺少实际行为。

4. 分组编辑未完成  
   Rename / Delete 只是界面占位，删除按钮目前只播放音效并关闭 Popover。

5. 数据来源分散  
   `user`、`todos`、`todo-groups` 都直接依赖 localStorage，后续扩展时需要统一迁移策略。

6. `.DS_Store` 文件存在  
   建议加入 `.gitignore` 并清理已进入项目目录的 `.DS_Store`。

## 13. 建议下一步

优先级从高到低：

1. 完成 Account 退出登录  
   清除 `localStorage.user`，清理 session 欢迎标记，并跳转到 `/auth`。

2. 完成注册流程  
   Sign up 成功后写入本地用户，并与 Login 的用户结构保持一致。

3. 完成分组 Rename / Delete  
   Rename 需要同步更新所有 Todo 的 group；Delete 需要明确是删除分组、迁移到 Inbox，还是连同 Todo 一起删除。

4. 抽出 localStorage 读写工具  
   减少页面和组件直接操作 storage，方便后续迁移到服务端或数据库。

5. 增强类型和数据兼容  
   为 `TlocalUser` 增加 normalize 函数，避免旧数据缺字段造成 UI 异常。

6. 清理无效文件  
   移除 `.DS_Store`，并确认旧的 Chart / Setting 路由是否需要保留或彻底删除。

## 14. 总结

当前项目已经从静态 Todo 页面演进为以分组为核心的本地生产力界面。Todo CRUD、分组路由、标题搜索、状态过滤和本地持久化已经连通，整体架构仍保持轻量。

下一阶段最值得补齐的是账号动作、注册动作和分组编辑动作。这三块目前已经有 UI 入口，但业务行为还不完整。
