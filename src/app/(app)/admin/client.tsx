
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Copy, UserPlus, Trash2, UserCog } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, AppUser } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

const generateKeySchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  expiresIn: z.string().default("7"), // Default to 7 days
  customExpiresIn: z.string().optional(),
}).refine((data) => {
    if (data.expiresIn === 'custom') {
        return !!data.customExpiresIn && !isNaN(parseInt(data.customExpiresIn, 10));
    }
    return true;
}, {
    message: "Please enter a valid number of days.",
    path: ['customExpiresIn'],
});

const adminManagementSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email to add as an admin." }),
});

const initialAdminEmails = ['deypartho569@gmail.com', 'Pdey02485@gmail.com'];

export default function AdminClient() {
  const { toast } = useToast();
  const { appUser: currentAppUser } = useAuth();
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generatedForEmail, setGeneratedForEmail] = useState<string | null>(null);
  const [admins, setAdmins] = useState<AppUser[]>([]);
  
  const fetchAdmins = async () => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("isAdmin", "==", true));
    const querySnapshot = await getDocs(q);
    const adminList = querySnapshot.docs.map(doc => doc.data() as AppUser);
    setAdmins(adminList);
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const activationKeyForm = useForm<z.infer<typeof generateKeySchema>>({
    resolver: zodResolver(generateKeySchema),
    defaultValues: { email: "", expiresIn: "7" },
  });

  const adminManagementForm = useForm<z.infer<typeof adminManagementSchema>>({
    resolver: zodResolver(adminManagementSchema),
    defaultValues: { email: "" },
  });

  const watchExpiresIn = activationKeyForm.watch("expiresIn");

  const handleGenerateActivationKey = async (data: z.infer<typeof generateKeySchema>) => {
    const newKey = `key_${Math.random().toString(36).substring(2, 15)}`;
    let days: number | null;

    if (data.expiresIn === 'custom') {
        days = data.customExpiresIn ? parseInt(data.customExpiresIn, 10) : 0;
    } else {
        days = parseInt(data.expiresIn, 10);
    }
    
    const expirationTime = (days !== null && days > 0) ? new Date().getTime() + days * 24 * 60 * 60 * 1000 : null;

    try {
      // For this prototype, we'll still use localStorage for the key itself for simplicity of transfer,
      // but in a real app, you'd email this key or show it once to the admin.
      localStorage.setItem(`activation_key_${data.email.toLowerCase()}`, JSON.stringify({ key: newKey, expires: expirationTime }));
      setGeneratedKey(newKey);
      setGeneratedForEmail(data.email);
      toast({
        title: "Key Generated",
        description: `Share this key with ${data.email}.`,
      });
      activationKeyForm.reset();
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Could not generate the activation key.",
        variant: "destructive",
      });
    }
  };

  const handleAddAdmin = async (data: z.infer<typeof adminManagementSchema>) => {
    const newAdminEmail = data.email.toLowerCase();
    if (admins.some(admin => admin.email === newAdminEmail)) {
      toast({ title: "Admin Exists", description: "This user is already an administrator.", variant: "destructive" });
      return;
    }
    
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", newAdminEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        toast({ title: "User Not Found", description: "This user has not signed up yet. Please ask them to create an account first.", variant: "destructive" });
        return;
    }

    const userDoc = querySnapshot.docs[0];
    await updateDoc(userDoc.ref, { isAdmin: true, isActivated: true });
    
    toast({ title: "Admin Added", description: `${userDoc.data().name} has been added as an administrator.` });
    fetchAdmins(); // Refresh admin list
    adminManagementForm.reset();
  };

  const handleRemoveAdmin = async (emailToRemove: string) => {
    const lowercasedEmail = emailToRemove.toLowerCase();
    if (initialAdminEmails.includes(lowercasedEmail)) {
      toast({ title: "Cannot Remove Owner", description: "The original owner accounts cannot be removed.", variant: "destructive" });
      return;
    }
    
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", lowercasedEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        toast({ title: "User not found", variant: "destructive" });
        return;
    }

    const userDoc = querySnapshot.docs[0];
    await updateDoc(userDoc.ref, { isAdmin: false });

    toast({ title: "Admin Removed", description: `The administrator has been removed.` });
    fetchAdmins(); // Refresh admin list
  };


  const copyToClipboard = (key: string | null) => {
    if (key) {
      navigator.clipboard.writeText(key);
      toast({ title: "Copied to Clipboard!", description: "The key has been copied." });
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-headline">Admin Panel</h1>
        <p className="text-muted-foreground mt-2">
          Manage user access and application settings.
        </p>
      </div>
      
       <Alert variant="destructive">
            <UserCog className="h-4 w-4" />
            <AlertTitle>Security & Data Management</AlertTitle>
            <AlertDescription>
              Administrator and user data is now managed in Firebase Firestore. Activation keys are temporarily stored in local storage for simplicity in this prototype. In a production app, keys should be sent directly to users (e.g., via email).
            </AlertDescription>
        </Alert>
        
      <Card>
        <CardHeader>
          <CardTitle>Generate User Activation Key</CardTitle>
          <CardDescription>
            Generate a key for a new user to activate their account.
          </CardDescription>
        </CardHeader>
        <Form {...activationKeyForm}>
            <form onSubmit={activationKeyForm.handleSubmit(handleGenerateActivationKey)}>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4 items-end">
                      <FormField
                          control={activationKeyForm.control}
                          name="email"
                          render={({ field }) => (
                              <FormItem>
                              <Label>New User's Email</Label>
                              <FormControl>
                                  <Input type="email" placeholder="new.user@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                      />
                      <FormField
                          control={activationKeyForm.control}
                          name="expiresIn"
                          render={({ field }) => (
                              <FormItem>
                                  <Label>Key Expires In</Label>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select an expiration duration" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="7">7 Days</SelectItem>
                                      <SelectItem value="30">30 Days</SelectItem>
                                      <SelectItem value="custom">Custom</SelectItem>
                                      <SelectItem value="0">Never</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                       {watchExpiresIn === 'custom' && (
                            <FormField
                                control={activationKeyForm.control}
                                name="customExpiresIn"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Custom Duration (in days)</Label>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 45" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>
                     {generatedKey && generatedForEmail && (
                        <Alert className="mt-4">
                            <KeyRound className="h-4 w-4" />
                            <AlertTitle>Activation Key Generated for {generatedForEmail}</AlertTitle>
                            <AlertDescription className="flex items-center justify-between mt-2">
                                <code className="bg-muted font-mono p-2 rounded-md">{generatedKey}</code>
                                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(generatedKey)}>
                                    <Copy className="h-4 w-4" />
                                    <span className="sr-only">Copy key</span>
                                </Button>
                            </AlertDescription>
                            <AlertDescription className="mt-2 text-xs text-muted-foreground">
                                Share this key with the user. It is valid for the selected duration and can only be used once.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
                <CardFooter className="border-t pt-6">
                    <Button type="submit">
                        <KeyRound className="mr-2 h-4 w-4" />
                        Generate Activation Key
                    </Button>
                </CardFooter>
            </form>
        </Form>
      </Card>
      
      <Separator />

      <Card>
          <CardHeader>
            <CardTitle>Manage Administrators</CardTitle>
            <CardDescription>
              Add or remove users with administrator privileges.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label>Current Admins</Label>
                <div className="space-y-2 rounded-md border p-3">
                   {admins.map(admin => (
                       <div key={admin.uid} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{admin.name}</span>
                                {currentAppUser?.isAdmin && <span className="text-sm text-muted-foreground">({admin.email})</span>}
                                {initialAdminEmails.includes(admin.email?.toLowerCase() || '') && <Badge variant="secondary">Owner</Badge>}
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveAdmin(admin.email || '')} disabled={initialAdminEmails.includes(admin.email?.toLowerCase() || '') || !currentAppUser?.isAdmin}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Remove {admin.name}</span>
                            </Button>
                       </div>
                   ))}
                </div>
            </div>
             {currentAppUser?.isAdmin && (
                <Form {...adminManagementForm}>
                    <form onSubmit={adminManagementForm.handleSubmit(handleAddAdmin)} className="flex items-end gap-2">
                        <FormField
                            control={adminManagementForm.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <Label>Add New Admin (by Email)</Label>
                                    <FormControl>
                                        <Input type="email" placeholder="admin@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add Admin
                        </Button>
                    </form>
                </Form>
             )}
          </CardContent>
      </Card>
    </div>
  );
}
