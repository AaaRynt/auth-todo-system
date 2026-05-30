# Auth Todo System

Auth Todo System is a database-backed todo application built with Next.js App Router, React, TypeScript, Prisma, and PostgreSQL. It combines a complete username/password authentication flow with per-user task and group management.

中文文档: [README_zh.md](README_zh.md)

## Features

- User registration, login, session persistence, logout, nickname editing, password change, and account deletion.
- HttpOnly session cookie storage with hashed session tokens in the database.
- Password hashing with Node.js `scrypt` and a basic password policy.
- Per-user Todo and Group data isolation at both API and database relationship levels.
- Todo creation, editing, completion toggle, deletion, filtering, search, priority selection, and completed-task cleanup.
- Group creation, rename, deletion, and automatic move of deleted-group todos into `Inbox`.
- PostgreSQL persistence through Prisma 7 and `@prisma/adapter-pg`.
- Theme toggle, theme presets, toast feedback, cookie notice, and JSON export for current todos.

## Tech Stack

| Area               | Stack                                                          |
| ------------------ | -------------------------------------------------------------- |
| Framework          | Next.js App Router                                             |
| UI                 | React 19, Tailwind CSS v4, local shadcn/Radix-style components |
| Language           | TypeScript                                                     |
| Database           | PostgreSQL                                                     |
| ORM                | Prisma 7 with `@prisma/adapter-pg`                             |
| Package manager    | pnpm                                                           |
| Icons and feedback | lucide-react, Remix Icon, sonner                               |

## Project Structure

```text
app/
  api/                 Route handlers for auth, todos, and groups
  auth/                Login and sign-up page
  main/                Authenticated todo workspace
  generated/prisma/    Generated Prisma client output
components/
  features/            User-facing feature components
  ui/                  Reusable UI primitives
lib/
  auth/                Password, session, and profile helpers
  prisma.ts            Prisma client initialization
  todo-data.ts         Todo and group validation/serialization helpers
prisma/
  migrations/          Database migration history
  schema.prisma        User, Session, Group, and Todo models
types/                 Shared TypeScript types
```

## Data Model

The application stores four main models:

- `User`: account identity, nickname, and password hash.
- `Session`: hashed session token and expiration.
- `Group`: per-user task groups, including the default `Inbox`.
- `Todo`: per-user tasks with title, completion state, priority, and group relation.

Todos are related to groups by both `groupId` and `userId`, which prevents a todo from being associated with another user's group at the database level.

## Getting Started

Install dependencies:

```bash
pnpm install
```

Create a local `.env` file with a PostgreSQL connection string:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/auth_todo_system"
```

Apply migrations during local development:

```bash
pnpm prisma migrate dev
```

Start the development server:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Available Scripts

| Script            | Description                                                  |
| ----------------- | ------------------------------------------------------------ |
| `pnpm dev`        | Start the Next.js development server.                        |
| `pnpm lint`       | Run ESLint.                                                  |
| `pnpm start`      | Start the production server after a production build exists. |
| `pnpm build`      | Run `prisma migrate deploy` and `next build`.                |
| `pnpm prisma ...` | Run Prisma commands through pnpm.                            |

## API Overview

Authentication:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `PATCH /api/auth/password`
- `PATCH /api/auth/account`
- `DELETE /api/auth/account`

Todos and groups:

- `GET /api/todos`
- `POST /api/todos`
- `PATCH /api/todos/[todoId]`
- `DELETE /api/todos/[todoId]`
- `GET /api/groups`
- `POST /api/groups`
- `PATCH /api/groups/[groupId]`
- `DELETE /api/groups/[groupId]`

All todo and group endpoints require an active session and only operate on the current user's data.

## Current Status

The project is a database-backed MVP suitable for local demonstration. Core authentication, account management, todo CRUD, group CRUD, and user data isolation are implemented. Automated tests are not currently included.
