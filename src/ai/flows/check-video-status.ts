
'use server';

/**
 * @fileOverview Flow to check the status of a video generation operation.
 *
 * - checkVideoStatus - A function that checks the status of a video generation operation.
 * - CheckVideoStatusInput - The input type for the checkVideoStatus function.
 * - CheckVideoStatusOutput - The return type for the checkVideoStatus function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getOperation, getVideo, updateVideoMetadata } from '@/lib/video-store';
import { generateSpeechAudio } from './generate-speech-audio';
import { generateThumbnail } from './generate-thumbnail';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";


const CheckVideoStatusInputSchema = z.object({
  videoId: z.string().describe('The Firestore ID of the video to check.'),
});
export type CheckVideoStatusInput = z.infer<typeof CheckVideoStatusInputSchema>;

const CheckVideoStatusOutputSchema = z.object({
  status: z.enum(['processing', 'completed', 'failed', 'not_found']),
  videoUrl: z.string().optional(),
});
export type CheckVideoStatusOutput = z.infer<typeof CheckVideoStatusOutputSchema>;


export async function checkVideoStatus(input: CheckVideoStatusInput): Promise<CheckVideoStatusOutput> {
  return checkVideoStatusFlow(input);
}

const checkVideoStatusFlow = ai.defineFlow(
  {
    name: 'checkVideoStatusFlow',
    inputSchema: CheckVideoStatusInputSchema,
    outputSchema: CheckVideoStatusOutputSchema,
  },
  async ({ videoId }) => {
    const videoDetails = await getVideo(videoId);
    if (!videoDetails) {
        return { status: 'not_found' };
    }

    // If URLs are already stored, it's completed.
    if (videoDetails.videoUrl && videoDetails.audioUrl) {
        return { status: 'completed', videoUrl: videoDetails.videoUrl };
    }
    
    if (!videoDetails.operationName) {
        console.error(`No operation name found for videoId "${videoId}"`);
        await updateVideoMetadata(videoId, { status: 'Failed' });
        return { status: 'failed' };
    }

    const operationInfo = await getOperation(videoDetails.operationName);
    if (!operationInfo) {
      // Operation might have expired or not been stored correctly
      console.error(`No operation info found for operation "${videoDetails.operationName}"`);
      await updateVideoMetadata(videoId, { status: 'Failed' });
      return { status: 'failed' };
    }
    
    let operation = operationInfo.operation;

    if (!operation.done) {
        operation = await ai.checkOperation(operation);
    }
    
    if (operation.done) {
        if (operation.error) {
            console.error(`Failed to generate video for videoId "${videoId}":`, operation.error.message);
            await updateVideoMetadata(videoId, { status: 'Failed' });
            return { status: 'failed' };
        }

        const videoMediaPart = operation.output?.message?.content.find(p => !!p.media);
        if (!videoMediaPart || !videoMediaPart.media?.url) {
            console.error(`Failed to find the generated video in the operation output for videoId "${videoId}".`);
            await updateVideoMetadata(videoId, { status: 'Failed' });
            return { status: 'failed' };
        }
        
        try {
            const storage = getStorage();
            
            // 1. Upload video to Firebase Storage
            const videoRef = ref(storage, `videos/${videoId}/generated_video.mp4`);
            await uploadString(videoRef, videoMediaPart.media.url, 'data_url');
            const videoUrl = await getDownloadURL(videoRef);

            // 2. Generate and upload audio
            const { audioDataUri } = await generateSpeechAudio({ script: videoDetails.script });
            const audioRef = ref(storage, `videos/${videoId}/generated_audio.wav`);
            await uploadString(audioRef, audioDataUri, 'data_url');
            const audioUrl = await getDownloadURL(audioRef);

            // 3. Update Firestore with URLs
            const finalStatus = videoDetails.suggestedUploadTime ? 'Scheduled' : 'Generated';
            await updateVideoMetadata(videoId, { 
                videoUrl, 
                audioUrl,
                status: finalStatus
            });
            
            // 4. Kick off thumbnail generation in the background
            if (finalStatus === 'Scheduled' || finalStatus === 'Generated') {
                generateThumbnail({ topic: videoDetails.title, script: videoDetails.script, title: videoDetails.optimizedTitle, videoId });
            }

            return { status: 'completed', videoUrl };
        } catch(e) {
            console.error(`Failed to process and store assets for videoId "${videoId}"`, e);
            await updateVideoMetadata(videoId, { status: 'Failed' });
            return { status: 'failed' };
        }
    }

    return { status: 'processing' };
  }
);

