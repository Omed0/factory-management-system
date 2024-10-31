import 'server-only';

import { prisma } from '@/lib/client';
import { tryCatch } from '@/lib/helper';
import {
    CreateEmployee, createEmployeeActionSchema,
    CreateEmployeeAction, createEmployeeSchema,
    deleteManyEmployeesSchema,
    getEmployeeActionsSpecificTimeSchema,
    UpdateEmployee, updateEmployeeSchema
} from '../schema/employee';


export async function getOneEmployee(id: number) {
    return tryCatch(async () => {
        const employee = await prisma.employee.findUnique({
            where: { id, deleted_at: null }
        })
        return employee
    })
}

export async function getEmployeesList(trashed: boolean = false) {
    return tryCatch(async () => {
        const employees = await prisma.employee.findMany({
            where: { deleted_at: trashed ? { not: null } : null }
        })
        return employees
    })
}

export async function createEmployee(dataEmployee: CreateEmployee) {
    return tryCatch(async () => {
        const data = createEmployeeSchema.parse(dataEmployee)

        const employee = await prisma.employee.create({
            data
        })
        return employee
    })
}

export async function updateEmployee(id: number, dataEmployee: UpdateEmployee) {
    return tryCatch(async () => {
        const data = updateEmployeeSchema.parse(dataEmployee)

        const employee = await prisma.employee.update({
            where: { id, deleted_at: null },
            data
        })
        return employee
    })
}

export async function deleteManyEmployees(ids: number[]) {
    return tryCatch(async () => {
        const data = deleteManyEmployeesSchema.parse({ ids })
        const deletedEmployees = await prisma.employee.updateMany(
            { where: { id: { in: data.ids } }, data: { deleted_at: new Date() } }
        )
        return deletedEmployees
    })
}

export async function forceDeleteManyEmployees(ids: number[]) {
    return tryCatch(async () => {
        const data = deleteManyEmployeesSchema.parse({ ids })
        const deletedEmployees = await prisma.employee.deleteMany({ where: { id: { in: data.ids } } })
        return deletedEmployees
    })
}

export async function restoreManyEmployees(ids: number[]) {
    return tryCatch(async () => {
        const data = deleteManyEmployeesSchema.parse({ ids })
        const restoredEmployees = await prisma.employee.updateMany({
            where: { id: { in: data.ids } }, data: { deleted_at: null }
        })
        return restoredEmployees
    })
}

export async function getEmployeeCount() {
    return tryCatch(async () => {
        const count = await prisma.employee.count({
            where: { deleted_at: null }
        })
        return count
    })
}

export async function createEmployeeAction(id: number, dataEmployeeAction: CreateEmployeeAction) {
    const isIncrease = ["BONUS", "OVERTIME"].includes(dataEmployeeAction.type)

    return tryCatch(async () => {
        const data = createEmployeeActionSchema.parse(dataEmployeeAction)
        const { employee, box } = await prisma.$transaction(async (tx) => {
            const employee = await tx.employeeActions.create({
                data: {
                    ...data,
                    employeeId: id,
                    dateAction: new Date()
                }
            })
            const box = await tx.boxes.update({
                where: { id: 1 },
                data: { amount: { increment: isIncrease ? data.amount : -data.amount } },
                select: { amount: true }
            })
            return { employee, box }
        })
        return { employee, box }
    })
}


export async function getEmployeeActionsSpecificTime(empId: number, { startOfMonth, endOfMonth }:
    { startOfMonth: Date, endOfMonth: Date }) {
    return tryCatch(async () => {

        const data = getEmployeeActionsSpecificTimeSchema.parse({ startOfMonth, endOfMonth, id: empId })

        const startOfThisMonth = new Date(data.startOfMonth).toISOString();
        const endOfThisMonth = new Date(data.endOfMonth).toISOString();

        const actions = await prisma.employeeActions.findMany({
            where: {
                employeeId: data.id,
                dateAction: {
                    gte: startOfThisMonth,
                    lte: endOfThisMonth
                },
                employee: { deleted_at: null }
            },
        })
        return actions
    })
}

