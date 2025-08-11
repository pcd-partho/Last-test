
'use server';

import { Operation } from 'genkit';
import { generateVideoScript } from '@/ai/flows/generate-video-script';
import { optimizeYoutubeUpload } from '@/ai/flows/optimize-youtube-upload';
import { createAIVideo } from '@/ai/flows/create-ai-video';
import { suggestSeriesStrategy } from '@/ai/flows/suggest-series-topics';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';


export type VideoDetails = {
    id: string; // Firestore document ID
    uid: string; // User ID
    title: string; // This is the original, un-optimized title
    script: string;
    videoLength?: 'short' | 'long';
    thumbnailUrl?: string;
    playlist?: string;
    status: string; // e.g., 'Processing', 'Generated', 'Scheduled', 'Published', 'Failed'
    optimizedTitle: string; // This is the final, user-facing title
    optimizedDescription?: string;
    optimizedTags?: string[];
    optimizedCategory?: string;
    suggestedUploadTime?: string;
    createdAt: Timestamp;
    videoUrl?: string; // URL from Firebase Storage
    audioUrl?: string; // URL from Firebase Storage
    operationName?: string;
}

// In a real application, you would use a database.
const videoOperations: Record<string, { operation: Operation, storedAt: number }> = {}; // Keyed by operationName

// ============================================================================
// Firestore Video Management
// ============================================================================

export async function addNewVideo(uid: string, details: Omit<VideoDetails, 'id' | 'uid' | 'createdAt' | 'status'>): Promise<string> {
    const videoCollection = collection(db, 'videos');
    const newDocRef = doc(videoCollection);
    const videoData: VideoDetails = {
        ...details,
        id: newDocRef.id,
        uid,
        status: 'Processing',
        createdAt: serverTimestamp() as Timestamp,
    };
    await setDoc(newDocRef, videoData);
    console.log(`Added new video with ID: ${newDocRef.id}`);
    return newDocRef.id;
}


export async function updateVideoMetadata(videoId: string, metadata: Partial<VideoDetails>) {
    const videoRef = doc(db, 'videos', videoId);
    await setDoc(videoRef, metadata, { merge: true });
}

export async function getVideo(videoId: string): Promise<VideoDetails | undefined> {
    const videoRef = doc(db, 'videos', videoId);
    const docSnap = await getDoc(videoRef);
    if (docSnap.exists()) {
        return docSnap.data() as VideoDetails;
    }
    return undefined;
}

export async function getAllVideos(uid: string): Promise<VideoDetails[]> {
    const videosRef = collection(db, 'videos');
    const q = query(videosRef, where("uid", "==", uid));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoDetails));
}


export async function getTodaysVideoCounts(uid: string): Promise<{ shorts: number, longs: number }> {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const videosRef = collection(db, 'videos');
    const q = query(
        videosRef, 
        where("uid", "==", uid),
        where("createdAt", ">=", Timestamp.fromDate(startOfDay)),
        where("createdAt", "<=", Timestamp.fromDate(endOfDay))
    );

    const querySnapshot = await getDocs(q);
    let shorts = 0;
    let longs = 0;
    querySnapshot.forEach(doc => {
        const video = doc.data() as VideoDetails;
        if (video.videoLength === 'short') shorts++;
        if (video.videoLength === 'long') longs++;
    });
    return { shorts, longs };
}

export async function getThisWeeksVideoCounts(uid: string): Promise<{ shorts: number, longs: number }> {
    const today = new Date();
    const dayOfWeek = today.getDay(); 
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const videosRef = collection(db, 'videos');
    const q = query(
        videosRef, 
        where("uid", "==", uid),
        where("createdAt", ">=", Timestamp.fromDate(startOfWeek)),
        where("createdAt", "<=", Timestamp.fromDate(endOfWeek))
    );
    
    const querySnapshot = await getDocs(q);
    let shorts = 0;
    let longs = 0;
    querySnapshot.forEach(doc => {
        const video = doc.data() as VideoDetails;
        if (video.videoLength === 'short') shorts++;
        if (video.videoLength === 'long') longs++;
    });

    return { shorts, longs };
}


