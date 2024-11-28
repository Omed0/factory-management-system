import { Users } from '@prisma/client';
import { z } from 'zod';

export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type GetOneUser = z.infer<typeof getOneUserSchema>;
export type DeleteUser = z.infer<typeof deleteUserSchema>;
export type OneUser = Users;
export type ListUser = Users[];

export type LoginUser = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  email: z.string().email('ئیمەیڵەکەت بەڕێکی بنووسە'),
  name: z.string().min(3, 'ناوەکەت زۆر کورتە').max(75, 'ناوەکەت زۆر درێژە'),
  password: z
    .string()
    .min(8, 'پاسۆردەکەت بەلایەنی کەم ئەبێ ٨ پیت یان زیاتر بێت')
    .max(100),
  phone: z.string().min(6).max(16).optional(),
  image: z.string().optional(),
});

export const updateUserSchema = createUserSchema.partial().and(z.object({
  id: z.string()
}));

export const getOneUserSchema = z.object({
  id: z.string(),
});

export const deleteUserSchema = z.object({
  id: z.string(),
});

export const deleteManyUsersSchema = z.object({
  ids: z.array(z.string()),
});

export const loginSchema = z.object({
  email: z.string().email('ئیمەیڵەکەت بەڕێکی بنووسە'),
  password: z
    .string()
    .min(8, 'پاسۆردەکەت بەلایەنی کەم ئەبێ ٨ پیت یان زیاتر بێت')
    .max(100),
});
