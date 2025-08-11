
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a YouTube video thumbnail.
 *
 * It exports:
 * - `generateThumbnail`: An async function to generate a thumbnail.
 * - `GenerateThumbnailInput`: The input type for the generateThumbnail function.
 * - `GenerateThumbnailOutput`: The output type for the generateThumbnail function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateThumbnailInputSchema = z.object({
  topic: z.string().describe('The topic of the video for which to generate a thumbnail.'),
  script: z.string().optional().describe('The full script of the video for better contextual understanding.'),
  title: z.string().optional().describe('The title of the video, which might indicate if it is part of a series.'),
});
export type GenerateThumbnailInput = z.infer<typeof GenerateThumbnailInputSchema>;

const GenerateThumbnailOutputSchema = z.object({
  thumbnailUrl: z.string().describe('The data URI of the generated thumbnail image.'),
});
export type GenerateThumbnailOutput = z.infer<typeof GenerateThumbnailOutputSchema>;

export async function generateThumbnail(input: GenerateThumbnailInput): Promise<GenerateThumbnailOutput> {
  return generateThumbnailFlow(input);
}

const generateThumbnailFlow = ai.defineFlow(
  {
    name: 'generateThumbnailFlow',
    inputSchema: GenerateThumbnailInputSchema,
    outputSchema: GenerateThumbnailOutputSchema,
  },
  async ({ topic, script, title }) => {

    const promptText = `Generate a compelling, high-resolution YouTube thumbnail for a video about "${topic}".
    ${title ? `The video is titled "${title}". If this title suggests it is part of a series (e.g., "Part 1", "Episode 2"), make the thumbnail visually distinct from other potential videos in the series. You can do this by using different colors, imagery, or by subtly incorporating the part number.` : ''}
    ${script ? `The video script is as follows: "${script}". The thumbnail should accurately reflect the video's content.` : ''}
    The thumbnail should be visually striking, with vibrant colors and clear, easy-to-read text if any is included. Avoid overly cluttered designs. The style should be modern and engaging.
    Ensure the generated image is unique.`;

    const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: promptText,
        config: {
            responseModalities: ['TEXT', 'IMAGE'],
            aspectRatio: '16:9',
        },
    });

    if (!media.url) {
        throw new Error('Image generation failed to produce an image.');
    }

    return {
        thumbnailUrl: media.url,
    };
  }
);
