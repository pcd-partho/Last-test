
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting the next video to create based on a content strategy.
 *
 * It exports:
 * - `suggestContentStrategy`: An async function that returns the type of video to create next.
 * - `SuggestContentStrategyInput`: The input type for the `suggestContentStrategy` function.
 * - `SuggestContentStrategyOutput`: The output type for the `suggestContentStrategy` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestContentStrategyInputSchema = z.object({
  todaysShorts: z.number().describe('The number of short videos created today.'),
  thisWeeksLongs: z.number().describe('The number of long videos created this week.'),
});
export type SuggestContentStrategyInput = z.infer<typeof SuggestContentStrategyInputSchema>;

const SuggestContentStrategyOutputSchema = z.object({
  videoType: z.enum(['short', 'long', 'none']).describe("The type of video to create next ('short', 'long'), or 'none' if the schedule is full."),
});
export type SuggestContentStrategyOutput = z.infer<typeof SuggestContentStrategyOutputSchema>;

export async function suggestContentStrategy(input: SuggestContentStrategyInput): Promise<SuggestContentStrategyOutput> {
  return suggestContentStrategyFlow(input);
}

const suggestContentStrategyFlow = ai.defineFlow(
  {
    name: 'suggestContentStrategyFlow',
    inputSchema: SuggestContentStrategyInputSchema,
    outputSchema: SuggestContentStrategyOutputSchema,
  },
  async (input) => {
    const prompt = ai.definePrompt({
      name: 'suggestContentStrategyPrompt',
      input: { schema: SuggestContentStrategyInputSchema },
      output: { schema: SuggestContentStrategyOutputSchema },
      prompt: `You are an AI content strategist for a YouTube channel. Your goal is to maintain a strict, daily content schedule.

      The content strategy is as follows:
      - **Daily Goal**: Create 3 short videos.
      - **Weekly Goal**: Create 2 long-form videos.
      
      Based on the number of videos already created, decide what to do next.

      Here is the current status:
      - Shorts created today: {{todaysShorts}}
      - Long-form videos created this week: {{thisWeeksLongs}}

      Analyze the status and decide the next action.
      - If the daily short video goal (3) is not met, return 'short'.
      - If the daily short goal is met, but the weekly long-form goal (2) is not, return 'long'.
      - If all goals are met, return 'none'.
      `,
    });

    const { output } = await prompt(input);
    
    if (!output) {
      throw new Error("Could not get a content strategy suggestion from the AI.");
    }

    return output;
  }
);
