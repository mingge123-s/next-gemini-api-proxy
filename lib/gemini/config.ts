/**
 * Gemini API configuration and constants
 */

export const GEMINI_MODELS = {
  'gemini-2.5-pro': 'gemini-2.5-pro',
  'gemini-2.5-pro-search': 'gemini-2.5-pro',
  'gemini-2.5-flash': 'gemini-2.5-flash',
  'gemini-2.5-flash-search': 'gemini-2.5-flash',
  'gemini-1.5-pro': 'gemini-1.5-pro',
  'gemini-1.5-pro-search': 'gemini-1.5-pro',
  'gemini-1.5-flash': 'gemini-1.5-flash',
  'gemini-1.5-flash-search': 'gemini-1.5-flash',
} as const;

export type GeminiModelName = keyof typeof GEMINI_MODELS;
export type GeminiActualModel = typeof GEMINI_MODELS[GeminiModelName];

export const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// OpenAI compatible model list for /v1/models endpoint
export const OPENAI_COMPATIBLE_MODELS = Object.keys(GEMINI_MODELS).map(model => ({
  id: model,
  object: 'model',
  created: Date.now(),
  owned_by: 'google',
}));

// Feature detection for search models
export const isSearchModel = (model: string): boolean => {
  return model.endsWith('-search');
};

// Get actual Gemini model name (removes -search suffix)
export const getActualModelName = (model: string): string => {
  if (isSearchModel(model)) {
    return model.replace('-search', '');
  }
  return model;
};