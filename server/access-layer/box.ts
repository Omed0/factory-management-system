import 'server-only';

import { CreateBox, createBoxSchema, GetOneBox, getOneBoxSchema, UpdateBox, updateBoxSchema } from '../schema/box';
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
