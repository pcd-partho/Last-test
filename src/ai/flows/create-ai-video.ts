
'use server';

/**
 * @fileOverview Flow to transform a script into a video using AI-generated visuals.
 *
 * - createAIVideo - A function that handles the video creation process.
 * - CreateAIVideoInput - The input type for the createAIVideo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { storeOperation, updateVideoStatus } from '@/lib/video-store';

const CreateAIVideoInputSchema = z.object({
  script: z.string().describe('The script to transform into a video.'),
  title: z.string().describe('The title of the video. This is used as the key for storing the operation.'),
});
export type CreateAIVideoInput = z.infer<typeof CreateAIVideoInputSchema>;

export async function createAIVideo(input: CreateAIVideoInput): Promise<void> {
  createAIVideoFlow(input);
}

const createAIVideoFlow = ai.defineFlow(
  {
    name: 'createAIVideoFlow',
    inputSchema: CreateAIVideoInputSchema,
  },
  async (input) => {
    // To reduce the operational load, we'll generate a short, silent video
    // based on only the first sentence of the script.
    const firstSentence = input.script.split(/[.!?]/)[0] + '.';

    // We are not awaiting the full completion of the video generation here.
    // We only await the initial `generate` call to get the operation object,
    // then we store it and let the flow finish. The frontend will poll for completion.
    const { operation } = await ai.generate({
        model: 'googleai/veo-2.0-generate-001',
        prompt: firstSentence,
        config: {
            durationSeconds: 5,
            aspectRatio: '16:9',
        },
    });

    if (!operation) {
      console.error(`Video generation failed to start for title: "${input.title}".`);
      updateVideoStatus(input.title, 'Failed');
      return;
    }
    console.log(`Video generation started for title: "${input.title}". Storing operation.`);
    storeOperation(input.title, operation);
  }
);
