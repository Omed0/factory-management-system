"use server"

import {
    createExpense, deleteExpense,
    deleteManyExpenses,
    forceDeleteExpense,
    forceDeleteManyExpenses,
    getExpensesList, getExpensesListActionsSpecificTime, getOneExpense,
    restoreExpense, restoreManyExpenses,
    updateExpense
} from "@/server/access-layer/expense"
import { CreateExpense, UpdateExpense } from "@/server/schema/expense"
import { revalidatePath } from "next/cache"

function serializeBigInt(data: any) {
    return JSON.parse(JSON.stringify(data, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ))
}

export async function getExpensesListActions() {
    const expenses = await getExpensesList()
    if ("error" in expenses) {
        return { success: false, message: expenses.error }
    }
    return { success: true, data: serializeBigInt(expenses) }
}

export async function getExpensesListTrashedActions() {
    const expenses = await getExpensesList(true)
    if ("error" in expenses) {
        return { success: false, message: expenses.error }
    }
    return { success: true, data: serializeBigInt(expenses) }
}

export async function getExpensesListSpecificTimeActions(startOfMonth: Date, endOfMonth: Date) {
    const expenses = await getExpensesListActionsSpecificTime(startOfMonth, endOfMonth)
    if ("error" in expenses) {
        return { success: false, message: expenses.error }
    }
    return { success: true, data: serializeBigInt(expenses) }
}

export async function createExpenseActions(dataExpense: CreateExpense) {
    const expense = await createExpense(dataExpense)
    if ("error" in expense) {
        return { success: false, message: expense.error }
    }
    revalidatePath("/expense")
    return { success: true, message: "خەرجی زیادکرا بە سەرکەوتووی" }
}

export async function updateExpenseActions(id: number, dataExpense: UpdateExpense) {
    const expense = await updateExpense(id, dataExpense)
    if ("error" in expense) {
        return { success: false, message: expense.error }
    }
    revalidatePath("/expense")
    return { success: true, message: "گۆڕانکاری لە خەرجی کرا بە سەرکەوتووی" }
}

export async function getOneExpenseActions(id: number) {
    const expense = await getOneExpense(id)
    if (expense === null || "error" in expense) {
        return { success: false, message: expense?.error }
    }
    return { success: true, data: serializeBigInt(expense) }
}

export async function deleteExpenseActions(id: number) {
    const expense = await deleteExpense(id)
    if ("error" in expense) {
        return { success: false, message: expense.error }
    }
    revalidatePath("/expense")
    return { success: true, message: "خەرجی سڕایەوە بە سەرکەوتووی" }
}

export async function deleteManyExpensesActions(ids: number[]) {
    const expense = await deleteManyExpenses(ids)
    if ("error" in expense) {
        return { success: false, message: expense.error }
    }
    revalidatePath("/expense")
    return { success: true, message: "خەرجیەکان سڕانەوە بە سەرکەوتووی" }
}

export async function restoreExpenseActions(id: number) {
    const expense = await restoreExpense(id)
    if ("error" in expense) {
        return { success: false, message: expense.error }
    }
    revalidatePath("/expense")
    return { success: true, message: "خەرجی گەڕێندرایەوە بە سەرکەوتووی" }
}

export async function restoreManyExpensesActions(ids: number[]) {
    const expenses = await restoreManyExpenses(ids)
    if ("error" in expenses) {
        return { success: false, message: expenses.error }
    }
    revalidatePath("/expense")
    return { success: true, message: "خەرجیەکان گەڕێندرانەوە بە سەرکەوتووی" }
}

export async function forceDeleteExpenseActions(id: number) {
    const expense = await forceDeleteExpense(id)
    if ("error" in expense) {
        return { success: false, message: expense.error }
    }
    revalidatePath("/expense")
    return { success: true, message: "خەرجی سڕایەوە بە تەواوی" }
}

export async function forceDeleteManyExpensesActions(ids: number[]) {
    const expense = await forceDeleteManyExpenses(ids)
    if ("error" in expense) {
        return { success: false, message: expense.error }
    }
    revalidatePath("/expense")
    return { success: true, message: "خەرجیەکان سڕانەوە بە تەواوی" }
}


