
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, LibraryBig, PlusSquare, Settings, BarChart2, BookOpen, LogOut, ShieldCheck, AlertCircle, ChevronsUpDown } from "lucide-react";
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

const initialAdminEmails = ['deypartho569@gmail.com', 'Pdey02485@gmail.com'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { toast } = useToast();
    const [channelName, setChannelName] = React.useState("AutoTube AI");
    const [channelLogoUrl, setChannelLogoUrl] = React.useState<string | null>(null);
    const [isActivated, setIsActivated] = React.useState(false);
    const [isAdmin, setIsAdmin] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [userEmail, setUserEmail] = React.useState<string | null>(null);

    React.useEffect(() => {
        const email = localStorage.getItem("user_email");
        setUserEmail(email);

        const name = localStorage.getItem("youtube_channel_name");
        const logoUrl = localStorage.getItem("youtube_channel_logo_url");
        if (name) {
            setChannelName(name);
        }
        if (logoUrl) {
            setChannelLogoUrl(logoUrl);
        }
        
        const storedAdmins = localStorage.getItem("admin_emails");
        const adminEmails = storedAdmins ? JSON.parse(storedAdmins) : initialAdminEmails;


        const adminUser = email ? adminEmails.includes(email) : false;
        setIsAdmin(adminUser);

        if (email && !adminUser) {
            const keyData = localStorage.getItem(`activation_key_status_${email}`);
            if (keyData) {
                try {
                    const { expires } = JSON.parse(keyData);
                    if (expires && new Date().getTime() > expires) {
                        localStorage.removeItem(`user_activated_${email}`);
                        localStorage.removeItem(`activation_key_status_${email}`);
                        setIsActivated(false);
                    } else {
                        setIsActivated(true);
                    }
                } catch(e) {
                    setIsActivated(false);
                }
            } else {
                const legacyActivated = localStorage.getItem(`user_activated_${email}`) === 'true';
                setIsActivated(legacyActivated);
            }
        } else if (adminUser) {
            setIsActivated(true);
        }


        setIsLoading(false);
        
        if (!email && pathname !== '/login' && pathname !== '/signup') {
            router.replace('/login');
        }

        // --- Autonomous Inactivity Check ---
        const autonomousEnabled = localStorage.getItem("autonomous_mode_enabled") === "true";
        const channelId = localStorage.getItem("youtube_channel_id");
        const lastSeen = localStorage.getItem("last_seen_timestamp");
        const now = new Date().getTime();
        
        if (autonomousEnabled && channelId && lastSeen) {
            const twoDaysInMillis = 2 * 24 * 60 * 60 * 1000;
            if (now - parseInt(lastSeen, 10) > twoDaysInMillis) {
                (async () => {
                    console.log("User inactive for over 2 days. Triggering autonomous mode.");
                    toast({ title: "Autonomous Mode Activated", description: "Creating content due to inactivity."});
                    try {
                        await runAutoPilot('long');
                        await runAutoPilot('short');
                        toast({ title: "Autonomous Run Complete", description: "New content has been generated."});
                    } catch (e) {
                        toast({ title: "Autonomous Run Failed", description: "Could not generate content.", variant: "destructive"});
                        console.error("Autonomous run failed", e);
                    }
                })();
            }
        }
        localStorage.setItem("last_seen_timestamp", now.toString());
        // --- End Autonomous Inactivity Check ---


    }, [router, pathname, toast]);

    const handleLogout = () => {
      localStorage.removeItem("user_email");
      router.push('/login');
    };
    
    const handleSwitchAccount = () => {
        router.push('/login');
    }

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
            <div className="flex min-h-screen items-center justify-center">
                <p>Loading...</p>
            </div>
        );
    }
    
    if (!userEmail) {
        return null; 
    }

    if (pathname === '/login' || pathname === '/signup') {
      return <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background/90">{children}</main>
    }
    
    if (pathname === '/activate') {
        return (
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
                                    <AvatarFallback>{channelName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="overflow-hidden flex-1 text-left">
                                        <p className="font-medium truncate text-sidebar-foreground">{channelName}</p>
                                        <p className="text-xs text-sidebar-foreground/70 truncate">{userEmail}</p>
                                    </div>
                                    <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/70" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-64 mb-2 ml-2" side="top" align="start">
                                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleSwitchAccount}>
                                    Switch Account
                                </DropdownMenuItem>
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
                        {children}
                    </main>
                </SidebarInset>
            </SidebarProvider>
        )
    }
    
    return (
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
                              <AvatarFallback>{channelName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="overflow-hidden flex-1 text-left">
                                <p className="font-medium truncate text-sidebar-foreground">{channelName}</p>
                                <p className="text-xs text-sidebar-foreground/70 truncate">{userEmail}</p>
                            </div>
                            <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/70" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 mb-2 ml-2" side="top" align="start">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSwitchAccount}>
                            Switch Account
                        </DropdownMenuItem>
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
                {!isAdmin && !isActivated && pathname !== '/activate' && (
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
}
