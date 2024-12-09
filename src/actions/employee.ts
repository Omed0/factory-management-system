'use server';

import { revalidatePath } from 'next/cache';

import {
  createEmployee,
  createEmployeeAction,
  deleteEmployeeAction,
  deleteManyEmployees,
  forceDeleteManyEmployees,
  getEmployeeActionsSpecificTime,
  getEmployeesList,
  getOneEmployee,
  restoreManyEmployees,
  updateEmployee,
  updateEmployeeAction,
} from '@/server/access-layer/employee';
import {
  CreateEmployee,
  CreateEmployeeAction,
  MonthParams,
  UpdateEmployee,
  UpdateEmployeeAction,
} from '@/server/schema/employee';

export async function getOneEmployeeActions(id: number) {
  const employee = await getOneEmployee(id);

  if (employee === null || 'error' in employee) {
    return { success: false, message: employee?.error };
  }

  return { success: true, data: employee };
}

export async function getEmployeesListActions(isTrash: boolean) {
  const employees = await getEmployeesList(isTrash);
  if ('error' in employees) {
    return { success: false, message: employees.error };
  }
  return { success: true, data: employees };
}

export async function getEmployeesListTrashedActions() {
  const employees = await getEmployeesList(true);
  if ('error' in employees) {
    return { success: false, message: employees.error };
  }
  return { success: true, data: employees };
}

export async function createEmployeeActions(dataEmployee: CreateEmployee) {
  const employee = await createEmployee(dataEmployee);
  if ('error' in employee) return { success: false, message: employee.error };
  revalidatePath('/employee');
  return {
    success: true,
    message: 'ئەم کارمەندە زیادکرا',
  };
}

export async function updateEmployeeActions(
  id: number,
  dataEmployee: UpdateEmployee
) {
  const employee = await updateEmployee(id, dataEmployee);
  if ('error' in employee) return { success: false, message: employee.error };
  revalidatePath('/employee');
  return {
    success: true,
    message: 'ئەم کارمەندە نوێکرایەوە',
  };
}

export async function deleteEmployeeActions(id: number) {
  const employee = await deleteManyEmployees([id]);
  if ('error' in employee) return { success: false, message: employee.error };
  revalidatePath('/employee');
  return {
    success: true,
    message: 'ئەم کارمەندە ئەرشیڤکرا',
  };
}

export async function deleteManyEmployeeActions(ids: number[]) {
  const employee = await deleteManyEmployees(ids);
  if ('error' in employee) return { success: false, message: employee.error };
  revalidatePath('/employee');
  return {
    success: true,
    message: 'کارمەندەکان ئەرشیڤکران بە سەرکەوتووی',
  };
}

export async function restoreEmployeeActions(id: number) {
  const employee = await restoreManyEmployees([id]);
  if ('error' in employee) return { success: false, message: employee.error };
  revalidatePath('/employee');
  return {
    success: true,
    message: 'ئەم کارمەندە گەڕێندرایەوە',
  };
}

export async function restoreManyEmployeeActions(ids: number[]) {
  const employee = await restoreManyEmployees(ids);
  if ('error' in employee) return { success: false, message: employee.error };
  revalidatePath('/employee');
  return {
    success: true,
    message: 'کارمەندەکان گەڕێندرانەوە بە تەواوی',
  };
}

export async function forceDeleteEmployeeActions(id: number) {
  const employee = await forceDeleteManyEmployees([id]);
  if ('error' in employee) return { success: false, message: employee.error };
  revalidatePath('/employee');
  return {
    success: true,
    message: 'ئەم کارمەندە سڕایەوە بە تەواوی',
  };
}

export async function forceDeleteManyEmployeeActions(ids: number[]) {
  const employee = await forceDeleteManyEmployees(ids);
  if ('error' in employee) return { success: false, message: employee.error };
  revalidatePath('/employee');
  return {
    success: true,
    message: 'کارمەندەکان سڕانەوە بە تەواوی',
  };
}

export async function createEmployeeActionActions(
  dataEmployeeAction: CreateEmployeeAction
) {
  const employee = await createEmployeeAction(dataEmployeeAction);
  if ('error' in employee) return { success: false, message: employee.error };
  return {
    success: true,
    message: 'سەرکەوتوبوو',
  };
}

export async function updateEmployeeActionActions(
  id: number,
  dataEmployeeAction: UpdateEmployeeAction
) {
  const employee = await updateEmployeeAction(id, dataEmployeeAction);
  if ('error' in employee) return { success: false, message: employee.error };
  revalidatePath('/employee');
  return {
    success: true,
    message: 'نوێکرایەوە',
  };
}

export async function getEmployeeActionActions(
  empId: number,
  dataQuery: MonthParams
) {
  const employeeActions = await getEmployeeActionsSpecificTime(
    empId,
    dataQuery
  );

  if ('error' in employeeActions) throw new Error(employeeActions.error);
  return employeeActions;
}

export async function deleteEmployeeActionActions(id: number) {
  const employee = await deleteEmployeeAction(id);
  if ('error' in employee) return { success: false, message: employee.error };
  revalidatePath('/employee');
  return {
    success: true,
    message: 'سڕایەوە بە تەواوی',
  };
}
