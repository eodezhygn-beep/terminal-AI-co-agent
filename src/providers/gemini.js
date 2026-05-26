import { postJson } from './utils.js';

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta2/models';
const DEFAULT_MODEL = 'gemini-2.5-flash';

function parseGeminiResponse(json) {
  if (typeof json?.candidates?.[0]?.content === 'string') {
    return json.candidates[0].content.trim();
  }

  const textSegment = json?.output?.[0]?.content?.find((item) => item.type === 'text');
  if (typeof textSegment?.text === 'string') {
    return textSegment.text.trim();
  }

  return '';
}

export default {
  name: 'gemini',
  isAvailable() {
    return Boolean(process.env.GEMINI_API_KEY);
  },
  getDefaultModel() {
    return process.env.AI_MODEL || process.env.DEFAULT_MODEL || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  },
  async createCompletion({ prompt, model, maxTokens = 500 }) {
    const apiKey = process.env.GEMINI_API_KEY;
    const selectedModel = model || this.getDefaultModel();
    const baseUrl = process.env.AI_BASE_URL || DEFAULT_BASE_URL;
    const url = `${baseUrl}/${selectedModel}:generateMessage?key=${encodeURIComponent(apiKey)}`;

    const body = {
      messages: [
        {
          author: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ],
      temperature: 0.2,
      maxOutputTokens: maxTokens
    };

    const json = await postJson(url, body, null, 'Gemini');
    return parseGeminiResponse(json);
  }
};
