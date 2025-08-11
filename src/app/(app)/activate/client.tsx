
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
import { KeyRound, Send, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";

const activationSchema = z.object({
  activationKey: z.string().min(1, { message: "Activation key is required." }),
});

export default function ActivateClient() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, appUser } = useAuth();
  const [adminNames, setAdminNames] = useState<string[]>([]);
  
  useEffect(() => {
    const fetchAdmins = async () => {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("isAdmin", "==", true));
        const querySnapshot = await getDocs(q);
        const names = querySnapshot.docs.map(doc => doc.data().name);
        setAdminNames(names);
    };
    fetchAdmins();
  }, []);

  const form = useForm<z.infer<typeof activationSchema>>({
    resolver: zodResolver(activationSchema),
    defaultValues: {
      activationKey: "",
    },
  });

  const handleActivation = async (data: z.infer<typeof activationSchema>) => {
    if (!user || !user.email) {
        toast({ title: "Activation Error", description: "Could not find your user information. Please log in again.", variant: "destructive" });
        router.push("/login");
        return;
    }
    
    const storedKeyData = localStorage.getItem(`activation_key_${user.email.toLowerCase()}`);
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
            toast({ title: "Activation Key Expired", description: "This key has expired. Please request a new one from an admin.", variant: "destructive" });
            localStorage.removeItem(`activation_key_${user.email.toLowerCase()}`);
            return;
        }

        // Update user in Firestore
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
            isActivated: true,
            activationExpires: expires,
        });

        toast({ title: "Account Activated!", description: "Welcome! Redirecting you to the dashboard..." });
        localStorage.removeItem(`activation_key_${user.email.toLowerCase()}`); // Key has been used
        
        window.location.href = '/dashboard';

    } catch(e) {
        console.error("Activation Error: ", e);
        toast({ title: "Activation Failed", description: "An unexpected error occurred while validating your key.", variant: "destructive" });
    }
  };

  const handleRequestKey = () => {
    const userEmail = user?.email || "your email";
    console.log(`Simulating activation key request for ${userEmail}`);
    toast({
        title: "Request Sent!",
        description: `Your request for an activation key has been sent to the administrators.`,
    });
  }
  
  if (appUser?.isActivated) {
    return (
        <div className="flex flex-col items-center justify-center text-center">
             <h1 className="text-3xl font-bold font-headline">Account Already Active</h1>
                <p className="text-muted-foreground mt-2">
                    Your account is already activated. Redirecting you to the dashboard...
                </p>
        </div>
    )
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
