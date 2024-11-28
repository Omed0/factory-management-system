import 'server-only';

import { CreateBox, createBoxSchema, GetOneBox, getOneBoxSchema, UpdateBox, updateBoxSchema, updateDollarSchema } from '../schema/box';
import { tryCatch } from '@/lib/helper';
import { prisma } from '@/lib/client';

export async function createBox(box: CreateBox) {
  tryCatch(async () => {
    const data = createBoxSchema.parse(box);
    const createdBox = await prisma.boxes.create({ data });
    return createdBox;
  });
}

export async function getOneBox(id: GetOneBox['id']) {
  tryCatch(async () => {
    const data = getOneBoxSchema.parse({ id });
    const box = await prisma.boxes.findUnique({
      where: { id: data.id },
    });
    return box;
  });
}

export async function updateBox(box: UpdateBox) {
  tryCatch(async () => {
    const data = updateBoxSchema.parse({ id: box.id, amount: box.amount });
    const updatedBox = await prisma.boxes.update({
      where: { id: data.id },
      data: { amount: data.amount },
      select: { amount: true }
    });
    return updatedBox;
  });
}


//UPDATE DOLLAR

export async function getDollar() {
  return tryCatch(async () => {
    const dollar = await prisma.boxes.findFirst({
      where: { id: 1 },
      select: { dollar: true }
    });

    if (!dollar) throw new Error("دۆلار بوونی نییە")
    return { dollar };
  });
}


export async function updateDollar({ amount }: { amount: number }) {
  return tryCatch(async () => {
    const data = updateDollarSchema.parse({ amount });
    const updateDollar = await prisma.boxes.update({
      where: { id: 1 },
      data: { dollar: data.amount },
      select: { dollar: true }
    });
    return updateDollar;
  });
}
