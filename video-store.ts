
'use server';

import { Operation } from 'genkit';
import { generateVideoScript } from '@/ai/flows/generate-video-script';
import { optimizeYoutubeUpload } from '@/ai/flows/optimize-youtube-upload';
import { createAIVideo } from '@/ai/flows/create-ai-video';
import { suggestSeriesStrategy } from '@/ai/flows/suggest-series-topics';


type VideoDetails = {
    title: string; // This is the original, un-optimized title
    script: string;
    videoLength?: 'short' | 'long';
    thumbnailUrl?: string;
    playlist?: string;
    scheduledDate?: string;
    optimizedTitle: string; // This is the final, user-facing title
    optimizedDescription?: string;
    optimizedTags?: string[];
    optimizedCategory?: string;
    suggestedUploadTime?: string;
}

type GeneratedVideo = {
    videoUrl?: string;
    audioUrl?: string;
}

// This is a simple in-memory store.
// In a real application, you would use a database.
const videos: Record<string, VideoDetails> = {}; // Keyed by optimizedTitle
const videoStatuses: Record<string, string> = {}; // Keyed by optimizedTitle
const videoOperations: Record<string, { operation: Operation, storedAt: number }> = {}; // Keyed by optimizedTitle
const generatedVideos: Record<string, GeneratedVideo> = {}; // Keyed by optimizedTitle

export async function addNewVideo(details: VideoDetails) {
    if (!videos[details.optimizedTitle]) {
        videos[details.optimizedTitle] = { ...details, scheduledDate: details.scheduledDate || new Date().toISOString().split('T')[0] };
        console.log(`Added new video with key: ${details.optimizedTitle}`);
    }
}

export async function updateVideoMetadata(title: string, metadata: Partial<VideoDetails>) {
    if (videos[title]) {
        videos[title] = { ...videos[title], ...metadata };
    }
}

export async function getNewVideos() {
    return Object.keys(videos);
}

export async function getVideo(title: string): Promise<VideoDetails | undefined> {
    // The `title` passed from the UI is the optimized title, which is now our key.
    return videos[title];
}

export async function getVideoScript(title: string): Promise<string | undefined> {
    return (await getVideo(title))?.script;
}

export async function updateVideoThumbnail(title: string, thumbnailUrl: string) {
    if (videos[title]) {
        videos[title].thumbnailUrl = thumbnailUrl;
    }
}

export async function setVideoStatus(title: string, status: string) {
    if (videos[title]) {
        videoStatuses[title] = status;
    }
}

export async function getVideoStatus(title: string): Promise<string | undefined> {
    return videoStatuses[title];
}

export async function updateVideoStatus(title: string, status: string) {
    if(videos[title]) {
       videoStatuses[title] = status;
    }
}

export async function storeOperation(title: string, operation: Operation) {
    if(videos[title]) {
      videoOperations[title] = { operation, storedAt: Date.now() };
    }
}

export async function getOperation(title: string) {
    const operationInfo = videoOperations[title];
    if (operationInfo && (Date.now() - operationInfo.storedAt > 24 * 60 * 60 * 1000)) {
        // Operation is more than 24 hours old, consider it expired
        delete videoOperations[title];
        return undefined;
    }
    return operationInfo;
}

export async function storeGeneratedVideo(title: string, videoUrl: string, audioUrl: string) {
    if(videos[title]) {
      generatedVideos[title] = { videoUrl, audioUrl };
    }
}

export async function getGeneratedVideo(title: string): Promise<GeneratedVideo | undefined> {
    return generatedVideos[title];
}

export async function getPlaylists(): Promise<string[]> {
    const playlists = new Set<string>();
    Object.values(videos).forEach(video => {
        if (video.playlist) {
            playlists.add(video.playlist);
        }
    });
    return Array.from(playlists);
}

export async function countVideosInPlaylist(playlist: string): Promise<number> {
    return Object.values(videos).filter(video => video.playlist === playlist).length;
}

export async function getTodaysVideoCounts(): Promise<{ shorts: number, longs: number }> {
    const today = new Date().toISOString().split('T')[0];
    let shorts = 0;
    let longs = 0;
    Object.values(videos).forEach(video => {
        const scheduledDate = video.scheduledDate?.split('T')[0];
        if (scheduledDate === today) {
            if (video.videoLength === 'short') shorts++;
            if (video.videoLength === 'long') longs++;
        }
    });
    return { shorts, longs };
}

