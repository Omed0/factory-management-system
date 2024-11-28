'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { loginSchema, LoginUser } from '@/server/schema/user'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LoginAction } from '@/actions/auth'
import Image from 'next/image'
import { sleep } from '@/lib/utils'


export default function LoginForm() {
  const router = useRouter()
  const form = useForm<LoginUser>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: LoginUser) {
    const { error } = await LoginAction(values.email, values.password)
    if (error) {
      toast.error(error as string)
      return
    }
    toast.success(
      "You have successfully logged in!",
      { description: "Redirecting to customer..." }
    )
    await sleep(1000)
    router.replace("/customer")
  }


  return (
    <div className="h-dvh flex flex-col lg:flex-row">
      <div className="hidden lg:block lg:w-1/2 bg-accent p-16">
        <Image
          priority
          quality={100}
          width={600}
          height={800}
          src="/images/login.svg"
          alt="Login visual"
          className="w-full h-full object-contain aspect-square"
        />
      </div>
      <div className="w-full lg:w-1/2 flex items-center bg-backgrounds justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className='mb-2'>چوونە ژوورەوە</CardTitle>
            <CardDescription>زانیارییەکانت داخڵ بکە بۆ چوونەژوورەوە</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                        <Input type="password" placeholder="پاسوۆردەکەت بنووسە" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">چوونە ژوورەوە</Button>
              </form>
            </Form>
          </CardContent>
          {/*<CardFooter></CardFooter>*/}
        </Card>
      </div>
    </div>
  )
}
