import 'server-only';

import { tryCatch } from '@/lib/helper';
import { prisma } from '@/lib/client';
import { addition_actions, subtraction_actions } from '@/lib/constant';
import { updateDollarSchema } from '../schema/box';
import { revalidatePath } from 'next/cache';

// Function to calculate totalAmount
export async function calculateTotalAmount() {
  return tryCatch(async () => {
    const totalAmount = await prisma
      .$transaction(async (tx) => {
        const expensesTotal = await tx.expenses.aggregate({
          _sum: { amount: true },
          where: { deleted_at: null },
        });

        const companyPurchaseTotal = await tx.companyPurchase.aggregate({
          _sum: { totalRemaining: true },
          where: { deleted_at: null },
        });

        const employeeActions = await tx.employeeActions.findMany();

        const salesTotal = await tx.sales.aggregate({
          _sum: { totalRemaining: true },
          where: { deleted_at: null },
        });

        const employeeActionsTotal = employeeActions.reduce((acc, curr) => {
          if (
            subtraction_actions.includes(
              curr.type as (typeof subtraction_actions)[number]
            )
          ) {
            acc -= curr.amount;
          } else if (
            addition_actions.includes(
              curr.type as (typeof addition_actions)[number]
            )
          ) {
            acc += curr.amount;
          }
          return acc;
        }, 0);

        const assets =
          (employeeActionsTotal || 0) + (salesTotal._sum.totalRemaining || 0);
        const liabilities =
          (expensesTotal._sum.amount || 0) +
          (companyPurchaseTotal._sum.totalRemaining || 0);

        const equity = assets - liabilities;

        return equity;
      })
      .catch((err) => {
        console.error(err);
        return 0;
      });

    return totalAmount;
  });
}

export async function getDollar() {
  return tryCatch(async () => {
    const price = await prisma.dollar
      .findFirst({ where: { id: 1 } })
      .catch((e) => {
        throw new Error(e);
      });

    return price;
  });
}

export async function updateDollar(amount: number) {
  return tryCatch(async () => {
    const { amount: price } = updateDollarSchema.parse({ amount });
    const updatedDollar = await prisma.dollar
      .update({
        where: { id: 1 },
        data: { price },
      })
      .catch((e) => {
        throw new Error(e);
      });

    revalidatePath('(root)', 'layout');
    return updatedDollar;
  });
}
