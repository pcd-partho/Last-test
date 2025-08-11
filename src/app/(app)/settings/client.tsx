
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Youtube, AlertCircle, CheckCircle, ShieldAlert, Bot } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"


const youtubeSchema = z.object({
  apiKey: z.string().optional(),
  channelId: z.string().optional(),
})

const monetizationSchema = z.object({
  skippableAds: z.boolean().default(true),
  nonSkippableAds: z.boolean().default(false),
  displayAds: z.boolean().default(true),
  overlayAds: z.boolean().default(true),
})

const autonomousSchema = z.object({
    enabled: z.boolean().default(false),
});


export default function SettingsClient() {
  const { toast } = useToast()
  const { isActivated } = useAuth();
  const [connectedChannelId, setConnectedChannelId] = useState<string | null>(null);

  const youtubeForm = useForm<z.infer<typeof youtubeSchema>>({
    resolver: zodResolver(youtubeSchema),
    defaultValues: {
      apiKey: "",
      channelId: "",
    },
  })

  const monetizationForm = useForm<z.infer<typeof monetizationSchema>>({
    resolver: zodResolver(monetizationSchema),
    defaultValues: {
      skippableAds: true,
      nonSkippableAds: false,
      displayAds: true,
      overlayAds: true,
    },
  })

  const autonomousForm = useForm<z.infer<typeof autonomousSchema>>({
    resolver: zodResolver(autonomousSchema),
    defaultValues: {
        enabled: false,
    }
  });


  useEffect(() => {
    const apiKey = localStorage.getItem("youtube_api_key");
    const channelId = localStorage.getItem("youtube_channel_id");
    const autonomousEnabled = localStorage.getItem("autonomous_mode_enabled") === "true";
    
    if (apiKey) {
      youtubeForm.setValue("apiKey", apiKey);
    }
    if (channelId) {
      youtubeForm.setValue("channelId", channelId);
      setConnectedChannelId(channelId);
    }
    autonomousForm.setValue("enabled", autonomousEnabled);
  }, [youtubeForm, autonomousForm]);
  

  function onYouTubeSubmit(data: z.infer<typeof youtubeSchema>) {
    if (data.apiKey) localStorage.setItem("youtube_api_key", data.apiKey);
    else localStorage.removeItem("youtube_api_key");
    
    if (data.channelId) {
      localStorage.setItem("youtube_channel_id", data.channelId);
      const simulatedChannelName = "My AI Channel";
      const simulatedLogoUrl = `https://placehold.co/100x100.png`; 
      localStorage.setItem("youtube_channel_name", simulatedChannelName);
      localStorage.setItem("youtube_channel_logo_url", simulatedLogoUrl);
    } else {
      localStorage.removeItem("youtube_channel_id");
      localStorage.removeItem("youtube_channel_name");
      localStorage.removeItem("youtube_channel_logo_url");
    }

    toast({
      title: "Settings Saved",
      description: "Your YouTube settings have been successfully updated.",
    })
    
    setTimeout(() => { window.location.reload(); }, 300);
  }
  
  function onMonetizationSubmit(data: z.infer<typeof monetizationSchema>) {
    console.log(data)
    toast({
      title: "Settings Saved",
      description: "Your new monetization settings have been successfully saved.",
    })
  }
  
  function onAutonomousSubmit(data: z.infer<typeof autonomousSchema>) {
    localStorage.setItem("autonomous_mode_enabled", data.enabled.toString());
    toast({
        title: "Autonomous Mode Updated",
        description: `Autonomous operation has been ${data.enabled ? "enabled" : "disabled"}.`,
    })
  }


  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold font-headline">Settings</h1>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Need help getting your credentials?</AlertTitle>
          <AlertDescription>
            Check out our step-by-step <Link href="/guides/youtube-api" className="font-semibold underline">guide</Link> to get your YouTube API key and Channel ID.
          </AlertDescription>
        </Alert>
        
        {connectedChannelId && (
            <Alert variant="default" className="bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>YouTube Channel Connected</AlertTitle>
                <AlertDescription>
                    The application is successfully linked to Channel ID: <span className="font-semibold">{connectedChannelId}</span>
                </AlertDescription>
            </Alert>
        )}

        <Form {...youtubeForm}>
            <form onSubmit={youtubeForm.handleSubmit(onYouTubeSubmit)} className="space-y-8">
                <fieldset disabled={!isActivated}>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Youtube className="w-6 h-6 text-destructive" />
                                <CardTitle>YouTube Integration</CardTitle>
                            </div>
                            <CardDescription>
                            Connect your YouTube account to enable automatic uploads and analytics.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert variant="destructive">
                                <ShieldAlert className="h-4 w-4" />
                                <AlertTitle>API Key Security</AlertTitle>
                                <AlertDescription>
                                    For this project, your API key is stored in your browser's local storage for simplicity. In a real-world, public application, API keys must be stored securely on a server-side backend to prevent unauthorized access.
                                </AlertDescription>
                            </Alert>
                            <FormField
                            control={youtubeForm.control}
                            name="apiKey"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>YouTube API Key</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="Enter your YouTube API Key" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={youtubeForm.control}
                            name="channelId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>YouTube Channel ID</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter your YouTube Channel ID" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Specify the ID of the brand channel you want to upload videos to.
                                </FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </CardContent>
                        <CardFooter className="flex justify-end">
                            <Button type="submit">Save YouTube Settings</Button>
                        </CardFooter>
                    </Card>
                </fieldset>
            </form>
        </Form>

        <Form {...autonomousForm}>
            <form onSubmit={autonomousForm.handleSubmit(onAutonomousSubmit)} className="space-y-8">
                <fieldset disabled={!isActivated}>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Bot className="w-6 h-6" />
                                <CardTitle>Autonomous Mode</CardTitle>
                            </div>
                            <CardDescription>
                                Allow the AI to automatically create and upload content even when you are offline.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <Alert variant="destructive">
                                <ShieldAlert className="h-4 w-4" />
                                <AlertTitle>How Autonomous Mode Works</AlertTitle>
                                <AlertDescription>
                                   When enabled, this feature checks if you have been inactive for over two days. If so, it automatically runs the Auto-Pilot to generate new content. This check happens when the application loads. In a production environment, this would typically be handled by a scheduled job on a server (e.g., a Cron job).
                                </AlertDescription>
                            </Alert>
                            <FormField
                                control={autonomousForm.control}
                                name="enabled"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel>Enable Autonomous Operation</FormLabel>
                                            <FormDescription>
                                                The AI will follow the content schedule if you are inactive.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                         <CardFooter className="flex justify-end">
                            <Button type="submit">Save Autonomous Settings</Button>
                        </CardFooter>
                    </Card>
                </fieldset>
            </form>
        </Form>
        
        <Form {...monetizationForm}>
            <form onSubmit={monetizationForm.handleSubmit(onMonetizationSubmit)} className="space-y-8">
                 <fieldset disabled={!isActivated}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Monetization</CardTitle>
                            <CardDescription>
                            Manage how ads are displayed on your videos. These settings apply to new uploads.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={monetizationForm.control}
                                name="skippableAds"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Skippable video ads</FormLabel>
                                        <FormDescription>
                                        Allow viewers to skip ads after 5 seconds.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={monetizationForm.control}
                                name="nonSkippableAds"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Non-skippable video ads</FormLabel>
                                        <FormDescription>
                                        Short, non-skippable ads that play before your video.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={monetizationForm.control}
                                name="displayAds"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Display ads</FormLabel>
                                        <FormDescription>
                                            Appears to the right of the feature video and above the video suggestions list.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={monetizationForm.control}
                                name="overlayAds"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Overlay ads</FormLabel>
                                        <FormDescription>
                                            Semi-transparent ads that appear on the lower 20% portion of your video.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter className="flex justify-end">
                            <Button type="submit">Save Monetization Settings</Button>
                        </CardFooter>
                    </Card>
                </fieldset>
            </form>
        </Form>
    </div>
  )
}
