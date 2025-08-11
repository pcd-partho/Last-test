
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Wand2, Loader2, Feather } from "lucide-react";
import { getThisWeeksVideoCounts, getTodaysVideoCounts, runAutoPilot, createAndProcessVideo } from "@/lib/video-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const aiCreationSchema = z.object({
  topic: z.string().optional(),
  title: z.string().optional(),
  length: z.enum(['short', 'long']),
  inspirationUrl: z.string().url().optional().or(z.literal('')),
});

const ownScriptSchema = z.object({
  title: z.string().min(1, { message: "A title is required." }),
  script: z.string().min(10, { message: "Script must be at least 10 characters long." }),
  length: z.enum(['short', 'long']),
});


export default function CreateClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreatingLongs, setIsCreatingLongs] = useState(false);
  const [isCreatingShorts, setIsCreatingShorts] = useState(false);
  const [isManualCreating, setIsManualCreating] = useState(false);
  const [thisWeeksLongs, setThisWeeksLongs] = useState(0);
  const [todaysShorts, setTodaysShorts] = useState(0);
  const weeklyLongGoal = 2;
  const dailyShortGoal = 3;


  const aiForm = useForm<z.infer<typeof aiCreationSchema>>({
    resolver: zodResolver(aiCreationSchema),
    defaultValues: {
      length: "short",
      topic: "",
      title: "",
      inspirationUrl: "",
    },
  });

  const ownScriptForm = useForm<z.infer<typeof ownScriptSchema>>({
    resolver: zodResolver(ownScriptSchema),
    defaultValues: {
        title: "",
        script: "",
        length: "short"
    }
  });


  const updateRemainingCounts = async () => {
    const { longs } = await getThisWeeksVideoCounts();
    const { shorts } = await getTodaysVideoCounts();
    setThisWeeksLongs(longs);
    setTodaysShorts(shorts);
  };

  useEffect(() => {
    updateRemainingCounts();
  }, []);

  const handleAiSubmit = async (data: z.infer<typeof aiCreationSchema>) => {
    setIsManualCreating(true);
    try {
        const newTitle = await createAndProcessVideo(data.length, undefined, data.topic, data.title, data.inspirationUrl);
        toast({ title: "Specific Video Created!", description: `Your video "${newTitle}" is now being processed.`});
        updateRemainingCounts();
        aiForm.reset();
        router.push('/content');
    } catch (error) {
        console.error("Manual Creation Error:", error);
        toast({ title: "Creation Failed", description: "The AI failed to create the video.", variant: "destructive" });
    } finally {
        setIsManualCreating(false);
    }
  }

  const handleOwnScriptSubmit = async (data: z.infer<typeof ownScriptSchema>) => {
    setIsManualCreating(true);
    try {
        const newTitle = await createAndProcessVideo(data.length, undefined, "Custom Script", data.title, undefined, data.script);
        toast({ title: "Video from Script Created!", description: `Your video "${newTitle}" is now being processed.` });
        updateRemainingCounts();
        ownScriptForm.reset();
        router.push('/content');
    } catch(e) {
        console.error("Creation from script error", e);
        toast({ title: "Creation Failed", description: "The AI failed to create the video from your script.", variant: "destructive" });
    } finally {
        setIsManualCreating(false);
    }
  };
  
  const handleAutoCreateLongs = async () => {
    setIsCreatingLongs(true);
    toast({ title: "Auto-Pilot Engaged", description: "Your AI is now generating the week's long-form videos." });

    try {
        await runAutoPilot('long');
        toast({ title: "Long-Form Generation Complete!", description: "All long-form videos are being processed. Redirecting..." });
        setTimeout(() => router.push('/content'), 3000);
    } catch (error) {
        console.error("Auto-Pilot Error (Longs):", error);
        toast({ title: "Creation Failed", description: "The AI failed to create new long-form videos.", variant: "destructive" });
    } finally {
        setIsCreatingLongs(false);
        updateRemainingCounts();
    }
  };

  const handleAutoCreateShorts = async () => {
    setIsCreatingShorts(true);
    toast({ title: "Auto-Pilot Engaged", description: "Your AI is now generating the day's short videos." });

    try {
        await runAutoPilot('short');
        toast({ title: "Shorts Generation Complete!", description: "All short videos are being processed. Redirecting..." });
        setTimeout(() => router.push('/content'), 3000);
    } catch (error) {
        console.error("Auto-Pilot Error (Shorts):", error);
        toast({ title: "Creation Failed", description: "The AI failed to create new short videos.", variant: "destructive" });
    } finally {
        setIsCreatingShorts(false);
        updateRemainingCounts();
    }
  };


  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline text-center">Create Videos</h1>
        <p className="text-muted-foreground mt-2 text-center">Use the Auto-Pilot for your weekly schedule or create a specific video manually.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Auto-Pilot</CardTitle>
            <CardDescription>
              Let the AI automatically generate and schedule your content based on your strategy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="text-center space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Daily Shorts</p>
                    <div className="rounded-md border bg-muted/50 p-2">
                        <p className="text-2xl font-bold">{todaysShorts} / {dailyShortGoal}</p>
                        <p className="text-xs text-muted-foreground">created today</p>
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Weekly Long-Form Videos</p>
                    <div className="rounded-md border bg-muted/50 p-2">
                        <p className="text-2xl font-bold">{thisWeeksLongs} / {weeklyLongGoal}</p>
                        <p className="text-xs text-muted-foreground">created this week</p>
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-4">
              <Button onClick={handleAutoCreateShorts} disabled={isCreatingShorts || todaysShorts >= dailyShortGoal} size="lg" className="h-12 w-full text-base">
                  {isCreatingShorts ? (
                      <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Shorts...
                      </>
                  ) : (
                      <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Daily Shorts
                      </>
                  )}
              </Button>
              <Button onClick={handleAutoCreateLongs} disabled={isCreatingLongs || thisWeeksLongs >= weeklyLongGoal} size="lg" className="h-12 w-full text-base">
                  {isCreatingLongs ? (
                      <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Long-Form...
                      </>
                  ) : (
                      <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Weekly Long-Form
                      </>
                  )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
            <CardHeader>
                <CardTitle>Manual Creation</CardTitle>
                <CardDescription>
                    Create a single video with a specific topic, title, or your own script.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="ai-script">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="ai-script"><Wand2 className="mr-2 h-4 w-4" />AI-Generated Script</TabsTrigger>
                        <TabsTrigger value="own-script"><Feather className="mr-2 h-4 w-4" />Use Your Own Script</TabsTrigger>
                    </TabsList>
                    <TabsContent value="ai-script" className="pt-4">
                         <Form {...aiForm}>
                            <form onSubmit={aiForm.handleSubmit(handleAiSubmit)} className="space-y-6">
                                <fieldset>
                                    <FormField
                                        control={aiForm.control}
                                        name="length"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                            <FormLabel>Video Length</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex gap-4"
                                                >
                                                <FormItem className="flex items-center space-x-2">
                                                    <FormControl>
                                                    <RadioGroupItem value="short" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">Short</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2">
                                                    <FormControl>
                                                    <RadioGroupItem value="long" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">Long-Form</FormLabel>
                                                </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={aiForm.control}
                                        name="topic"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Topic (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., The Future of AI" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    A general topic if you want the AI to create the title.
                                                </FormDescription>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={aiForm.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Specific Title (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Top 5 AI Innovations of 2024" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    An exact title for the video.
                                                </FormDescription>
                                            </FormItem>
                                        )}
                                    />
                                    
                                    <FormField
                                        control={aiForm.control}
                                        name="inspirationUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Inspiration URL (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://www.youtube.com/watch?v=..." {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    Provide a YouTube video link to inspire the script's style.
                                                </FormDescription>
                                            </FormItem>
                                        )}
                                    />

                                    <Button type="submit" disabled={isManualCreating} className="w-full mt-6">
                                        {isManualCreating ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            "Create This Video"
                                        )}
                                    </Button>
                                </fieldset>
                            </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="own-script" className="pt-4">
                        <Form {...ownScriptForm}>
                            <form onSubmit={ownScriptForm.handleSubmit(handleOwnScriptSubmit)} className="space-y-6">
                                 <fieldset>
                                    <FormField
                                        control={ownScriptForm.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Video Title</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Your compelling video title" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={ownScriptForm.control}
                                        name="script"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Your Script</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Paste your full video script here..." {...field} className="min-h-[150px]" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={ownScriptForm.control}
                                        name="length"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                            <FormLabel>Video Length</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex gap-4"
                                                >
                                                <FormItem className="flex items-center space-x-2">
                                                    <FormControl>
                                                    <RadioGroupItem value="short" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">Short</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2">
                                                    <FormControl>
                                                    <RadioGroupItem value="long" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">Long-Form</FormLabel>
                                                </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" disabled={isManualCreating} className="w-full mt-6">
                                        {isManualCreating ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Generating from Script...
                                            </>
                                        ) : (
                                            "Create Video From Script"
                                        )}
                                    </Button>
                                </fieldset>
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}
