"use server"

import {
    getEmployeeActionsSpecificTime, createEmployee,
    updateEmployee, deleteManyEmployees, restoreManyEmployees,
    forceDeleteManyEmployees, getEmployeesList, getOneEmployee,
    createEmployeeAction
} from "@/server/access-layer/employee"
import { CreateEmployee, CreateEmployeeAction, UpdateEmployee } from "@/server/schema/employee"
import { EmployeeActionType } from "@prisma/client"
import { revalidatePath } from "next/cache"


export async function getOneEmployeeActions(id: number) {
    const employee = await getOneEmployee(id)

    if (employee === null) {
        return { error: "Employee not found" }
    }

    return employee
}

export async function getEmployeesListActions() {
    const employees = await getEmployeesList()

    return employees
}

export async function getEmployeesListTrashedActions() {
    const employees = await getEmployeesList(true)

    return employees
}

export async function createEmployeeActions(dataEmployee: CreateEmployee) {
    const employee = await createEmployee(dataEmployee)
    if ("error" in employee) return { success: false, message: employee.error }
    revalidatePath("/employee")
    return {
        success: true,
        message: "ئەم کارمەندە زیادکرا",
    }
}

export async function updateEmployeeActions(id: number, dataEmployee: UpdateEmployee) {
    const employee = await updateEmployee(id, dataEmployee)
    if ("error" in employee) return { success: false, message: employee.error }
    revalidatePath("/employee")
    return {
        success: true,
        message: "ئەم کارمەندە نوێکرایەوە",
    }
}

export async function deleteEmployeeActions(id: number) {
    const employee = await deleteManyEmployees([id])
    if ("error" in employee) return { success: false, message: employee.error }
    revalidatePath("/employee")
    return {
        success: true,
        message: "ئەم کارمەندە ئەرشیڤکرا",
    }
}

export async function deleteManyEmployeeActions(ids: number[]) {
    const employee = await deleteManyEmployees(ids)
    if ("error" in employee) return { success: false, message: employee.error }
    revalidatePath("/employee")
    return {
        success: true,
        message: "کارمەندەکان ئەرشیڤکران بە سەرکەوتووی",
    }
}

export async function restoreEmployeeActions(id: number) {
    const employee = await restoreManyEmployees([id])
    if ("error" in employee) return { success: false, message: employee.error }
    revalidatePath("/employee")
    return {
        success: true,
        message: "ئەم کارمەندە گەڕێندرایەوە",
    }
}

export async function restoreManyEmployeeActions(ids: number[]) {
    const employee = await restoreManyEmployees(ids)
    if ("error" in employee) return { success: false, message: employee.error }
    revalidatePath("/employee")
    return {
        success: true,
        message: "کارمەندەکان گەڕێندرانەوە بە تەواوی",
    }
}

export async function forceDeleteEmployeeActions(id: number) {
    const employee = await forceDeleteManyEmployees([id])
    if ("error" in employee) return { success: false, message: employee.error }
    revalidatePath("/employee")
    return {
        success: true,
        message: "ئەم کارمەندە سڕایەوە بە تەواوی",
    }
}

export async function forceDeleteManyEmployeeActions(ids: number[]) {
    const employee = await forceDeleteManyEmployees(ids)
    if ("error" in employee) return { success: false, message: employee.error }
    revalidatePath("/employee")
    return {
        success: true,
        message: "کارمەندەکان سڕانەوە بە تەواوی",
    }
}

export async function createEmployeeActionActions(id: number, dataEmployeeAction: CreateEmployeeAction) {
    const employee = await createEmployeeAction(id, dataEmployeeAction)
    if ("error" in employee) return { success: false, message: employee.error }
    revalidatePath("/employee")
    return {
        success: true,
        message: "سەرکەوتوبوو",
    }
}


export async function getEmployeeActionActions(empId: number, { startOfMonth, endOfMonth }:
    { startOfMonth: Date, endOfMonth: Date }) {
    const employeeActions = await getEmployeeActionsSpecificTime(empId, { startOfMonth, endOfMonth })

    if ("error" in employeeActions) throw new Error(employeeActions.error)

    return employeeActions
}
