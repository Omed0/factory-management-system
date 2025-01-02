'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { LoginAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { sleep } from '@/lib/utils';
import { loginSchema, LoginUser } from '@/server/schema/user';

export default function LoginForm() {
  const router = useRouter();
  const form = useForm<LoginUser>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginUser) {
    const { error } = await LoginAction(values.email, values.password);
    if (error) {
      toast.error(error as string);
      return;
    }
    toast.success('You have successfully logged in!', {
      description: 'Redirecting to dashboard...',
    });
    await sleep(1000);
    router.replace('/dashboard');
    return
  }

  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      <div className="bg-accent hidden p-16 lg:block lg:w-1/2">
        <Image
          priority
          quality={100}
          width={600}
          height={800}
          src="/images/login.svg"
          alt="Login visual"
          className="aspect-square size-full object-contain"
        />
      </div>
      <div className="bg-backgrounds flex w-full items-center justify-center p-8 lg:w-1/2">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="mb-2">چوونە ژوورەوە</CardTitle>
            <CardDescription>
              زانیارییەکانت داخڵ بکە بۆ چوونەژوورەوە
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ئیمەیڵ</FormLabel>
                      <FormControl>
                        <Input placeholder="ئیمەیلەکەت بنووسە" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>پاسوۆرد</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="پاسوۆردەکەت بنووسە"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  چوونە ژوورەوە
                </Button>
              </form>
            </Form>
          </CardContent>
          {/*<CardFooter></CardFooter>*/}
        </Card>
      </div>
    </div>
  );
}
