import 'server-only';

import { prisma } from '@/lib/client';
import { tryCatch } from '@/lib/helper';
import {
  CreateExpense,
  createExpenseSchema,
  deleteExpenseSchema,
  deleteManyExpensesSchema,
  getExpensesListSchema,
  getOneExpenseSchema,
  UpdateExpense,
  updateExpenseSchema,
} from '../schema/expense';

export async function getOneExpense(id: number) {
  return tryCatch(async () => {
    const data = getOneExpenseSchema.parse({ id });
    const expense = await prisma.expenses
      .findUnique({
        where: { id: data.id, deleted_at: null },
      })
      .catch((err) => {
        throw new Error(err);
      });
    return expense;
  });
}

export async function getExpensesList(trashed: boolean = false) {
  return tryCatch(async () => {
    const data = getExpensesListSchema.parse({ trashed });
    const expenses = await prisma.expenses
      .findMany({
        where: { deleted_at: data.trashed ? { not: null } : null },
        orderBy: { created_at: 'desc' },
      })
      .catch((err) => {
        throw new Error(err);
      });
    return expenses;
  });
}

export async function createExpense(dataExpense: CreateExpense) {
  return tryCatch(async () => {
    const data = createExpenseSchema.parse(dataExpense);
    const expense = await prisma.expenses.create({ data });
    return { expense };
  });
}

export async function updateExpense(id: number, dataExpense: UpdateExpense) {
  return tryCatch(async () => {
    const data = updateExpenseSchema.parse(dataExpense);
    const expenseId = getOneExpenseSchema.parse({ id });
    const expense = await prisma.expenses
      .update({
        where: { id: expenseId.id },
        data,
      })
      .catch((err) => {
        throw new Error(err);
      });

    return { expense };
  });
}

export async function deleteExpense(id: number) {
  return tryCatch(async () => {
    const data = deleteExpenseSchema.parse({ id });
    const expense = await prisma.expenses.update({
      where: { id: data.id, deleted_at: null },
      data: { deleted_at: new Date() },
    });
    return { expense };
  });
}

export async function deleteManyExpenses(ids: number[]) {
  return tryCatch(async () => {
    const data = deleteManyExpensesSchema.parse({ ids });
    const expenses = await prisma.expenses
      .updateMany({
        where: { id: { in: data.ids } },
        data: { deleted_at: new Date() },
      })
      .catch((err) => {
        throw new Error(err);
      });
    return { expenses };
  });
}

export async function forceDeleteExpense(id: number) {
  return tryCatch(async () => {
    const data = deleteExpenseSchema.parse({ id });
    const expense = await prisma.expenses
      .delete({ where: { id: data.id, deleted_at: { not: null } } })
      .catch((err) => {
        throw new Error(err);
      });
    return expense;
  });
}

export async function forceDeleteManyExpenses(ids: number[]) {
  return tryCatch(async () => {
    const data = deleteManyExpensesSchema.parse({ ids });
    const expenses = await prisma.expenses
      .deleteMany({
        where: {
          id: { in: data.ids },
          deleted_at: { not: null },
        },
      })
      .catch((err) => {
        throw new Error(err);
      });
    return expenses;
  });
}

export async function restoreExpense(id: number) {
  return tryCatch(async () => {
    const data = deleteExpenseSchema.parse({ id });
    const expense = await prisma.expenses.update({
      where: { id: data.id, deleted_at: { not: null } },
      data: { deleted_at: null },
    });
    return { expense };
  });
}

export async function restoreManyExpenses(ids: number[]) {
  return tryCatch(async () => {
    const data = deleteManyExpensesSchema.parse({ ids });
    const expenses = await prisma.expenses
      .updateMany({
        where: { id: { in: data.ids } },
        data: { deleted_at: null },
      })
      .catch((err) => {
        throw new Error(err);
      });
    return { expenses };
  });
}
