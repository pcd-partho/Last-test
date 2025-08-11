
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting video series topics, including whether to create a new series or extend an existing one.
 *
 * It exports:
 * - `suggestSeriesStrategy`: An async function that returns a topic suggestion and a playlist name.
 * - `SuggestSeriesStrategyInput`: The input type for the `suggestSeriesStrategy` function.
 * - `SuggestSeriesStrategyOutput`: The output type for the `suggestSeriesStrategy` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestSeriesStrategyInputSchema = z.object({
  existingPlaylists: z.array(z.string()).optional().describe('A list of existing YouTube playlists or series names.'),
});
export type SuggestSeriesStrategyInput = z.infer<typeof SuggestSeriesStrategyInputSchema>;

const SuggestSeriesStrategyOutputSchema = z.object({
  topic: z.string().describe('An engaging topic for a YouTube video series. This could be a new topic or the topic of an existing series to extend.'),
  playlist: z.string().describe('The name of the YouTube playlist for the series. For a new series, this should be a new name. For an existing series, this should be the existing playlist name.'),
  isNewSeries: z.boolean().describe('Whether this is a new series or an extension of an existing one.'),
});
export type SuggestSeriesStrategyOutput = z.infer<typeof SuggestSeriesStrategyOutputSchema>;

export async function suggestSeriesStrategy(input: SuggestSeriesStrategyInput): Promise<SuggestSeriesStrategyOutput> {
  return suggestSeriesStrategyFlow(input);
}

const suggestSeriesStrategyFlow = ai.defineFlow(
  {
    name: 'suggestSeriesStrategyFlow',
    inputSchema: SuggestSeriesStrategyInputSchema,
    outputSchema: SuggestSeriesStrategyOutputSchema,
  },
  async ({ existingPlaylists }) => {
    const prompt = ai.definePrompt({
        name: 'suggestSeriesTopicsPrompt',
        input: { schema: SuggestSeriesStrategyInputSchema },
        output: { schema: SuggestSeriesStrategyOutputSchema },
        config: {
            safetySettings: [
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            ]
        },
        prompt: `You are a YouTube content strategy expert. Your goal is to decide the next video series to create, ensuring the topics are advertiser-friendly and compliant with YouTube's community guidelines.
        
        Analyze the list of existing series playlists provided. Based on these, decide whether to:
        1.  **Extend an existing series**: If you see a strong, popular topic that could be expanded upon, suggest the same topic and playlist name, and set isNewSeries to false.
        2.  **Create a new series**: If it's better to start fresh, generate a single, highly engaging, and trending topic for a new video series. The topic should be in a high-value category like 'Technology', 'AI', 'Business', 'Education', or 'Self-Help' and have broad appeal. Suggest a creative and fitting playlist name for this new series and set isNewSeries to true.

        {{#if existingPlaylists}}
        Here are the existing playlists:
        {{#each existingPlaylists}}
        - {{this}}
        {{/each}}
        {{else}}
        There are no existing series yet. Please suggest a topic for the first series.
        {{/if}}

        Provide your response in JSON format.`,
    });

    const { output } = await prompt({ existingPlaylists });

    if (!output) {
        throw new Error("Could not get a topic suggestion from the AI Content Strategist.");
    }
    
    return output;
  }
);
