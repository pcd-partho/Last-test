
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { checkVideoStatus } from "@/ai/flows/check-video-status";
import { getNewVideos, getVideoStatus, updateVideoStatus, getVideo, updateVideoThumbnail, getGeneratedVideo } from "@/lib/video-store";
import { generateThumbnail } from "@/ai/flows/generate-thumbnail";
import { createAIVideo } from "@/ai/flows/create-ai-video";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { uploadToYouTube } from "@/ai/flows/upload-to-youtube";


type Video = {
  title: string; // This is the optimized title
  originalTitle: string;
  status: string;
  uploadDate: string;
  views: number;
  likes: number;
  videoUrl?: string;
  audioUrl?: string;
  isNew?: boolean;
  script?: string;
  thumbnailUrl?: string;
  playlist?: string;
  isGeneratingThumbnail?: boolean;
  isGeneratingAudio?: boolean;
  suggestedUploadTime?: string;
};

const initialVideos: Video[] = [
  {
    title: "The AI Revolution: How Machine Learning is Changing Everything",
    originalTitle: "The AI Revolution: How Machine Learning is Changing Everything",
    status: "Published",
    uploadDate: "2024-06-15",
    views: 7500,
    likes: 500,
    script: "This is a script about AI.",
    thumbnailUrl: "https://placehold.co/1280x720.png",
    playlist: "AI Explained"
  },
  {
    title: "Neural Networks Explained in 10 Minutes",
    originalTitle: "Neural Networks Explained in 10 Minutes",
    status: "Published",
    uploadDate: "2024-06-10",
    views: 6800,
    likes: 450,
    script: "This is a script about Neural Networks.",
    thumbnailUrl: "https://placehold.co/1280x720.png",
    playlist: "AI Explained"
  },
  {
    title: "The Future of Coding with AI Assistants",
    originalTitle: "The Future of Coding with AI Assistants",
    status: "Scheduled",
    uploadDate: "",
    views: 0,
    likes: 0,
    thumbnailUrl: "https://placehold.co/1280x720.png",
    suggestedUploadTime: "2024-07-25 at 3:00 PM EST",
  },
  {
    title: "Unveiling the Power of Generative AI",
    originalTitle: "Unveiling the Power of Generative AI",
    status: "Draft",
    uploadDate: "2024-08-01",
    views: 0,
    likes: 0,
    thumbnailUrl: "https://placehold.co/1280x720.png",
  },
    {
    title: "A Day in the Life of a Robotics Engineer",
    originalTitle: "A Day in the Life of a Robotics Engineer",
    status: "Published",
    uploadDate: "2024-05-28",
    views: 3100,
    likes: 150,
    thumbnailUrl: "https://placehold.co/1280x720.png",
  },
    {
    title: "Exploring the Ethics of Artificial Intelligence",
    originalTitle: "Exploring the Ethics of Artificial Intelligence",
    status: "Scheduled",
    uploadDate: "",
    views: 0,
    likes: 0,
    thumbnailUrl: "https://placehold.co/1280x720.png",
    suggestedUploadTime: "2024-08-10 at 11:00 AM EST",
  },
];

