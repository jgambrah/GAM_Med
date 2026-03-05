'use server';
import { config } from 'dotenv';
config({ path: '.env.local' });

import '@/ai/flows/ai-discharge-instructions-tool.ts';
import '@/ai/flows/ai-clinical-assistant.ts';
