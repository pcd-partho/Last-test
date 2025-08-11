
"use client";

import { BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { DollarSign, Users, Video, View, CheckCircle, Bot, ShieldOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";


const chartData = [
  { month: "January", views: 186, revenue: 80 },
  { month: "February", views: 305, revenue: 200 },
  { month: "March", views: 237, revenue: 120 },
  { month: "April", views: 73, revenue: 190 },
  { month: "May", views: 209, revenue: 130 },
  { month: "June", views: 214, revenue: 140 },
];

const contentPerformanceData = [
    { name: 'AI Unmasked', views: 4500, likes: 210, comments: 45 },
    { name: 'Future of Code', views: 5200, likes: 320, comments: 60 },
    { name: 'Robotics Today', views: 3100, likes: 150, comments: 30 },
    { name: 'Neural Networks', views: 6800, likes: 450, comments: 85 },
    { name: 'The AI Revolution', views: 7500, likes: 500, comments: 120 },
];


const chartConfig = {
  views: {
    label: "Views",
    color: "hsl(var(--primary))",
  },
  revenue: {
    label: "Revenue",
    color: "hsl(var(--accent))",
  },
  likes: {
      label: "Likes",
      color: "hsl(var(--primary))",
  },
    comments: {
        label: "Comments",
        color: "hsl(var(--secondary))",
    },
};

export default function DashboardClient() {
  const { appUser, isActivated, isAdmin } = useAuth();
  const [activationTimeLeft, setActivationTimeLeft] = useState<string | null>(null);
  const [isAutonomousMode, setIsAutonomousMode] = useState(false);

  useEffect(() => {
      if (appUser && appUser.isActivated && !appUser.isAdmin) {
          if (appUser.activationExpires) {
            setActivationTimeLeft(formatDistanceToNow(new Date(appUser.activationExpires), { addSuffix: true }));
          } else {
            setActivationTimeLeft("Never expires");
          }
      }
      
      const autonomousEnabled = localStorage.getItem("autonomous_mode_enabled") === "true";
      setIsAutonomousMode(autonomousEnabled);

  }, [appUser]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
      </div>

      {!isAdmin && isActivated && activationTimeLeft && (
          <Alert variant="default" className="bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>Account is Active</AlertTitle>
              <AlertDescription>
                  Your access is valid. It expires {activationTimeLeft}.
              </AlertDescription>
          </Alert>
      )}
      
      {isAutonomousMode ? (
          <Alert>
              <Bot className="h-4 w-4" />
              <AlertTitle>Autonomous Mode is On</AlertTitle>
              <AlertDescription>
                  The AI is configured to automatically generate content if you are inactive. You can manage this in <Link href="/settings" className="font-semibold underline">Settings</Link>.
              </AlertDescription>
          </Alert>
      ) : (
          <Alert variant="default" className="bg-muted/50 border-muted-foreground/20">
              <ShieldOff className="h-4 w-4 text-muted-foreground" />
              <AlertTitle>Autonomous Mode is Off</AlertTitle>
              <AlertDescription>
                 The AI will not automatically generate content for you. You can enable this feature in <Link href="/settings" className="font-semibold underline">Settings</Link>.
              </AlertDescription>
          </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">124</div>
            <p className="text-xs text-muted-foreground">+10% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <View className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.2M</div>
            <p className="text-xs text-muted-foreground">+22% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2350</div>
            <p className="text-xs text-muted-foreground">+180.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$4,231.89</div>
            <p className="text-xs text-muted-foreground">+19% from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Views & Revenue Over Time</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <LineChart data={chartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Line dataKey="views" type="monotone" stroke="var(--color-views)" strokeWidth={2} dot={false} />
                        <Line dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Content Performance</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={contentPerformanceData} accessibilityLayer>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="views" fill="var(--color-views)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
