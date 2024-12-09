import { Metadata } from 'next';

import LoginForm from './login-form';

export default function LoginPage() {
  return (
    <main>
      <LoginForm />
    </main>
  );
}

export const generateMetadata = (): Metadata => ({
  title: 'Login Page',
  description: 'Login Page Factory System Management',
});
