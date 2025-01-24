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
    const employee = await prisma.employee
      .findUnique({
        where: { id, deleted_at: null },
      })
      .catch((e) => {
        throw new Error(e);
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
    const employeeAction = await prisma.employeeActions
      .create({ data })
      .catch((e) => {
        throw new Error('دروستنەکرا هەڵەیەک هەیە');
      });
    return { employeeAction };
  });
}

export async function updateEmployeeAction(
  id: number,
  dataEmployeeAction: UpdateEmployeeAction
) {
  return tryCatch(async () => {
    const data = updateEmployeeActionSchema.parse(dataEmployeeAction);
    const updatedAction = await prisma.employeeActions
      .update({
        where: { id },
        data,
      })
      .catch((e) => {
        throw new Error('ئەم ئەرکە نەدۆزرایەوە');
      });
    return updatedAction;
  });
}

export async function deleteEmployeeAction(id: number) {
  return tryCatch(async () => {
    const data = deleteEmployeeActionSchema.parse({ id });
    return await prisma.employeeActions
      .delete({ where: { id: data.id } })
      .catch((e) => {
        throw new Error('نەسڕایەوە هەڵەیەک هەیە');
      });
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

    const actions = await prisma.employeeActions.findMany({
      where: {
        employeeId: data.id,
        dateAction: {
          gte: data.startOfMonth,
          lte: data.endOfMonth,
        },
        employee: { deleted_at: null },
      },
    });

    return actions;
  });
}
