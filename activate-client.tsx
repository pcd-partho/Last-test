
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/logo";
import { KeyRound, Send, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const activationSchema = z.object({
  activationKey: z.string().min(1, { message: "Activation key is required." }),
});

const initialAdminEmails = ['deypartho569@gmail.com', 'Pdey02485@gmail.com'];

export default function ActivateClient() {
  const { toast } = useToast();
  const router = useRouter();
  const [adminNames, setAdminNames] = useState<string[]>([]);
  
  useEffect(() => {
    // In a real app, this would be fetched from a secure backend.
    const storedAdminEmailsJSON = localStorage.getItem("admin_emails");
    const storedAdminEmails = storedAdminEmailsJSON ? JSON.parse(storedAdminEmailsJSON) : [];
    const allAdminEmails = [...new Set([...initialAdminEmails, ...storedAdminEmails])];
    
    if (allAdminEmails) {
      const names = allAdminEmails.map((email: string) => {
        const authData = localStorage.getItem(`user_auth_${email}`);
        return authData ? JSON.parse(authData).name : email.split('@')[0];
      }).filter(Boolean);
      setAdminNames(names);
    }
  }, []);

  const form = useForm<z.infer<typeof activationSchema>>({
    resolver: zodResolver(activationSchema),
    defaultValues: {
      activationKey: "",
    },
  });

  const handleActivation = (data: z.infer<typeof activationSchema>) => {
    const userEmail = localStorage.getItem("user_email");
    if (!userEmail) {
        toast({ title: "Activation Error", description: "Could not find your email. Please log in again.", variant: "destructive" });
        router.push("/login");
        return;
    }
    
    const storedKeyData = localStorage.getItem(`activation_key_${userEmail}`);
    if (!storedKeyData) {
        toast({ title: "Invalid Activation Key", description: "The key provided is not valid for your account.", variant: "destructive" });
        return;
    }

    try {
        const { key, expires } = JSON.parse(storedKeyData);
        if (key !== data.activationKey) {
            toast({ title: "Invalid Activation Key", description: "The provided key is incorrect.", variant: "destructive" });
            return;
        }
        if (expires && new Date().getTime() > expires) {
            toast({ title: "Activation Key Expired", description: "This key has expired. Please request a new one from the owner.", variant: "destructive" });
            localStorage.removeItem(`activation_key_${userEmail}`); // Clean up expired key
            return;
        }

        // Success!
        toast({ title: "Account Activated!", description: "Welcome! Redirecting you to the dashboard..." });
        localStorage.setItem(`user_activated_${userEmail}`, "true");
        // Store key status with expiration to be checked on layout load
        localStorage.setItem(`activation_key_status_${userEmail}`, JSON.stringify({ expires })); 
        localStorage.removeItem(`activation_key_${userEmail}`); // Key has been used
        
        // Use a reload to ensure the layout state is fully refreshed
        window.location.href = '/dashboard';

    } catch(e) {
        toast({ title: "Activation Failed", description: "An unexpected error occurred while validating your key.", variant: "destructive" });
    }
  };

  const handleRequestKey = () => {
    const userEmail = localStorage.getItem("user_email") || "your email";
    console.log(`Simulating activation key request for ${userEmail}`);
    toast({
        title: "Request Sent!",
        description: `Your request for an activation key has been sent to the admin.`,
    });
  }

  return (
    <div className="flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold font-headline">Activate Your Account</h1>
                <p className="text-muted-foreground mt-2">
                    Enter the activation key provided by an administrator to get access.
                </p>
            </div>
            
            <Card>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleActivation)}>
                        <CardContent className="p-6 space-y-4">
                            <FormField
                                control={form.control}
                                name="activationKey"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Activation Key</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter your key" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full">
                                <KeyRound className="mr-2 h-4 w-4" />
                                Activate
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>

            {adminNames.length > 0 && (
                <Alert>
                    <Users className="h-4 w-4" />
                    <AlertTitle>Need a key?</AlertTitle>
                    <AlertDescription>
                        Contact one of the administrators to request an activation key: <span className="font-semibold">{adminNames.join(", ")}</span>.
                    </AlertDescription>
                </Alert>
            )}

            <div className="text-center text-sm text-muted-foreground">
                <Dialog>
                    <DialogTrigger asChild>
                         <button className="underline hover:text-primary">Or click here to send a request.</button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Request Activation Key</DialogTitle>
                            <DialogDescription>
                                This will send a notification to the application administrator to generate an activation key for your account. You will receive the key via the email you used to sign up.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                             <DialogTrigger asChild>
                                <Button onClick={handleRequestKey}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Send Request
                                </Button>
                             </DialogTrigger>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    </div>
  );
}
