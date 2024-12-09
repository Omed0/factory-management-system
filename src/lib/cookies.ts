'use server';

import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { env } from '@/env.mjs';

const key = new TextEncoder().encode(env.SECRET);
const expiteTime = 100 * 24 * 60 * 60 * 1000;

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Date.now() + expiteTime)
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });
  return payload;
}

export async function login<T>(data: T) {
  const expires = new Date(Date.now() + expiteTime);
  const session = await encrypt({ ...data, expires });

  // Save the session in a cookie
  cookies().set('session', session, { expires, httpOnly: true });
  return session;
}

export async function logout() {
  // Destroy the session
  cookies().set('session', '', { expires: new Date(-1) });
}

export async function getSession() {
  try {
    const session = cookies().get('session')?.value;
    if (!session) return null;
    return await decrypt(session);
  } catch (error) {
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  if (!session) return;
  // Refresh the session so it doesn't expire
  const parsed = await decrypt(session);
  parsed.expires = new Date(Date.now() + expiteTime);
  const res = NextResponse.next();
  res.cookies.set({
    name: 'session',
    value: await encrypt(parsed),
    httpOnly: true,
    expires: parsed.expires,
  });
  return res;
}

export async function getCookieData(key: string) {
  const value = cookies().get(key)?.value;
  return value;
}

export async function setCookieData(
  key: string,
  value: string,
  expireTime: number
) {
  cookies().set(key, value, {
    expires: new Date(Date.now() + expireTime),
    httpOnly: true,
    path: '/',
  });
}
