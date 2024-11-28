"use server"


import {
    createCustomer, deleteCustomer, forceDeleteCustomer,
    getCustomersList, getOneCustomer, restoreCustomer,
    updateCustomer
} from "@/server/access-layer/customer"
import { CreateCustomer } from "@/server/schema/customer"
import { UpdateCustomer } from "@/server/schema/customer"
import { revalidatePath } from "next/cache"


// CUSTOMER ACTIONS

export async function getOneCustomerActions(id: number) {
    const Customer = await getOneCustomer(id)
    if (Customer === null || "error" in Customer) {
        return {
            success: false,
            message: Customer?.error ?? "کڕیار نەدۆزرایەوە"
        }
    }
    return { success: true, data: Customer }
}


export async function getCustomerListActions(trashed: boolean = false) {
    const customers = await getCustomersList(trashed)
    if (customers === null || "error" in customers) {
        return {
            success: false,
            message: customers?.error
        }
    }
    return { success: true, data: customers }
}

export async function createCustomerActions(data: CreateCustomer) {
    const Customer = await createCustomer(data)
    if (Customer === null || "error" in Customer) {
        return {
            success: false,
            message: Customer?.error
        }
    }
    revalidatePath("/customer")
    return { success: true, message: "کڕیار دروستکرا" }
}

export async function updateCustomerActions(data: UpdateCustomer) {
    const Customer = await updateCustomer(data)
    if (Customer === null || "error" in Customer) {
        return {
            success: false,
            message: Customer?.error
        }
    }
    revalidatePath("/customer")
    return { success: true, message: "گۆڕانکاری سەرکەوتبوو" }
}

export async function deleteCustomerActions(id: number) {
    const Customer = await deleteCustomer(id)
    if (Customer === null || "error" in Customer) {
        return {
            success: false,
            message: Customer?.error
        }
    }
    revalidatePath("/customer")
    return { success: true, message: "کڕیار ئەرشیفکرا" }
}

export async function restoreCustomerActions(id: number) {
    const Customer = await restoreCustomer(id)
    if (Customer === null || "error" in Customer) {
        return {
            success: false,
            message: Customer?.error
        }
    }
    revalidatePath("/customer")
    return { success: true, message: "کڕیار گەڕێندرایەوە" }
}


export async function forceDeleteCustomerActions(id: number) {
    const Customer = await forceDeleteCustomer(id)
    if (Customer === null || "error" in Customer) {
        return {
            success: false,
            message: Customer?.error
        }
    }
    revalidatePath("/customer")
    return { success: true, message: "کڕیار بەتەواوی سڕایەوە" }
}
