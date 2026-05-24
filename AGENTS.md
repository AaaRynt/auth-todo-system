- Do not run any build commands
- Do not modify existing dependency versions in `package.json`
- Do not add new dependencies unless the reason is explicitly explained
- Do not automatically upgrade framework versions

- Use lowercase kebab-case for all files and folders

- API modules should use the `xxxApi` naming convention

- Type definitions must start with `I` or `T`
- Prefer `type` over `interface`
- Only use `interface` when declaration merging is required

- Components must use PascalCase naming

- Subfolders inside `/api` must mirror the structure of `/app`

- Agent/user-facing feature components should be placed under `/components/features/`

- Components must be re-exported through `index.ts` Barrel Files

- Do not use deep relative imports
- Always use the `@/` alias for cross-directory imports

- Every .js/.ts/.tsx file must start with an absolute project path comment. Example: `// app/main/layout.tsx`

- Prefer local state over global state
- Do not introduce global state unless necessary
- Prefer Tailwind CSS v4 over plain CSS whenever possible

- All async requests must handle:
  - loading state
  - error state
  - empty state
