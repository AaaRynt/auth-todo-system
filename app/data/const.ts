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
    className: 'border-green-500/40 text-green-700 dark:text-green-300',
  },
  { value: 'normal', label: 'Normal', className: 'border-blue-500/40  text-blue-700 dark:text-blue-300 ' },
  { value: 'high', label: 'High', className: 'border-yellow-500/40 text-yellow-700 dark:text-yellow-300' },
  { value: 'urgent', label: 'Urgent', className: 'border-red-500/40  text-red-700 dark:text-red-300' },
]
export const defaultPriority: Tpriority = 'normal'
export const defaultGroup: string = 'Inbox'
