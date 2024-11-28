"use server"
//import 'server-only';

import {
  createUserSchema, getOneUserSchema,
  updateUserSchema, loginSchema,
  CreateUser, deleteManyUsersSchema,
  OneUser
} from '@/server/schema/user';
import { tryCatch } from '@/lib/helper';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/client';


export async function getOneUser(id: OneUser['id']) {
  return tryCatch(async () => {
    const data = getOneUserSchema.parse({ id });
    const user = await prisma.users.findUnique({
      where: { id: data.id, deleted_at: null },
    });
    return user;
  });
}

export async function getUsersList(trashed: boolean = false) {
  return tryCatch(async () => {
    const users = await prisma.users.findMany({
      where: { deleted_at: trashed ? { not: null } : null },
      orderBy: {
        created_at: 'desc'
      }
    });
    return users;
  });
}

export async function createUser(user: CreateUser) {
  return tryCatch(async () => {
    const data = createUserSchema.parse(user);
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const newUser = prisma.users.create({
      data: { ...data, password: hashedPassword },
      select: { email: true },
    });
    return newUser;
  });
}

export async function updateUser(
  user: CreateUser
) {
  return tryCatch(async () => {
    const data = updateUserSchema.parse(user);
    const updatedUser = await prisma.users.update({
      where: { id: data.id, deleted_at: null },
      data
    });
    return updatedUser;
  });
}

export async function deleteManyUsers(ids: number[]) {
  return tryCatch(async () => {
    const data = deleteManyUsersSchema.parse({ ids })
    const deletedUsers = await prisma.users.deleteMany({
      where: { id: { in: data.ids } }
    })
    return deletedUsers
  })
}

export async function forceDeleteManyUsers(ids: number[]) {
  return tryCatch(async () => {
    const data = deleteManyUsersSchema.parse({ ids })
    const deletedUsers = await prisma.users.deleteMany({
      where: { id: { in: data.ids } }
    })
    return deletedUsers
  })
}

export async function restoreManyUsers(ids: number[]) {
  return tryCatch(async () => {
    const data = deleteManyUsersSchema.parse({ ids })
    const restoredUsers = await prisma.users.updateMany({
      where: { id: { in: data.ids } }, data: { deleted_at: null }
    })
    return restoredUsers
  })
}

export async function forceDeleteAllTrashedUsers() {
  return tryCatch(async () => {
    const deletedUsers = await prisma.users.deleteMany(
      { where: { deleted_at: { not: null } } });
    return deletedUsers;
  });
}

export async function restoreAllTrashedUsers() {
  return tryCatch(async () => {
    const restoredUsers = await prisma.users.updateMany({
      where: { deleted_at: { not: null } },
      data: { deleted_at: null }
    });
    return restoredUsers;
  });
}

export type LoginUserType = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
}

export async function loginUser(email: string, password: string) {
  try {
    const data = loginSchema.parse({ email, password });
    const user = await prisma.users.findUnique({
      where: { email: data.email, deleted_at: null },
    });

    if (!user) return { error: "User not found" }
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) return { error: "Invalid password" }

    const { password: pass, deleted_at, created_at, updated_at, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error: unknown) {
    return {
      error: "هەڵەیەک هەیە"
    }
  }
}
