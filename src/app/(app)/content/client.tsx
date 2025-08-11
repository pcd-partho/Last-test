
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal, Play, Wand2, RefreshCw, Upload } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { checkVideoStatus } from "@/ai/flows/check-video-status";
import { getAllVideos, createAndProcessVideo, VideoDetails } from "@/lib/video-store";
import { generateThumbnail } from "@/ai/flows/generate-thumbnail";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { uploadToYouTube } from "@/ai/flows/upload-to-youtube";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";


export default function ContentClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isActivated } = useAuth();
  const [videos, setVideos] = useState<VideoDetails[]>([]);
  const [previewVideo, setPreviewVideo] = useState<VideoDetails | null>(null);
  const [generatingThumbnails, setGeneratingThumbnails] = useState<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleGenerateThumbnail = async (video: VideoDetails) => {
    setGeneratingThumbnails(prev => new Set(prev).add(video.id));
    try {
        await generateThumbnail({ videoId: video.id, topic: video.title, script: video.script, title: video.optimizedTitle });
        toast({ title: "Thumbnail Regeneration Started", description: `A new thumbnail is being generated for "${video.optimizedTitle}". It will appear here shortly.` });
    } catch (error) {
        console.error("Failed to start thumbnail generation:", error);
        toast({ title: "Thumbnail Generation Failed", description: `Could not start thumbnail generation for "${video.optimizedTitle}".`, variant: "destructive" });
    } finally {
        // The thumbnail will update automatically via polling, so we can remove it from the set here.
        // Or leave it to show a persistent loading state until the URL changes.
    }
  }

  const handleRetryVideo = async (video: VideoDetails) => {
    if (!user) return;
    toast({ title: "Retrying Video Generation", description: `Starting generation again for "${video.optimizedTitle}".` });
    await createAndProcessVideo(user.uid, video.videoLength || 'short', video.playlist, video.title, video.optimizedTitle, undefined, video.script);
  }
  
  const handleUploadToYouTube = async (video: VideoDetails) => {
    const apiKey = localStorage.getItem("youtube_api_key");
    const channelId = localStorage.getItem("youtube_channel_id");

    if (!apiKey || !channelId) {
        toast({
            title: "YouTube Not Connected",
            description: "Please configure your YouTube API Key and Channel ID in Settings.",
            variant: "destructive",
        });
        return;
    }

    if (!video.videoUrl) {
        toast({ title: "Upload Failed", description: "Video data is missing.", variant: "destructive" });
        return;
    }

    toast({ title: "Uploading to YouTube...", description: `Your video "${video.optimizedTitle}" is being uploaded.` });

    try {
        // In a real app, you would fetch the video data from Firebase Storage first, then pass it.
        // For this prototype, we're assuming video.videoUrl might be a data URI or a direct URL the flow can handle.
        // The upload flow itself is simulated, so this works for demonstration.
        const response = await fetch(video.videoUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64data = reader.result;
            if (typeof base64data !== 'string') {
                 toast({ title: "Upload Failed", description: "Could not read video data for upload.", variant: "destructive" });
                 return;
            }

            await uploadToYouTube({
                apiKey,
                channelId,
                videoDataUri: base64data,
                title: video.optimizedTitle,
                description: video.optimizedDescription || "No description available.",
                tags: video.optimizedTags || [],
                category: video.optimizedCategory || "28", // Science & Technology
            });
            toast({ title: "Upload Complete!", description: `"${video.optimizedTitle}" has been successfully uploaded to YouTube.` });
        }
       
    } catch (error) {
        console.error("Failed to upload to YouTube:", error);
        toast({ title: "Upload Failed", description: `Could not upload "${video.optimizedTitle}" to YouTube.`, variant: "destructive" });
    }
  };


  useEffect(() => {
    if (previewVideo && videoRef.current && audioRef.current) {
        const video = videoRef.current;
        const audio = audioRef.current;
        const syncPlay = () => { if (!video.paused || !audio.paused) { video.play(); audio.play(); } };
        const syncPause = () => { if (video.paused || audio.paused) { video.pause(); audio.pause(); } };
        video.addEventListener('play', syncPlay);
        video.addEventListener('pause', syncPause);
        audio.addEventListener('play', syncPlay);
        audio.addEventListener('pause', syncPause);
        return () => {
            video.removeEventListener('play', syncPlay);
            video.removeEventListener('pause', syncPause);
            audio.removeEventListener('play', syncPlay);
            audio.removeEventListener('pause', syncPause);
        };
    }
  }, [previewVideo]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "published": return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Published</Badge>;
      case "scheduled": return <Badge variant="secondary" className="bg-blue-500 text-white hover:bg-blue-600">Scheduled</Badge>;
      case "processing": return <Badge variant="secondary" className="bg-purple-500 text-white hover:bg-purple-600 animate-pulse">Processing</Badge>;
      case "generated": return <Badge variant="secondary" className="bg-emerald-500 text-white hover:bg-emerald-600">Generated</Badge>;
      case "failed": return <Badge variant="destructive">Failed</Badge>;
      case "draft": return <Badge variant="outline">Draft</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const pollVideos = async () => {
    if (!user) return;
    
    // Fetch all videos once
    const latestVideos = await getAllVideos(user.uid);
    setVideos(latestVideos.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));

    // Check status for processing videos
    const processingVideos = latestVideos.filter(v => v.status === 'Processing');
    if (processingVideos.length > 0) {
        await Promise.all(processingVideos.map(video => checkVideoStatus({ videoId: video.id })));
    }
};

