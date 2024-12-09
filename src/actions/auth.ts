'use server';

import { redirect } from 'next/navigation';

import { login, logout } from '@/lib/cookies';
import { loginUser } from '@/server/access-layer/user';

export async function LoginAction(email: string, password: string) {
  const user = await loginUser(email, password);

  if ('error' in user) {
    return { error: user.error };
  }

  const token = await login(user);

  return { user, token };
}

export async function LogoutAction() {
  await logout();
  redirect('/login');
}
