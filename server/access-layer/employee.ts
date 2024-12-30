import 'server-only';

import { prisma } from '@/lib/client';
import { tryCatch } from '@/lib/helper';
import {
  CreateEmployee,
  createEmployeeActionSchema,
  CreateEmployeeAction,
  createEmployeeSchema,
  deleteManyEmployeesSchema,
  getEmployeeActionsSpecificTimeSchema,
  UpdateEmployee,
  updateEmployeeSchema,
  updateEmployeeActionSchema,
  UpdateEmployeeAction,
  deleteEmployeeActionSchema,
  MonthParams,
} from '../schema/employee';

export async function getOneEmployee(id: number) {
  return tryCatch(async () => {
    const employee = await prisma.employee.findUnique({
      where: { id, deleted_at: null },
    });
    return employee;
  });
}

export async function getEmployeesList(trashed: boolean = false) {
  return tryCatch(async () => {
    const employees = await prisma.employee.findMany({
      where: { deleted_at: trashed ? { not: null } : null },
      orderBy: {
        created_at: 'desc',
      },
    });
    return employees;
  });
}

export async function createEmployee(dataEmployee: CreateEmployee) {
  return tryCatch(async () => {
    const data = createEmployeeSchema.parse(dataEmployee);

    const employee = await prisma.employee.create({ data });
    return employee;
  });
}

export async function updateEmployee(id: number, dataEmployee: UpdateEmployee) {
  return tryCatch(async () => {
    const data = updateEmployeeSchema.parse(dataEmployee);

    const employee = await prisma.employee.update({
      where: { id, deleted_at: null },
      data,
    });
    return employee;
  });
}

export async function deleteManyEmployees(ids: number[]) {
  return tryCatch(async () => {
    const data = deleteManyEmployeesSchema.parse({ ids });
    const deletedEmployees = await prisma.employee.updateMany({
      where: { id: { in: data.ids }, deleted_at: null },
      data: { deleted_at: new Date() },
    });
    return deletedEmployees;
  });
}

export async function forceDeleteManyEmployees(ids: number[]) {
  return tryCatch(async () => {
    const data = deleteManyEmployeesSchema.parse({ ids });
    const deletedEmployees = await prisma.employee.deleteMany({
      where: { id: { in: data.ids }, deleted_at: { not: null } },
    });
    return deletedEmployees;
  });
}

export async function restoreManyEmployees(ids: number[]) {
  return tryCatch(async () => {
    const data = deleteManyEmployeesSchema.parse({ ids });
    const restoredEmployees = await prisma.employee.updateMany({
      where: { id: { in: data.ids }, deleted_at: { not: null } },
      data: { deleted_at: null },
    });
    return restoredEmployees;
  });
}

export async function getEmployeeCount() {
  return tryCatch(async () => {
    const count = await prisma.employee.count({
      where: { deleted_at: null },
    });
    return count;
  });
}

export async function createEmployeeAction(
  dataEmployeeAction: CreateEmployeeAction
) {
  return tryCatch(async () => {
    const data = createEmployeeActionSchema.parse(dataEmployeeAction);
    const isIncrease = ['BONUS', 'OVERTIME'].includes(data.type);
    const amount = isIncrease
      ? { increment: data.amount }
      : { decrement: data.amount };

    const { employeeAction, box } = await prisma.$transaction(async (tx) => {
      const employeeAction = await tx.employeeActions.create({
        data: {
          ...data,
          dateAction: new Date(),
        },
      });
      const box = await tx.boxes.update({
        where: { id: 1 },
        data: { amount },
        select: { amount: true },
      });
      return { employeeAction, box };
    });
    return { employeeAction, box };
  });
}

export async function updateEmployeeAction(
  id: number,
  dataEmployeeAction: UpdateEmployeeAction
) {
  return tryCatch(async () => {
    const data = updateEmployeeActionSchema.parse(dataEmployeeAction);
    const employeeAction = await prisma.$transaction(async (tx) => {
      const oldEmployeeAction = await tx.employeeActions.findUnique({
        where: { id },
      });
      if (!oldEmployeeAction) throw new Error('ئەم ئەرکە نەدۆزرایەوە');
      if (oldEmployeeAction.amount !== data.amount) {
        await tx.boxes.update({
          where: { id: 1 },
          data: { amount: { increment: oldEmployeeAction.amount } },
        });
        await tx.boxes.update({
          where: { id: 1 },
          data: { amount: { decrement: data.amount } },
        });
      }
      const updatedAction = await tx.employeeActions.update({
        where: { id },
        data: { ...data },
      });
      return updatedAction;
    });
    return employeeAction;
  });
}

export async function deleteEmployeeAction(id: number) {
  return tryCatch(async () => {
    const data = deleteEmployeeActionSchema.parse({ id });
    const deletedAction = await prisma.$transaction(async (tx) => {
      const employeeAction = await tx.employeeActions.findUnique({
        where: { id: data.id },
      });
      if (!employeeAction) throw new Error('ئەم ئەرکە نەدۆزرایەوە');
      await tx.boxes.update({
        where: { id: 1 },
        data: { amount: { increment: employeeAction.amount } },
      });
      return await tx.employeeActions.delete({ where: { id: data.id } });
    });
    return deletedAction;
  });
}

export async function getEmployeeActionsSpecificTime(
  empId: number,
  dateQuery: MonthParams
) {
  return tryCatch(async () => {
    const data = getEmployeeActionsSpecificTimeSchema.parse({
      ...dateQuery,
      id: empId,
    });

    const startOfThisMonth = new Date(data.startOfMonth).toISOString();
    const endOfThisMonth = new Date(data.endOfMonth).toISOString();

    const actions = await prisma.employeeActions.findMany({
      where: {
        employeeId: data.id,
        dateAction: {
          gte: startOfThisMonth,
          lte: endOfThisMonth,
        },
        employee: { deleted_at: null },
      },
    });

    return actions;
  });
}
