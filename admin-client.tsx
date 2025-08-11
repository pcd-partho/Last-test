
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

type Admin = {
    email: string;
    name: string;
    isOwner: boolean;
};

const initialAdminEmails = ['deypartho569@gmail.com', 'Pdey02485@gmail.com'];

export default function AdminClient() {
  const { toast } = useToast();
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generatedForEmail, setGeneratedForEmail] = useState<string | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  
  useEffect(() => {
    // In a real app, this would be fetched from a secure backend.
    const currentUserEmail = localStorage.getItem("user_email");
    if(currentUserEmail && initialAdminEmails.includes(currentUserEmail)) {
        setIsMainAdmin(true);
    }
    
    const storedAdminEmails = JSON.parse(localStorage.getItem("admin_emails") || "[]");
    const allAdminEmails = [...new Set([...initialAdminEmails, ...storedAdminEmails])];
    
    const adminDetails: Admin[] = allAdminEmails.map((email: string) => {
        const authData = localStorage.getItem(`user_auth_${email}`);
        const name = authData ? JSON.parse(authData).name : email.split('@')[0];
        return {
            email,
            name,
            isOwner: initialAdminEmails.includes(email),
        }
    });

    setAdmins(adminDetails);

    if (!localStorage.getItem("admin_emails")) {
        localStorage.setItem("admin_emails", JSON.stringify(initialAdminEmails));
    }
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

  const handleGenerateActivationKey = (data: z.infer<typeof generateKeySchema>) => {
    const newKey = `key_${Math.random().toString(36).substring(2, 15)}`;
    let days: number | null;

    if (data.expiresIn === 'custom') {
        days = data.customExpiresIn ? parseInt(data.customExpiresIn, 10) : 0;
    } else {
        days = parseInt(data.expiresIn, 10);
    }
    
    const expirationTime = (days !== null && days > 0) ? new Date().getTime() + days * 24 * 60 * 60 * 1000 : null; // null for 'Never' or 0 days

    try {
      localStorage.setItem(`activation_key_${data.email}`, JSON.stringify({ key: newKey, expires: expirationTime }));
      setGeneratedKey(newKey);
      setGeneratedForEmail(data.email);
      toast({
        title: "Key Generated",
        description: `A new activation key has been generated for ${data.email}.`,
      });
      activationKeyForm.reset();
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Could not save the activation key.",
        variant: "destructive",
      });
    }
  };

  const handleAddAdmin = (data: z.infer<typeof adminManagementSchema>) => {
    const newAdminEmail = data.email.toLowerCase();
    if (admins.some(admin => admin.email === newAdminEmail)) {
      toast({ title: "Admin Exists", description: "This user is already an administrator.", variant: "destructive" });
      return;
    }
    
    const authData = localStorage.getItem(`user_auth_${newAdminEmail}`);
    if (!authData) {
        toast({ title: "User Not Found", description: "This user has not signed up yet. Please ask them to create an account first.", variant: "destructive" });
        return;
    }

    const updatedAdminEmails = [...admins.map(a => a.email), newAdminEmail];
    localStorage.setItem("admin_emails", JSON.stringify(updatedAdminEmails));

    const name = JSON.parse(authData).name || newAdminEmail.split('@')[0];
    const newAdmin = { email: newAdminEmail, name, isOwner: false };
    setAdmins(prev => [...prev, newAdmin]);
    
    toast({ title: "Admin Added", description: `${name} has been added as an administrator.` });
    adminManagementForm.reset();
  };

  const handleRemoveAdmin = (emailToRemove: string) => {
    if (initialAdminEmails.includes(emailToRemove)) {
      toast({ title: "Cannot Remove Owner", description: "The original owner accounts cannot be removed.", variant: "destructive" });
      return;
    }
    const updatedAdmins = admins.filter(admin => admin.email !== emailToRemove);
    const updatedAdminEmails = updatedAdmins.map(admin => admin.email);
    localStorage.setItem("admin_emails", JSON.stringify(updatedAdminEmails));
    setAdmins(updatedAdmins);
    toast({ title: "Admin Removed", description: `The administrator has been removed.` });
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
            <AlertTitle>Simulation Notice</AlertTitle>
            <AlertDescription>
              Administrator management is simulated using browser storage. In a production environment, this data must be managed by a secure backend database to ensure security and persistence.
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
                       <div key={admin.email} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{admin.name}</span>
                                {isMainAdmin && <span className="text-sm text-muted-foreground">({admin.email})</span>}
                                {admin.isOwner && <Badge variant="secondary">Owner</Badge>}
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveAdmin(admin.email)} disabled={admin.isOwner || !isMainAdmin}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Remove {admin.name}</span>
                            </Button>
                       </div>
                   ))}
                </div>
            </div>
             {isMainAdmin && (
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