// ============================================================================
// Operation Management (In-Memory, for simplicity of prototype)
// ============================================================================

export async function storeOperation(operationName: string, operation: Operation) {
    videoOperations[operationName] = { operation, storedAt: Date.now() };
}

export async function getOperation(operationName: string) {
    const operationInfo = videoOperations[operationName];
    if (operationInfo && (Date.now() - operationInfo.storedAt > 24 * 60 * 60 * 1000)) {
        // Operation is more than 24 hours old, consider it expired
        delete videoOperations[operationName];
        return undefined;
    }
    return operationInfo;
}

// ============================================================================
// Playlists
// ============================================================================


export async function getPlaylists(uid: string): Promise<string[]> {
    const videos = await getAllVideos(uid);
    const playlists = new Set<string>();
    videos.forEach(video => {
        if (video.playlist) {
            playlists.add(video.playlist);
        }
    });
    return Array.from(playlists);
}

export async function countVideosInPlaylist(uid: string, playlist: string): Promise<number> {
    const videosRef = collection(db, 'videos');
    const q = query(videosRef, where("uid", "==", uid), where("playlist", "==", playlist));
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
}

// ============================================================================
// High-Level Business Logic
// ============================================================================

// Shared video creation and processing logic
export async function createAndProcessVideo(uid: string, length: 'short' | 'long', playlist?: string, topic?: string, title?: string, inspirationVideoUrl?: string, script?: string) {
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
    
    // Step 3: Store the new video with all its metadata
    const videoId = await addNewVideo(uid, {
        title: originalTitle,
        script: scriptResult.script,
        videoLength: length,
        playlist,
        optimizedTitle, 
        optimizedDescription, 
        optimizedTags, 
        optimizedCategory, 
        suggestedUploadTime,
    });
    
    // Step 4: Start the AI video generation process
    await createAIVideo({ script: scriptResult.script, videoId: videoId });
    
    return { videoId, optimizedTitle };
};


// Main Auto-Pilot Logic
export async function runAutoPilot(uid: string, videoType: 'short' | 'long') {
    const weeklyLongGoal = 2;
    const dailyShortGoal = 3;

    const createShorts = async () => {
        const currentShorts = (await getTodaysVideoCounts(uid)).shorts;
        const shortsNeeded = Math.max(0, dailyShortGoal - currentShorts);
        if (shortsNeeded > 0) {
            console.log(`Auto-Pilot: Creating ${shortsNeeded} short video(s)...`);
            for (let i = 0; i < shortsNeeded; i++) {
                await createAndProcessVideo(uid, 'short', undefined, "a trending topic");
            }
        } else {
             console.log("Daily short video goal met!");
        }
    }

    const createLongs = async () => {
        const currentLongs = (await getThisWeeksVideoCounts(uid)).longs;
        const longsNeeded = Math.max(0, weeklyLongGoal - currentLongs);
        if (longsNeeded > 0) {
            console.log(`Auto-Pilot: Creating ${longsNeeded} long-form video(s)...`);
            const existingPlaylists = await getPlaylists(uid);
            
            let topic;
            let playlist;
            let startPart = 1;

            const seriesSuggestion = await suggestSeriesStrategy({ existingPlaylists });
            topic = seriesSuggestion.topic;
            playlist = seriesSuggestion.playlist;
            startPart = seriesSuggestion.isNewSeries ? 1 : (await countVideosInPlaylist(uid, playlist)) + 1;
            
            for (let i = 0; i < longsNeeded; i++) {
                const videoTitle = `${topic} - Part ${startPart + i}`;
                await createAndProcessVideo(uid, 'long', playlist, topic, videoTitle);
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
