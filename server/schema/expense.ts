import { Expenses } from "@prisma/client";
import { title } from "process";
import { z } from "zod";


export type OneExpense = Expenses
export type ListExpense = Expenses[]
export type CreateExpense = z.infer<typeof createExpenseSchema>
export type UpdateExpense = z.infer<typeof updateExpenseSchema>
export type DeleteExpense = z.infer<typeof deleteExpenseSchema>


export const createExpenseSchema = z.object({
    title: z.string().min(3, 'ناوەکەت زۆر کورتە').max(75, 'ناوەکەت زۆر درێژە'),
    amount: z.number().nonnegative(),
    note: z.string().optional(),
})

export const updateExpenseSchema = createExpenseSchema.partial()
export const deleteExpenseSchema = z.object({
    id: z.number().int().positive()
})

export const getOneExpenseSchema = z.object({
    id: z.number().int().positive()
})

export const getExpensesListSchema = z.object({
    trashed: z.boolean().optional()
})

export const deleteManyExpensesSchema = z.object({
    ids: z.array(z.number().int().positive())
})


export const getExpensesListActionsSpecificTimeSchema = z.object({
    id: z.coerce.number(),
    startOfMonth: z.date(),
    endOfMonth: z.date(),
})

