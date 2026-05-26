import { postJson } from './utils.js';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_CHAT_MODEL = 'gpt-3.5-turbo';
const DEFAULT_EMBED_MODEL = 'text-embedding-3-small';

export default {
  name: 'openai',
  isAvailable() {
    return Boolean(process.env.OPENAI_API_KEY);
  },
  getDefaultModel() {
    return process.env.AI_MODEL || process.env.DEFAULT_MODEL || process.env.OPENAI_MODEL || DEFAULT_CHAT_MODEL;
  },
  getDefaultEmbedModel() {
    return process.env.AI_MODEL || process.env.DEFAULT_MODEL || process.env.OPENAI_EMBED_MODEL || DEFAULT_EMBED_MODEL;
  },
  async createCompletion({ prompt, model, maxTokens = 500 }) {
    const apiKey = process.env.OPENAI_API_KEY;
    const url = process.env.AI_BASE_URL || `${DEFAULT_BASE_URL}/chat/completions`;
    const selectedModel = model || this.getDefaultModel();

    const body = {
      model: selectedModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens
    };

    const json = await postJson(url, body, apiKey, 'OpenAI');
    return json.choices?.[0]?.message?.content?.trim() ?? '';
  },
  async createEmbedding({ text, model }) {
    const apiKey = process.env.OPENAI_API_KEY;
    const url = process.env.AI_BASE_URL || `${DEFAULT_BASE_URL}/embeddings`;
    const selectedModel = model || this.getDefaultEmbedModel();

    const body = {
      model: selectedModel,
      input: text
    };

    const json = await postJson(url, body, apiKey, 'OpenAI');
    return json.data?.[0]?.embedding ?? [];
  }
};