export async function getThisWeeksVideoCounts(): Promise<{ shorts: number, longs: number }> {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setUTCHours(0, 0, 0, 0);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday is the first day of the week

    let shorts = 0;
    let longs = 0;

    Object.values(videos).forEach(video => {
        if (video.scheduledDate) {
            const videoDate = new Date(video.scheduledDate);
            if (videoDate >= startOfWeek && videoDate <= today) {
                if (video.videoLength === 'short') shorts++;
                if (video.videoLength === 'long') longs++;
            }
        }
    });

    return { shorts, longs };
}


// Shared video creation and processing logic
export async function createAndProcessVideo(length: 'short' | 'long', playlist?: string, topic?: string, title?: string, inspirationVideoUrl?: string, script?: string) {
    let scriptResult;
    // Step 1: Generate the script if one isn't provided
    if (script) {
        scriptResult = { script, title: title || "Untitled", topic: topic || "Custom Script" };
    } else {
        scriptResult = await generateVideoScript({ length, topic, videoTitle: title, inspirationVideoUrl });
    }
    
    const originalTitle = scriptResult.title;

    // Step 2: Optimize the script for YouTube
    const optimizationResult = await optimizeYoutubeUpload({ 
        videoTitle: originalTitle, 
        script: scriptResult.script, 
        videoCategory: "Technology", 
        videoDescription: " ", 
        videoTags: "" 
    });
    const { optimizedTitle, optimizedDescription, optimizedTags, optimizedCategory, suggestedUploadTime } = optimizationResult;
    
    // Step 3: Store the new video with all its metadata using the OPTIMIZED title as the key
    const today = new Date().toISOString().split('T')[0];
    
    addNewVideo({
        title: originalTitle,
        script: scriptResult.script,
        videoLength: length,
        playlist,
        scheduledDate: today,
        optimizedTitle, 
        optimizedDescription, 
        optimizedTags, 
        optimizedCategory, 
        suggestedUploadTime,
    });
    
    // Step 4: Start the AI video generation process using the OPTIMIZED title as the key for operations
    setVideoStatus(optimizedTitle, "Processing");
    await createAIVideo({ script: scriptResult.script, title: optimizedTitle });
    
    // Return the final, optimized title to the UI for display
    return optimizedTitle;
};


// Main Auto-Pilot Logic
export async function runAutoPilot(videoType: 'short' | 'long') {
    const weeklyLongGoal = 2;
    const dailyShortGoal = 3;

    const createShorts = async () => {
        const currentShorts = (await getTodaysVideoCounts()).shorts;
        const shortsNeeded = Math.max(0, dailyShortGoal - currentShorts);
        if (shortsNeeded > 0) {
            console.log(`Auto-Pilot: Creating ${shortsNeeded} short video(s)...`);
            for (let i = 0; i < shortsNeeded; i++) {
                await createAndProcessVideo('short', undefined, "a trending topic");
            }
        } else {
             console.log("Daily short video goal met!");
        }
    }

    const createLongs = async () => {
        const currentLongs = (await getThisWeeksVideoCounts()).longs;
        const longsNeeded = Math.max(0, weeklyLongGoal - currentLongs);
        if (longsNeeded > 0) {
            console.log(`Auto-Pilot: Creating ${longsNeeded} long-form video(s)...`);
            const existingPlaylists = await getPlaylists();
            
            let topic;
            let playlist;
            let isNewSeries = false;
            let startPart = 1;

            const seriesSuggestion = await suggestSeriesStrategy({ existingPlaylists });
            topic = seriesSuggestion.topic;
            playlist = seriesSuggestion.playlist;
            isNewSeries = seriesSuggestion.isNewSeries;
            startPart = isNewSeries ? 1 : (await countVideosInPlaylist(playlist)) + 1;
            
            for (let i = 0; i < longsNeeded; i++) {
                const videoTitle = `${topic} - Part ${startPart + i}`;
                await createAndProcessVideo('long', playlist, topic, videoTitle);
            }
        } else {
            console.log("Weekly long-form video goal met!");
        }
    }

    if (videoType === 'long') {
        await createLongs();
    } else if (videoType === 'short') {
        await createShorts();
    }
}
