import { GoogleGenAI } from '@google/genai';

import { REQUEST_TIMEOUT_MS } from './constants.mjs';
import {
  RESPONSE_JSON_SCHEMA,
  SYSTEM_INSTRUCTION,
  toModelPayload,
} from './schema.mjs';

const THINKING_API = {
  minimal: 'MINIMAL',
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
};

export function buildGenerateConfig({ thinking } = {}) {
  const config = {
    responseMimeType: 'application/json',
    responseJsonSchema: RESPONSE_JSON_SCHEMA,
    systemInstruction: SYSTEM_INSTRUCTION,
  };
  if (thinking) {
    config.thinkingConfig = {
      thinkingLevel: THINKING_API[thinking],
      includeThoughts: false,
    };
  }
  return config;
}

export function createGeminiGenerate({
  apiKey,
  timeoutMs = REQUEST_TIMEOUT_MS,
  GoogleGenAICtor = GoogleGenAI,
} = {}) {
  const ai = new GoogleGenAICtor({
    apiKey,
    httpOptions: {
      timeout: timeoutMs,
      retryOptions: { attempts: 1 },
    },
  });

  return async ({ input, model, thinking }) => {
    return ai.models.generateContent({
      model,
      contents: JSON.stringify(toModelPayload(input)),
      config: buildGenerateConfig({ thinking }),
    });
  };
}
