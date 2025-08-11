
'use server';

/**
 * @fileOverview A flow to generate speech audio from a script.
 *
 * - generateSpeechAudio - A function that handles the speech generation process.
 * - GenerateSpeechAudioInput - The input type for the generateSpeechAudio function.
 * - GenerateSpeechAudioOutput - The return type for the generateSpeechAudio function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

const GenerateSpeechAudioInputSchema = z.object({
  script: z.string().describe('The script to be converted to speech.'),
});
export type GenerateSpeechAudioInput = z.infer<typeof GenerateSpeechAudioInputSchema>;

const GenerateSpeechAudioOutputSchema = z.object({
  audioDataUri: z.string().describe("The generated audio as a data URI in WAV format. Expected format: 'data:audio/wav;base64,<encoded_data>'."),
});
export type GenerateSpeechAudioOutput = z.infer<typeof GenerateSpeechAudioOutputSchema>;

export async function generateSpeechAudio(input: GenerateSpeechAudioInput): Promise<GenerateSpeechAudioOutput> {
  return generateSpeechAudioFlow(input);
}

const generateSpeechAudioFlow = ai.defineFlow(
  {
    name: 'generateSpeechAudioFlow',
    inputSchema: GenerateSpeechAudioInputSchema,
    outputSchema: GenerateSpeechAudioOutputSchema,
  },
  async ({script}) => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {voiceName: 'Algenib'},
          },
        },
      },
      prompt: script,
    });
    if (!media) {
      throw new Error('no media returned');
    }
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    
    const wavData = await toWav(audioBuffer);

    return {
      audioDataUri: 'data:audio/wav;base64,' + wavData,
    };
  }
);

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
