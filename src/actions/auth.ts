'use server';

import { login } from "@/lib/cookies";
import { loginUser } from "@/server/access-layer/user";

export async function LoginAction(email: string, password: string) {
    const user = await loginUser(email, password)

    if ('error' in user) {
        return { error: user.error }
    }

    const token = await login(user.id)

    return { user, token }
}
