
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Logo from "@/components/logo"
import { Eye, EyeOff } from "lucide-react"

const signupSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
})

const adminEmails = ['deypartho569@gmail.com', 'Pdey02485@gmail.com'];

export default function SignupClient() {
  const { toast } = useToast()
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  // In a real app, this would make an API call to your auth provider
  function onSubmit(data: z.infer<typeof signupSchema>) {
    // IMPORTANT: This is an insecure way to store passwords and is for prototype purposes only.
    // In a real application, never store plain text passwords.
    localStorage.setItem(`user_auth_${data.email}`, JSON.stringify({ password: data.password, name: data.name }));

    // Store email for use across the app
    localStorage.setItem("user_email", data.email);

    // Check if the new user is an admin
    if (adminEmails.includes(data.email)) {
        localStorage.setItem(`user_activated_${data.email}`, "true"); // Admins are auto-activated
        toast({
            title: "Admin Account Created!",
            description: "Please log in to access the admin dashboard.",
        });
    } else {
        localStorage.removeItem(`user_activated_${data.email}`); // Ensure regular users are not activated
        toast({
            title: "Account Created!",
            description: "You can now log in. Some features will be disabled until you activate your account.",
        });
    }
    
    router.push('/login');
  }

  return (
    <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <Logo className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Create an Account</CardTitle>
            <CardDescription>
                Enter your details to get started.
            </CardDescription>
        </CardHeader>
        <CardContent>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                            <Input placeholder="Your Name" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
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
                        <FormLabel>Password</FormLabel>
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
                    <Button type="submit" className="w-full">Create Account</Button>
                </form>
            </Form>
            <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <Link href="/login" className="underline">
                    Sign in
                </Link>
            </div>
        </CardContent>
    </Card>
  )
}
