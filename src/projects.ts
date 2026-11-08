export type ProjectStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export type ProjectRecord = {
  id: number;
  name: string;
  customerName: string;
  status: ProjectStatus;
  budgetCentimes: number;
  paidCentimes: number;
  startDate: string;
  dueDate: string;
  notes: string;
};

export type ProjectInput = Omit<ProjectRecord, 'id'>;

export function validateProject(input: ProjectInput): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push('دخل اسم المشروع.');
  if (!input.customerName.trim()) errors.push('اختار الزبون.');
  if (!Number.isSafeInteger(input.budgetCentimes) || input.budgetCentimes < 0) errors.push('الميزانية غير صحيحة.');
  if (!Number.isSafeInteger(input.paidCentimes) || input.paidCentimes < 0 || input.paidCentimes > input.budgetCentimes) errors.push('المبلغ المؤدى غير صحيح.');
  if (!input.startDate.trim()) errors.push('دخل تاريخ البداية.');
  if (input.dueDate && input.dueDate < input.startDate) errors.push('تاريخ النهاية خاصو يكون من بعد البداية.');
  return errors;
}

export function projectBalance(project: Pick<ProjectRecord, 'budgetCentimes'|'paidCentimes'>): number {
  return project.budgetCentimes - project.paidCentimes;
}

export function summarizeProjects(projects: ProjectRecord[]) {
  return projects.reduce((summary, project) => {
    summary.count++;
    summary.budgetCentimes += project.budgetCentimes;
    summary.paidCentimes += project.paidCentimes;
    summary.balanceCentimes += projectBalance(project);
    if (project.status === 'in_progress') summary.activeCount++;
    return summary;
  }, {count:0,activeCount:0,budgetCentimes:0,paidCentimes:0,balanceCentimes:0});
}
