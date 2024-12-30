import { Employee, EmployeeActionType } from '@prisma/client';
import { z } from 'zod';

export type CreateEmployee = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployee = z.infer<typeof updateEmployeeSchema>;
export type GetOneEmployee = z.infer<typeof getOneEmployeeSchema>;
export type DeleteEmployee = z.infer<typeof deleteEmployeeSchema>;
export type UpdateEmployeeAction = z.infer<typeof updateEmployeeActionSchema>;
export type OneEmployee = Employee;
export type ListEmployee = Employee[];

export const createEmployeeSchema = z.object({
  name: z.string().min(3, 'ناوەکەت زۆر کورتە').max(75, 'ناوەکەت زۆر درێژە'),
  address: z.string().optional(),
  monthSalary: z.coerce.number().min(0, { message: 'بڕی مەعاش بنووسە' }),
  dollar: z.coerce.number().min(0),
  phone: z.string().min(6).max(16),
  image: z.any().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const getOneEmployeeSchema = z.object({
  id: z.number(),
});

export const deleteEmployeeSchema = z.object({
  id: z.number(),
});

export const deleteManyEmployeesSchema = z.object({
  ids: z.array(z.number()),
});

export const createEmployeeActionSchema = z.object({
  employeeId: z.coerce.number(),
  type: z.nativeEnum(EmployeeActionType),
  amount: z.coerce.number().positive(),
  dollar: z.coerce.number().positive(),
  note: z.string().optional(),
  dateAction: z.date(),
});

export const updateEmployeeActionSchema = createEmployeeActionSchema.partial();

export const getEmployeeActionsSpecificTimeSchema = z.object({
  id: z.coerce.number(),
  startOfMonth: z.date(),
  endOfMonth: z.date(),
});

export const deleteEmployeeActionSchema = z.object({
  id: z.coerce.number(),
});

export type CreateEmployeeAction = z.infer<typeof createEmployeeActionSchema>;
export type GetEmployeeActionsSpecificTime = z.infer<
  typeof getEmployeeActionsSpecificTimeSchema
>;
export type MonthParams = { startOfMonth: Date; endOfMonth: Date };
