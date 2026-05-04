# Auth Task System 规范需求文档

## 1. 项目概述

构建一个基于 Next.js 的全栈任务管理系统，支持用户认证、任务管理以及数据隔离。项目目标是形成完整的前后端闭环，用于展示工程能力。

---

## 2. 技术栈

- Framework: Next.js (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- UI: shadcn/ui
- State: React useState
- Backend: Next.js API Routes
- Database: PostgreSQL（后期）+ Prisma
- Auth: 简化 JWT（后期实现）
- Deploy: Vercel

---

## 3. 功能需求

### 3.1 用户系统

- 用户注册
- 用户登录
- 用户登出
- 本地存储用户标识（初期使用 localStorage）

### 3.2 任务管理

- 创建任务
- 删除任务
- 修改任务状态（完成 / 未完成）
- 获取任务列表

### 3.3 数据隔离

- 每个用户只能访问自己的任务
- 所有任务数据必须绑定 userId

---

## 4. 页面结构

### /login

- 输入用户名
- 登录按钮

### /tasks

- 任务输入框
- 任务列表
- 勾选状态
- 删除按钮

---

## 5. API 设计

### 5.1 Auth

- POST /api/auth/login
- POST /api/auth/register

### 5.2 Tasks

- GET /api/tasks
- POST /api/tasks
- PATCH /api/tasks/:id
- DELETE /api/tasks/:id

---

## 6. 数据结构

```ts
export type Task = {
  id: number;
  title: string;
  done: boolean;
  userId: string;
};
```

---

## 7. 前端规范

- 使用函数组件
- 使用 useState 管理状态
- 禁止引入 Zustand（当前阶段）
- 所有 API 请求统一封装
- 组件拆分清晰：TaskList / TaskItem / TaskInput

---

## 8. 后端规范

- 所有 API 使用 REST 风格
- 所有请求返回 JSON
- 使用 try/catch 处理错误
- 不允许直接修改全局数据（必须返回新对象）

---

## 9. 开发阶段

### 阶段 1（前端）

- 完成 UI
- 使用假数据

### 阶段 2（API）

- 接入 tasks API

### 阶段 3（登录）

- 实现登录接口
- 前端保存 userId

### 阶段 4（数据隔离）

- tasks 按 userId 过滤

### 阶段 5（优化）

- loading 状态
- error 处理

### 阶段 6（部署）

- 部署到 Vercel

---

## 10. 约束

- 不使用复杂认证库
- 不提前引入数据库（前三阶段）
- 不做 UI 复杂优化
- 不引入多状态管理方案

---

## 11. 交付标准

- 用户可注册登录
- 可创建任务
- 可查看自己的任务
- 页面刷新数据不丢失（后期）
- 项目可在线访问

---

## 12. 扩展方向（可选）

- Prisma + PostgreSQL
- JWT 完整认证
- 全局状态（Zustand）
- UI 优化

---

## 13. 项目目标

实现一个可运行、可部署、具备真实业务流程的全栈应用，用于展示工程能力与系统设计能力。
