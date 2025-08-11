
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
import { getOperation, storeGeneratedVideo, getGeneratedVideo, updateVideoStatus, getVideoScript, getVideo } from '@/lib/video-store';
import { generateSpeechAudio } from './generate-speech-audio';
import { generateThumbnail } from './generate-thumbnail';

const CheckVideoStatusInputSchema = z.object({
  title: z.string().describe('The title of the video to check.'),
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
  async ({ title }) => {
    const videoDetails = await getVideo(title);
    if (!videoDetails) {
        return { status: 'not_found' };
    }

    const generatedVideo = await getGeneratedVideo(title);
    if (generatedVideo?.videoUrl) {
        return { status: 'completed', videoUrl: generatedVideo.videoUrl };
    }
    
    const operationInfo = await getOperation(title);
    if (!operationInfo) {
      return { status: 'not_found' };
    }
    
    let operation = operationInfo.operation;

    if (!operation.done) {
        operation = await ai.checkOperation(operation);
    }
    
    if (operation.done) {
        if (operation.error) {
            console.error(`Failed to generate video for "${title}":`, operation.error.message);
            await updateVideoStatus(title, 'Failed');
            return { status: 'failed' };
        }

        const video = operation.output?.message?.content.find(p => !!p.media);
        if (!video || !video.media?.url) {
            console.error(`Failed to find the generated video in the operation output for "${title}".`);
            await updateVideoStatus(title, 'Failed');
            return { status: 'failed' };
        }
        
        const script = await getVideoScript(title);
        if(!script) {
            console.error(`Failed to find script for generated video "${title}".`);
            await updateVideoStatus(title, 'Failed');
            return { status: 'failed' };
        }

        try {
            const { audioDataUri } = await generateSpeechAudio({ script });
            await storeGeneratedVideo(title, video.media.url, audioDataUri);
            
            const finalStatus = videoDetails.suggestedUploadTime ? 'Scheduled' : 'Generated';
            await updateVideoStatus(title, finalStatus);
            
            if (finalStatus === 'Scheduled') {
                // Kick off thumbnail generation in the background
                generateThumbnail({ topic: videoDetails.title, script: videoDetails.script, title: videoDetails.optimizedTitle });
            }

            return { status: 'completed' };
        } catch(e) {
            console.error(`Failed to generate audio or store video for "${title}"`, e);
            await updateVideoStatus(title, 'Failed');
            return { status: 'failed' };
        }
    }

    return { status: 'processing' };
  }
);