export default function ContentClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [isActivated, setIsActivated] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const email = localStorage.getItem("user_email");
    const adminEmails = JSON.parse(localStorage.getItem("admin_emails") || "[]");
    const activated = (email && localStorage.getItem(`user_activated_${email}`) === "true") || (email && adminEmails.includes(email));
    setIsActivated(activated);
  }, []);

  const handleGenerateThumbnail = async (video: Video) => {
    setVideos(currentVideos => currentVideos.map(v => v.title === video.title ? { ...v, isGeneratingThumbnail: true } : v));
    try {
        const result = await generateThumbnail({ topic: video.title, script: video.script, title: video.title });
        updateVideoThumbnail(video.title, result.thumbnailUrl);
        setVideos(currentVideos => currentVideos.map(v => v.title === video.title ? { ...v, thumbnailUrl: result.thumbnailUrl, isGeneratingThumbnail: false } : v));
        toast({ title: "Thumbnail Generated", description: `A new thumbnail has been generated for "${video.title}".` });
    } catch (error) {
        console.error("Failed to generate thumbnail:", error);
        setVideos(currentVideos => currentVideos.map(v => v.title === video.title ? { ...v, isGeneratingThumbnail: false } : v));
        toast({ title: "Thumbnail Generation Failed", description: `Could not generate a thumbnail for "${video.title}".`, variant: "destructive" });
    }
  }

  const handleRetryVideo = async (video: Video) => {
    const storedVideo = await getVideo(video.title);
    if (!storedVideo || !storedVideo.script) {
      toast({ title: "Retry Failed", description: `Cannot find script for "${video.title}".`, variant: "destructive" });
      return;
    }
    toast({ title: "Retrying Video Generation", description: `Starting generation again for "${video.title}".` });
    updateVideoStatus(video.title, 'Processing');
    setVideos(currentVideos => currentVideos.map(v => v.title === video.title ? { ...v, status: 'Processing' } : v));
    await createAIVideo({ script: storedVideo.script, title: storedVideo.optimizedTitle });
  }

  const handleOpenPreview = async (video: Video) => {
    const fullVideoDetails = await getGeneratedVideo(video.title);
    setPreviewVideo({ ...video, ...fullVideoDetails });
  }

  const handleUploadToYouTube = async (video: Video) => {
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

    const videoDetails = await getVideo(video.title);
    const generatedVideo = await getGeneratedVideo(video.title);

    if (!videoDetails || !generatedVideo?.videoUrl) {
        toast({ title: "Upload Failed", description: "Video data is missing.", variant: "destructive" });
        return;
    }

    toast({ title: "Uploading to YouTube...", description: `Your video "${video.title}" is being uploaded.` });

    try {
        await uploadToYouTube({
            apiKey,
            channelId,
            videoDataUri: generatedVideo.videoUrl,
            title: videoDetails.optimizedTitle || video.title,
            description: videoDetails.optimizedDescription || "No description available.",
            tags: videoDetails.optimizedTags || [],
            category: videoDetails.optimizedCategory || "28", // Science & Technology
        });
        updateVideoStatus(video.title, 'Published');
        setVideos(currentVideos => currentVideos.map(v => v.title === video.title ? { ...v, status: 'Published' } : v));
        toast({ title: "Upload Complete!", description: `"${video.title}" has been successfully uploaded to YouTube.` });
    } catch (error) {
        console.error("Failed to upload to YouTube:", error);
        toast({ title: "Upload Failed", description: `Could not upload "${video.title}" to YouTube.`, variant: "destructive" });
    }
  };


  useEffect(() => {
    if (previewVideo && videoRef.current && audioRef.current) {
        const video = videoRef.current;
        const audio = audioRef.current;
        const syncPlay = () => { if (video.paused || audio.paused) { video.play(); audio.play(); } };
        const syncPause = () => { if (!video.paused || !audio.paused) { video.pause(); audio.pause(); } };
        video.addEventListener('play', syncPlay);
        video.addEventListener('pause', syncPause);
        audio.addEventListener('play', syncPlay);
        audio.addEventListener('pause', syncPause);
        return () => {
            video.removeEventListener('play', syncPlay);
            video.removeEventListener('pause', syncPause);
            video.removeEventListener('play', syncPlay);
            audio.removeEventListener('pause', syncPause);
        };
    }
  }, [previewVideo]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "published": return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Published</Badge>;
      case "scheduled": return <Badge variant="secondary" className="bg-blue-500 text-white hover:bg-blue-600">Scheduled</Badge>;
      case "processing": return <Badge variant="secondary" className="bg-purple-500 text-white hover:bg-purple-600 animate-pulse">Processing</Badge>;
      case "generated": return <Badge variant="secondary" className="bg-green-500 text-white hover:bg-green-600">Generated</Badge>;
      case "failed": return <Badge variant="destructive">Failed</Badge>;
      case "draft": return <Badge variant="outline">Draft</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  useEffect(() => {
    const fetchNewVideos = async () => {
        const newVideoTitles = await getNewVideos();
        if (!newVideoTitles) return;

        const newVideoDetails = (await Promise.all(newVideoTitles.map(title => getVideo(title)))).filter(v => v) as (Video & { title: string, originalTitle: string, optimizedTitle: string, scheduledDate?: string, suggestedUploadTime?: string })[];
        
        const videosWithStatus = await Promise.all(newVideoDetails.map(async (video) => ({ 
            ...video, 
            title: video.optimizedTitle,
            originalTitle: video.title,
            status: await getVideoStatus(video.optimizedTitle) || "Processing", 
            uploadDate: video.scheduledDate || new Date().toISOString().split('T')[0], 
            views: 0, 
            likes: 0, 
            isNew: true, 
            suggestedUploadTime: video.suggestedUploadTime 
        })));

        setVideos(prev => {
            const existingTitles = new Set(prev.map(v => v.title));
            const trulyNew = videosWithStatus.filter(v => !existingTitles.has(v.title));
            const updatePrev = async () => {
                const updated = await Promise.all(prev.map(async p => { 
                    const updatedVideo = await getVideo(p.title); 
                    return updatedVideo ? { ...p, ...(await getGeneratedVideo(p.title)), title: updatedVideo.optimizedTitle, status: (await getVideoStatus(p.title)) || p.status, suggestedUploadTime: updatedVideo.suggestedUploadTime } : p; 
                }));
                return updated;
            };

            updatePrev().then(updatedPrev => {
                 setVideos([...trulyNew, ...updatedPrev].sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()));
            });
            return prev; // Return previous state while async operations happen
        });
    };

    fetchNewVideos();

    const interval = setInterval(() => {
        setVideos(currentVideos => {
            let needsUpdate = false;
            const checkPromises = currentVideos.map(async (video) => {
                if (video.status === 'Processing') {
                    try {
                        const result = await checkVideoStatus({ title: video.title });
                        const currentStatus = await getVideoStatus(video.title);
                        if (result.status === 'completed' && currentStatus !== 'Generated' && currentStatus !== 'Scheduled') {
                            needsUpdate = true;
                            const videoDetails = await getVideo(video.title);
                            if (videoDetails?.suggestedUploadTime) {
                                await updateVideoStatus(video.title, 'Scheduled');
                                return { ...video, status: 'Scheduled' };
                            } else {
                                await updateVideoStatus(video.title, 'Generated');
                                return { ...video, status: 'Generated' };
                            }
                        } else if (result.status === 'failed' && currentStatus !== 'Failed') {
                            needsUpdate = true;
                            await updateVideoStatus(video.title, 'Failed');
                            return { ...video, status: 'Failed' };
                        }
                    } catch (error) {
                        console.error(`Error checking status for ${video.title}:`, error);
                    }
                }
                return video;
            });

            Promise.all(checkPromises).then(updatedVideos => {
                if(needsUpdate) {
                    setVideos(updatedVideos.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()));
                }
            });

            return currentVideos;
        });
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, []);

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
                    <DialogTitle>{previewVideo?.title}</DialogTitle>
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
                        <p className="text-muted-foreground">Video not available for preview as it is not stored on the server.</p>
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
                            <TableHead>Scheduled For</TableHead>
                            <TableHead className="text-right">Views</TableHead>
                            <TableHead className="text-right">Likes</TableHead>
                            <TableHead>
                                <span className="sr-only">Actions</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {videos.map((video) => (
                            <TableRow key={video.title}>
                                <TableCell>
                                    {video.isGeneratingThumbnail ? (
                                        <div className="flex items-center justify-center w-32 h-18 bg-muted rounded-md">
                                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : video.thumbnailUrl ? (
                                        <Image
                                            src={video.thumbnailUrl}
                                            alt={`Thumbnail for ${video.title}`}
                                            width={128}
                                            height={72}
                                            className="rounded-md aspect-video object-cover"
                                        />
                                    ) : (
                                        <div className="w-32 h-18 bg-muted rounded-md" />
                                    )}
                                </TableCell>
                                <TableCell className="font-medium">{video.title}</TableCell>
                                <TableCell>{video.playlist || "N/A"}</TableCell>
                                <TableCell>{getStatusBadge(video.status)}</TableCell>
                                <TableCell>{video.suggestedUploadTime || video.uploadDate}</TableCell>
                                <TableCell className="text-right">{video.views.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{video.likes.toLocaleString()}</TableCell>
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
                                                <DropdownMenuItem onClick={() => handleOpenPreview(video)} disabled={video.status !== 'Generated' && video.status !== 'Scheduled' && video.status !== 'Published'}>
                                                    <Play className="mr-2 h-4 w-4" />
                                                    Preview
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleGenerateThumbnail(video)} disabled={video.isGeneratingThumbnail}>
                                                    {video.isGeneratingThumbnail ? (
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
                                                <DropdownMenuItem onClick={() => handleUploadToYouTube(video)}>
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    Upload to YouTube
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                                <DropdownMenuItem>Analytics</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
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
