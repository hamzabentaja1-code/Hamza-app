export type ExpenseInterval = 'weekly' | 'monthly' | 'yearly';

export type RecurringExpense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  interval: ExpenseInterval;
  nextDueDate: string;
  anchorDay?: number;
  active: boolean;
};

export type ExpenseRecord = {
  id: number;
  title: string;
  amount: number;
  date: string;
  category?: string;
  recurringExpenseId?: string;
};

const isoDate = (value: string): Date => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('تاريخ المصروف غير صالح');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('تاريخ المصروف غير صالح');
  }
  return date;
};

const dateString = (date: Date) => date.toISOString().slice(0, 10);

export function validateRecurringExpense(expense: RecurringExpense): string[] {
  const errors: string[] = [];
  if (!expense.id.trim()) errors.push('معرف المصروف المتكرر إجباري');
  if (!expense.title.trim()) errors.push('وصف المصروف إجباري');
  if (!Number.isFinite(expense.amount) || expense.amount <= 0) errors.push('مبلغ المصروف خاصو يكون أكبر من صفر');
  if (!['weekly', 'monthly', 'yearly'].includes(expense.interval)) errors.push('دورية المصروف غير صالحة');
  try { isoDate(expense.nextDueDate); } catch { errors.push('تاريخ المصروف غير صالح'); }
  return errors;
}

function addInterval(value: string, interval: ExpenseInterval, anchorDay: number): string {
  const date = isoDate(value);
  if (interval === 'weekly') date.setUTCDate(date.getUTCDate() + 7);
  if (interval === 'monthly') {
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(anchorDay, lastDay));
  }
  if (interval === 'yearly') {
    const month = date.getUTCMonth();
    date.setUTCDate(1);
    date.setUTCFullYear(date.getUTCFullYear() + 1);
    date.setUTCMonth(month);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), month + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(anchorDay, lastDay));
  }
  return dateString(date);
}

export function generateDueExpenses(
  schedules: RecurringExpense[],
  existingExpenses: ExpenseRecord[],
  throughDate: string,
  idSeed = Date.now(),
): { schedules: RecurringExpense[]; expenses: ExpenseRecord[]; createdCount: number } {
  isoDate(throughDate);
  const newExpenses: ExpenseRecord[] = [];
  let sequence = 0;
  const updatedSchedules = schedules.map(schedule => {
    const errors = validateRecurringExpense(schedule);
    if (errors.length) throw new Error(errors[0]);
    if (!schedule.active) return schedule;
    const anchorDay = schedule.anchorDay ?? isoDate(schedule.nextDueDate).getUTCDate();
    let dueDate = schedule.nextDueDate;
    while (dueDate <= throughDate) {
      const alreadyCreated = existingExpenses.some(item => item.recurringExpenseId === schedule.id && item.date === dueDate)
        || newExpenses.some(item => item.recurringExpenseId === schedule.id && item.date === dueDate);
      if (!alreadyCreated) {
        newExpenses.push({
          id: idSeed + sequence++,
          title: schedule.title,
          amount: schedule.amount,
          date: dueDate,
          category: schedule.category,
          recurringExpenseId: schedule.id,
        });
      }
      dueDate = addInterval(dueDate, schedule.interval, anchorDay);
    }
    return dueDate === schedule.nextDueDate && schedule.anchorDay === anchorDay
      ? schedule
      : { ...schedule, nextDueDate: dueDate, anchorDay };
  });
  return { schedules: updatedSchedules, expenses: [...newExpenses, ...existingExpenses], createdCount: newExpenses.length };
}
