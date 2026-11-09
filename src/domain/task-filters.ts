export type TaskListStatus = 'all' | 'open' | 'done' | 'overdue';
export type TaskListPriority = 'all' | 'low' | 'medium' | 'high';

export type TaskFilterItem = {
  id: number;
  title: string;
  assignee?: string;
  projectId?: number;
  projectName?: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'doing' | 'done';
};

export type WorkTaskFilters = {
  query: string;
  status: TaskListStatus;
  priority: TaskListPriority;
  projectId: number | 'all' | 'unassigned';
};

const validDay = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value;
};

/** A non-mutating filter. Only dated, unfinished tasks can be overdue. */
export function filterWorkTasks<T extends TaskFilterItem>(
  tasks: T[],
  filters: WorkTaskFilters,
  today: string,
): T[] {
  if (!validDay(today)) throw new Error('Invalid current date');
  const query = filters.query.trim().toLocaleLowerCase();
  return tasks.filter(task => {
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
    if (filters.projectId === 'unassigned' && task.projectId !== undefined) return false;
    if (typeof filters.projectId === 'number' && task.projectId !== filters.projectId) return false;
    if (query && ![task.title,task.assignee||'',task.projectName||''].some(value => value.toLocaleLowerCase().includes(query))) return false;
    if (filters.status === 'done' && task.status !== 'done') return false;
    if (filters.status === 'open' && task.status === 'done') return false;
    if (filters.status === 'overdue' && !(task.status !== 'done' && validDay(task.dueDate) && task.dueDate < today)) return false;
    return true;
  });
}
