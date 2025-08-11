
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating video scripts.
 * It can be inspired by existing YouTube videos to improve content quality.
 *
 * It exports:
 * - `generateVideoScript`: An async function to generate a video script.
 * - `GenerateVideoScriptInput`: The input type for the generateVideoScript function.
 * - `GenerateVideoScriptOutput`: The output type for the generateVideoScript function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Tool to get a transcript from a YouTube video.
// In a real application, this would use a library like `youtube-transcript`.
// For this prototype, it returns a hardcoded example transcript.
const getYouTubeVideoTranscript = ai.defineTool(
    {
        name: 'getYouTubeVideoTranscript',
        description: 'Retrieves the transcript of a given YouTube video URL.',
        inputSchema: z.object({
            url: z.string().describe('The URL of the YouTube video.'),
        }),
        outputSchema: z.string(),
    },
    async ({url}) => {
        console.log(`Faking transcript fetch for URL: ${url}`);
        return `(Intro music fades) Hello everyone, and welcome back to the channel! Today, we're diving deep into one of the most exciting topics in modern technology: quantum computing. We'll break down what it is, how it works, and why it's poised to change the world. Make sure you stick around to the end, because we've got a simplified explanation that makes it easy for anyone to understand. (Upbeat transition) So, what exactly IS quantum computing? Unlike classical computers that store information in bits as either a 0 or a 1, quantum computers use something called 'qubits'. Now, a qubit can be a 0, a 1, or both at the same time! This is called superposition, and it's the first key to a quantum computer's power... (and so on).`;
    }
);


const GenerateVideoScriptInputSchema = z.object({
  topic: z.string().optional().describe('A specific topic for the video script. If not provided, a trending topic will be selected.'),
  length: z.enum(['short', 'long']).default('short').describe('The desired length of the video script.'),
  videoTitle: z.string().optional().describe('A specific title for the video if one is provided.'),
  inspirationVideoUrl: z.string().optional().describe('The URL of a YouTube video to use as inspiration for the tone, style, and structure.'),
});
export type GenerateVideoScriptInput = z.infer<typeof GenerateVideoScriptInputSchema>;

const GenerateVideoScriptOutputSchema = z.object({
  script: z.string().describe('The generated video script.'),
  topic: z.string().describe('The topic used to generate the script.'),
  title: z.string().describe('The generated title for the video.'),
});
export type GenerateVideoScriptOutput = z.infer<typeof GenerateVideoScriptOutputSchema>;

export async function generateVideoScript(input: GenerateVideoScriptInput): Promise<GenerateVideoScriptOutput> {
  return generateVideoScriptFlow(input);
}

const generateVideoScriptFlow = ai.defineFlow(
  {
    name: 'generateVideoScriptFlow',
    inputSchema: GenerateVideoScriptInputSchema,
    outputSchema: GenerateVideoScriptOutputSchema,
  },
  async input => {
    const topic = input.topic || "a trending topic";
    const scriptLength = input.length === 'long' ? 'a detailed 5-10 minute' : 'a short, concise 1-minute';
    
    const prompt = ai.definePrompt({
        name: 'generateVideoScriptPrompt',
        tools: [getYouTubeVideoTranscript],
        input: {schema: z.object({ topic: z.string(), scriptLength: z.string(), videoTitle: z.string().optional(), inspirationVideoUrl: z.string().optional() })},
        output: {schema: z.object({ script: z.string(), title: z.string(), topic: z.string().optional() })},
        config: {
            safetySettings: [
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            ]
        },
        prompt: `You are an expert content creator. Your task is to generate a video script that is advertiser-friendly and compliant with YouTube's community guidelines.
        
        The topic for the script is: "{{topic}}".
        
        The script should be {{scriptLength}} in length.
        
        {{#if videoTitle}}The title of this specific video should be: "{{videoTitle}}".{{/if}}

        {{#if inspirationVideoUrl}}
        To improve the content quality, you should draw inspiration from this video: {{inspirationVideoUrl}}.
        First, use the 'getYouTubeVideoTranscript' tool to get its transcript.
        Then, analyze the transcript to understand its tone, style, and structure. Use these insights to create a new, high-quality script on the given topic. Do NOT copy the script; use it as a model for quality and engagement.
        {{/if}}

        The script should be engaging, informative, and well-structured. It must include a compelling title (if one isn't provided), an introduction, main points, and a conclusion.
        
        If the provided topic was generic (e.g., "a trending topic"), you must also return the specific topic you chose in the 'topic' field of the output.`,
    });

    const {output} = await prompt(input);

    if(!output) {
      throw new Error('Could not generate script');
    }

    return {
        script: output.script,
        topic: output.topic || topic,
        title: input.videoTitle || output.title,
    };
  }
);
