
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-video-script.ts';
import '@/ai/flows/optimize-youtube-upload.ts';
import '@/ai/flows/create-ai-video.ts';
import '@/ai/flows/check-video-status.ts';
import '@/ai/flows/generate-thumbnail.ts';
import '@/ai/flows/suggest-series-topics.ts';
import '@/ai/flows/generate-speech-audio.ts';
import '@/ai/flows/suggest-content-strategy.ts';
import '@/ai/flows/upload-to-youtube.ts';