useEffect(() => {
    if (user) {
        pollVideos(); // Initial fetch
        const interval = setInterval(pollVideos, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }
}, [user]);


  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold font-headline">Content</h1>
            <Button onClick={() => router.push('/create')} disabled={!isActivated}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Video
            </Button>
        </div>

        <Dialog open={!!previewVideo} onOpenChange={(isOpen) => !isOpen && setPreviewVideo(null)}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{previewVideo?.optimizedTitle}</DialogTitle>
                </DialogHeader>
                {previewVideo?.videoUrl ? (
                    <div className="relative">
                        <video ref={videoRef} src={previewVideo.videoUrl} className="w-full rounded-md" muted onContextMenu={(e) => e.preventDefault()} />
                        {previewVideo.audioUrl && (
                            <audio ref={audioRef} src={previewVideo.audioUrl} controls className="w-full mt-2" />
                        )}
                    </div>
                ) : (
                    <div className="text-center p-8">
                        <p className="text-muted-foreground">Video is still processing or has failed to generate.</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>


        <Card>
            <CardHeader>
                <CardTitle>Video Library</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[120px]">Thumbnail</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Playlist</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Scheduled/Created</TableHead>
                            <TableHead>
                                <span className="sr-only">Actions</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {videos.map((video) => (
                            <TableRow key={video.id}>
                                <TableCell>
                                    {generatingThumbnails.has(video.id) || (video.status === 'Scheduled' && !video.thumbnailUrl) ? (
                                        <div className="flex items-center justify-center w-32 h-18 bg-muted rounded-md">
                                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : video.thumbnailUrl ? (
                                        <Image
                                            src={video.thumbnailUrl}
                                            alt={`Thumbnail for ${video.optimizedTitle}`}
                                            width={128}
                                            height={72}
                                            className="rounded-md aspect-video object-cover"
                                        />
                                    ) : (
                                        <div className="w-32 h-18 bg-muted rounded-md" />
                                    )}
                                </TableCell>
                                <TableCell className="font-medium">{video.optimizedTitle}</TableCell>
                                <TableCell>{video.playlist || "N/A"}</TableCell>
                                <TableCell>{getStatusBadge(video.status)}</TableCell>
                                <TableCell>{video.suggestedUploadTime || (video.createdAt ? format(video.createdAt.toDate(), 'PPP') : 'N/A')}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button aria-haspopup="true" size="icon" variant="ghost" disabled={!isActivated}>
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">Toggle menu</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {video.status === 'Processing' && (
                                                <DropdownMenuItem disabled>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Processing...
                                                </DropdownMenuItem>
                                            )}
                                            {video.status === 'Failed' && (
                                                <DropdownMenuItem onClick={() => handleRetryVideo(video)}>
                                                    <RefreshCw className="mr-2 h-4 w-4" />
                                                    Retry
                                                </DropdownMenuItem>
                                            )}
                                            {(video.status !== 'Processing' && video.status !== 'Failed') && (
                                                <>
                                                <DropdownMenuItem onClick={() => setPreviewVideo(video)} disabled={!video.videoUrl}>
                                                    <Play className="mr-2 h-4 w-4" />
                                                    Preview
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleGenerateThumbnail(video)} disabled={generatingThumbnails.has(video.id)}>
                                                    {generatingThumbnails.has(video.id) ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Generating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Wand2 className="mr-2 h-4 w-4" />
                                                            Regenerate Thumbnail
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleUploadToYouTube(video)} disabled={!video.videoUrl}>
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    Upload to YouTube
                                                </DropdownMenuItem>
                                                <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                                                <DropdownMenuItem disabled>Analytics</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" disabled>Delete</DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
