
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, LibraryBig, PlusSquare, Settings, BarChart2, BookOpen, LogOut, ShieldCheck, AlertCircle, ChevronsUpDown, Loader2 } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import Logo from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { runAutoPilot } from "@/lib/video-store";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";


export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { toast } = useToast();
    const { user, appUser, isAdmin, isActivated, isLoading } = useAuth();
    
    const [channelName, setChannelName] = React.useState("AutoTube AI");
    const [channelLogoUrl, setChannelLogoUrl] = React.useState<string | null>(null);
    
    React.useEffect(() => {
        const name = localStorage.getItem("youtube_channel_name");
        const logoUrl = localStorage.getItem("youtube_channel_logo_url");
        if (name) setChannelName(name);
        if (logoUrl) setChannelLogoUrl(logoUrl);
    }, [user]);

    React.useEffect(() => {
        if (!isLoading && !user && pathname !== '/login' && pathname !== '/signup') {
            router.replace('/login');
        } else if (!isLoading && user && !isActivated && pathname !== '/activate') {
            const allowedPaths = ['/settings', '/guides/youtube-api'];
            if (isAdmin && allowedPaths.includes(pathname)) {
                // allow admin to access settings and guides
            } else if (!isAdmin) {
                router.replace('/activate');
            }
        }
    }, [isLoading, user, isActivated, isAdmin, pathname, router]);

    React.useEffect(() => {
        if (!user) return;
        // --- Autonomous Inactivity Check ---
        const autonomousEnabled = localStorage.getItem("autonomous_mode_enabled") === "true";
        const channelId = localStorage.getItem("youtube_channel_id");
        const lastSeen = localStorage.getItem(`last_seen_${user.uid}`);
        const now = new Date().getTime();
        
        if (autonomousEnabled && channelId && lastSeen) {
            const twoDaysInMillis = 2 * 24 * 60 * 60 * 1000;
            if (now - parseInt(lastSeen, 10) > twoDaysInMillis) {
                (async () => {
                    console.log("User inactive for over 2 days. Triggering autonomous mode.");
                    toast({ title: "Autonomous Mode Activated", description: "Creating content due to inactivity."});
                    try {
                        await runAutoPilot(user.uid, 'long');
                        await runAutoPilot(user.uid, 'short');
                        toast({ title: "Autonomous Run Complete", description: "New content has been generated."});
                    } catch (e) {
                        toast({ title: "Autonomous Run Failed", description: "Could not generate content.", variant: "destructive"});
                        console.error("Autonomous run failed", e);
                    }
                })();
            }
        }
        localStorage.setItem(`last_seen_${user.uid}`, now.toString());
         // --- End Autonomous Inactivity Check ---
    }, [user, toast]);

    const handleLogout = async () => {
      try {
        await signOut(auth);
        // Clear local storage related to the specific channel
        localStorage.removeItem("youtube_channel_name");
        localStorage.removeItem("youtube_channel_logo_url");
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push('/login');
      } catch (error) {
        toast({ title: "Logout Failed", description: "Could not log you out. Please try again.", variant: "destructive" });
      }
    };
    
    const menuItems = [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/content", label: "Content", icon: LibraryBig },
      { href: "/create", label: "Create", icon: PlusSquare },
      { href: "/analytics", label: "Analytics", icon: BarChart2 },
    ];
    
    if (isAdmin) {
        menuItems.push({ href: "/admin", label: "Admin", icon: ShieldCheck });
    }
    
    menuItems.push({ href: "/guides/youtube-api", label: "Guides", icon: BookOpen });
    menuItems.push({ href: "/settings", label: "Settings", icon: Settings });
    
    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!user && (pathname !== '/login' && pathname !== '/signup')) {
        return null; 
    }

    if (pathname === '/login' || pathname === '/signup') {
      return <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background/90">{children}</main>
    }
    
    const coreLayout = (
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader>
                <div className="flex items-center gap-2">
                    <Logo className="w-8 h-8 text-primary" />
                    <h1 className="text-xl font-semibold font-headline text-sidebar-foreground">
                    AutoTubeAI
                    </h1>
                </div>
                </SidebarHeader>
                <SidebarContent>
                <SidebarMenu>
                    {menuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                        <Link href={item.href}>
                        <SidebarMenuButton
                            isActive={pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/')}
                            tooltip={item.label}
                        >
                            <item.icon />
                            <span>{item.label}</span>
                        </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    ))}
                </SidebarMenu>
                </SidebarContent>
                <SidebarFooter>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start gap-3 p-2 h-auto">
                                <Avatar className="h-9 w-9">
                                {channelLogoUrl && <AvatarImage src={channelLogoUrl} alt={channelName} />}
                                <AvatarFallback>{appUser?.name?.charAt(0) || 'A'}</AvatarFallback>
                                </Avatar>
                                <div className="overflow-hidden flex-1 text-left">
                                    <p className="font-medium truncate text-sidebar-foreground">{appUser?.name || channelName}</p>
                                    <p className="text-xs text-sidebar-foreground/70 truncate">{appUser?.email}</p>
                                </div>
                                <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/70" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64 mb-2 ml-2" side="top" align="start">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log Out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset>
                <header className="flex items-center justify-between p-4 border-b">
                    <SidebarTrigger />
                </header>
                <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background/90">
                    {!isActivated && pathname !== '/activate' && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Account Not Activated</AlertTitle>
                            <AlertDescription>
                                Your account is not activated. You can explore the application, but all creation and editing features are disabled. Please go to the <Link href="/activate" className="font-semibold underline">Activation Page</Link> to enable full functionality.
                            </AlertDescription>
                        </Alert>
                    )}
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
    
    return coreLayout;
}
