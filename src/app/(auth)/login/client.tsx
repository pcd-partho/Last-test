
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Logo from "@/components/logo"
import { Eye, EyeOff, Send } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"

const loginSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
})

const forgotPasswordSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email."})
})

const adminEmails = ['deypartho569@gmail.com', 'Pdey02485@gmail.com'];

export default function LoginClient() {
  const { toast } = useToast()
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // In a real app, this would make an API call to your auth provider
  function onSubmit(data: z.infer<typeof loginSchema>) {
    const userAuthData = localStorage.getItem(`user_auth_${data.email}`);
    if (!userAuthData) {
        toast({ title: "Login Failed", description: "No account found with this email. Please sign up.", variant: "destructive" });
        return;
    }

    const { password } = JSON.parse(userAuthData);
    if (password !== data.password) {
        toast({ title: "Login Failed", description: "Incorrect password. Please try again.", variant: "destructive" });
        return;
    }

    localStorage.setItem("user_email", data.email);

    if (adminEmails.includes(data.email)) {
        toast({
            title: "Admin Login Successful",
            description: "Welcome back! Redirecting you to the dashboard...",
        });
    } else {
         toast({
            title: "Login Successful",
            description: "Welcome back! Redirecting you to the dashboard...",
        });
    }

    router.push('/dashboard');
  }

  function handleForgotPassword(data: z.infer<typeof forgotPasswordSchema>) {
    console.log("Simulating password reset for:", data.email);
    toast({
        title: "Password Reset Email Sent",
        description: `If an account with the email ${data.email} exists, a password reset link has been sent.`
    })
  }

  return (
    <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <Logo className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome Back!</CardTitle>
            <CardDescription>
                Sign in to continue to AutoTubeAI.
            </CardDescription>
        </CardHeader>
        <CardContent>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input type="email" placeholder="name@example.com" {...field} />
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
                            <div className="flex justify-between items-center">
                                <FormLabel>Password</FormLabel>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <button type="button" className="text-sm font-medium text-primary hover:underline">Forgot password?</button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Reset Your Password</DialogTitle>
                                            <DialogDescription>
                                                Enter your email address and we'll send you a link to reset your password. In this prototype, this simulates an email and does not actually send one.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <Form {...forgotPasswordForm}>
                                            <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                                                 <FormField
                                                    control={forgotPasswordForm.control}
                                                    name="email"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                        <FormLabel>Email</FormLabel>
                                                        <FormControl>
                                                            <Input type="email" placeholder="name@example.com" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <DialogFooter>
                                                    <DialogClose asChild>
                                                        <Button type="submit">
                                                            <Send className="mr-2 h-4 w-4" />
                                                            Send Reset Link
                                                        </Button>
                                                    </DialogClose>
                                                </DialogFooter>
                                            </form>
                                        </Form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        <FormControl>
                            <div className="relative">
                                <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowPassword(prev => !prev)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                                </Button>
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit" className="w-full">Sign In</Button>
                </form>
            </Form>
            <div className="mt-4 text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="underline">
                    Sign up
                </Link>
            </div>
        </CardContent>
    </Card>
  )
}
