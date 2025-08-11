
'use server';

/**
 * @fileOverview This file defines a Genkit flow for optimizing YouTube video uploads with SEO-friendly metadata.
 *
 * - `optimizeYoutubeUpload`:  A function that takes video details and generates an optimized title, description, and tags for YouTube.
 * - `OptimizeYoutubeUploadInput`: The input type for the `optimizeYoutubeUpload` function.
 * - `OptimizeYoutubeUploadOutput`: The output type for the `optimizeYoutubeUpload` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeYoutubeUploadInputSchema = z.object({
  videoTitle: z.string().describe('The original title of the video.'),
  videoDescription: z.string().describe('The original description of the video.'),
  videoTags: z.string().describe('The original tags of the video, comma separated.'),
  videoCategory: z.string().describe('The category of the video.'),
  script: z.string().describe('The script of the video.'),
});
export type OptimizeYoutubeUploadInput = z.infer<
  typeof OptimizeYoutubeUploadInputSchema
>;

const OptimizeYoutubeUploadOutputSchema = z.object({
  optimizedTitle: z.string().describe('The SEO-optimized title for the video.'),
  optimizedDescription: z
    .string()
    .describe('The SEO-optimized description for the video.'),
  optimizedTags: z.array(z.string()).describe('The SEO-optimized tags for the video.'),
  optimizedCategory: z.string().describe('The SEO-optimized category for the video.'),
  suggestedUploadTime: z
    .string()
    .describe('The suggested day and time to upload the video for maximum reach (e.g., "Saturday at 2:00 PM EST").'),
});
export type OptimizeYoutubeUploadOutput = z.infer<
  typeof OptimizeYoutubeUploadOutputSchema
>;

export async function optimizeYoutubeUpload(
  input: OptimizeYoutubeUploadInput
): Promise<OptimizeYoutubeUploadOutput> {
  return optimizeYoutubeUploadFlow(input);
}

const optimizeYoutubeUploadPrompt = ai.definePrompt({
  name: 'optimizeYoutubeUploadPrompt',
  input: {schema: OptimizeYoutubeUploadInputSchema},
  output: {schema: OptimizeYoutubeUploadOutputSchema},
  config: {
    safetySettings: [
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ]
  },
  prompt: `You are an expert YouTube SEO specialist and growth hacker. Your goal is to optimize video metadata to improve search ranking and visibility, and to suggest the best time to upload for maximum impact. The generated content must be advertiser-friendly and compliant with YouTube's community guidelines.

  Given the following video details, generate an optimized title, description, tags, and suggest the best upload time. Ensure that the optimized metadata is relevant, engaging, and incorporates relevant keywords.

  Original Title: {{{videoTitle}}}
  Original Description: {{{videoDescription}}}
  Original Tags: {{{videoTags}}}
  Original Category: {{{videoCategory}}}
  Video Script: {{{script}}}

  Instructions:

  - Title: Create a concise and attention-grabbing title (under 60 characters) that includes primary keywords.
  - Description: Write a detailed and keyword-rich description (up to 5000 characters) that provides context and encourages viewers to watch the video. Include a call to action (e.g., subscribe, watch more).
  - Tags: Extract the top 10 most relevant keywords from the video content and provide them as a comma-separated list.
  - Category: select the best suitable category for the video
  - Suggested Upload Time: Analyze the video's category and topic to suggest the optimal day and time for uploading to reach the target audience and maximize initial views. Provide this as a string (e.g., "Saturday at 2:00 PM EST").

  Output the optimized title, description, tags, category, and suggested upload time in JSON format.
  `,
});

const optimizeYoutubeUploadFlow = ai.defineFlow(
  {
    name: 'optimizeYoutubeUploadFlow',
    inputSchema: OptimizeYoutubeUploadInputSchema,
    outputSchema: OptimizeYoutubeUploadOutputSchema,
  },
  async input => {
    const {output} = await optimizeYoutubeUploadPrompt(input);
    if (!output) {
        throw new Error("Failed to get optimization suggestions from AI.");
    }
    return {
      optimizedTitle: output.optimizedTitle,
      optimizedDescription: output.optimizedDescription,
      optimizedTags: output.optimizedTags,
      optimizedCategory: output.optimizedCategory,
      suggestedUploadTime: output.suggestedUploadTime,
    };
  }
);
