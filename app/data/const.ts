// app/data/const.tsx
import type { Tfilter, Tpriority } from './type'

export const filters: Array<{ value: Tfilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]
export const priorityOptions: Array<{ value: Tpriority; label: string; className: string }> = [
  {
    value: 'low',
    label: 'Low',
    className:
      'border-green-500/40 text-green-600 focus:text-green-700 not-data-[variant=destructive]:focus:**:text-green-700 dark:text-green-300 dark:focus:text-green-400 dark:not-data-[variant=destructive]:focus:**:text-green-400',
  },
  {
    value: 'normal',
    label: 'Normal',
    className:
      'border-blue-500/40 text-blue-600 focus:text-blue-700 not-data-[variant=destructive]:focus:**:text-blue-700 dark:text-blue-300 dark:focus:text-blue-400 dark:not-data-[variant=destructive]:focus:**:text-blue-400',
  },
  {
    value: 'high',
    label: 'High',
    className:
      'border-yellow-500/40 text-yellow-600 focus:text-yellow-700 not-data-[variant=destructive]:focus:**:text-yellow-700 dark:text-yellow-300 dark:focus:text-yellow-400 dark:not-data-[variant=destructive]:focus:**:text-yellow-400',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    className:
      'border-red-500/40 text-red-600 focus:text-red-700 not-data-[variant=destructive]:focus:**:text-red-700 dark:text-red-300 dark:focus:text-red-400 dark:not-data-[variant=destructive]:focus:**:text-red-400',
  },
]
export const defaultPriority: Tpriority = 'normal'
export const defaultGroup: string = 'Inbox'
