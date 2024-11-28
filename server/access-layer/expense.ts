import { prisma } from '@/lib/client';
import { tryCatch } from '@/lib/helper';
import 'server-only';
import {
    CreateExpense, createExpenseSchema, deleteExpenseSchema, deleteManyExpensesSchema, getExpensesListActionsSpecificTimeSchema,
    getExpensesListSchema, getOneExpenseSchema,
    UpdateExpense, updateExpenseSchema
} from '../schema/expense';

export async function getOneExpense(id: number) {
    return tryCatch(async () => {
        const data = getOneExpenseSchema.parse({ id })
        const expense = await prisma.expenses.findUnique({
            where: { id: data.id, deleted_at: null }
        })
        return expense
    })
}

export async function getExpensesList(trashed: boolean = false) {
    return tryCatch(async () => {
        const data = getExpensesListSchema.parse({ trashed })
        const expenses = await prisma.expenses.findMany({
            where: { deleted_at: data.trashed ? { not: null } : null },
            orderBy: {
                created_at: 'desc'
            }
        })
        return expenses
    })
}

export async function createExpense(dataExpense: CreateExpense) {
    return tryCatch(async () => {
        const data = createExpenseSchema.parse(dataExpense)
        const { expense, box } = await prisma.$transaction(async (tx) => {
            const expense = await tx.expenses.create({ data })
            const box = await tx.boxes.update(
                {
                    where: { id: 1 },
                    data: { amount: { decrement: expense.amount } }
                })

            return { expense, box }
        })
        return { expense, box }
    })
}

export async function updateExpense(id: number, dataExpense: UpdateExpense) {
    return tryCatch(async () => {
        const data = updateExpenseSchema.parse(dataExpense)
        const expenseId = getOneExpenseSchema.parse({ id })
        const { expense, box } = await prisma.$transaction(async (tx) => {
            const oldExpense = await tx.expenses.findUnique({
                where: { id: expenseId.id, deleted_at: null }
            })
            if (!oldExpense) throw new Error('ئەم خەرجییە نەدۆزرایەوە')

            const expense = await tx.expenses.update({
                where: { id: expenseId.id },
                data
            })

            const amountDifference = expense.amount - oldExpense.amount

            const box = await tx.boxes.update({
                where: { id: 1 },
                data: { amount: { decrement: amountDifference } }
            })
            return { expense, box }
        })
        return { expense, box }
    })
}

export async function deleteExpense(id: number) {
    return tryCatch(async () => {
        const data = deleteExpenseSchema.parse({ id })
        const { expense, box } = await prisma.$transaction(async (tx) => {
            const expense = await tx.expenses.update({
                where: { id: data.id, deleted_at: null },
                data: { deleted_at: new Date() }
            })
            const box = await tx.boxes.update({
                where: { id: 1 },
                data: { amount: { increment: expense.amount } }
            })
            return { expense, box }
        })
        return { expense, box }
    })
}

export async function deleteManyExpenses(ids: number[]) {
    return tryCatch(async () => {
        const data = deleteManyExpensesSchema.parse({ ids })
        const { expenses, box } = await prisma.$transaction(async (tx) => {
            // First fetch the expenses to get their amounts
            const expensesToDelete = await tx.expenses.findMany({
                where: { id: { in: data.ids }, deleted_at: null }
            })

            const expenses = await tx.expenses.updateMany({
                where: { id: { in: data.ids } },
                data: { deleted_at: new Date() }
            })

            const totalAmount = expensesToDelete.reduce((acc, curr) => acc + curr.amount, 0)
            const box = await tx.boxes.update({
                where: { id: 1 },
                data: { amount: { increment: totalAmount } }
            })
            return { expenses, box }
        })
        return { expenses, box }
    })
}

export async function forceDeleteExpense(id: number) {
    return tryCatch(async () => {
        const data = deleteExpenseSchema.parse({ id })
        const expense = await prisma.expenses.delete({
            where: { id: data.id, deleted_at: { not: null } }
        })
        return expense
    })
}

export async function forceDeleteManyExpenses(ids: number[]) {
    return tryCatch(async () => {
        const data = deleteManyExpensesSchema.parse({ ids })
        const expenses = await prisma.expenses.deleteMany({
            where: {
                id: { in: data.ids },
                deleted_at: { not: null }
            }
        })
        return expenses
    })
}

export async function restoreExpense(id: number) {
    return tryCatch(async () => {
        const data = deleteExpenseSchema.parse({ id })
        const { expense, box } = await prisma.$transaction(async (tx) => {
            const expense = await tx.expenses.update(
                {
                    where: { id: data.id, deleted_at: { not: null } },
                    data: { deleted_at: null }
                })
            const box = await tx.boxes.update({
                where: { id: 1 },
                data: { amount: { decrement: expense.amount } }
            })
            return { expense, box }
        })
        return { expense, box }
    })
}

export async function restoreManyExpenses(ids: number[]) {
    return tryCatch(async () => {
        const data = deleteManyExpensesSchema.parse({ ids })
        const { expenses, box } = await prisma.$transaction(async (tx) => {
            const expensesToRestore = await tx.expenses.findMany({
                where: { id: { in: data.ids }, deleted_at: { not: null } }
            })
            const totalAmount = expensesToRestore.reduce((acc, curr) => acc + curr.amount, 0)

            const expenses = await tx.expenses.updateMany({
                where: { id: { in: data.ids } }, data: { deleted_at: null }
            })
            const box = await tx.boxes.update({
                where: { id: 1 },
                data: { amount: { decrement: totalAmount } }
            })
            return { expenses, box }
        })
        return { expenses, box }
    })
}


export async function getExpensesListActionsSpecificTime(startOfMonth: Date, endOfMonth: Date) {
    return tryCatch(async () => {
        const data = getExpensesListActionsSpecificTimeSchema.parse({ startOfMonth, endOfMonth })
        const startOfThisMonth = new Date(data.startOfMonth).toISOString()
        const endOfThisMonth = new Date(data.endOfMonth).toISOString()

        const expenses = await prisma.expenses.findMany({
            where: {
                created_at: { gte: startOfThisMonth, lte: endOfThisMonth },
                deleted_at: null
            }
        })
        return expenses
    })
}

