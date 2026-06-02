import { postJson } from './utils.js';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_CHAT_MODEL = 'qwen/qwen3-next-80b-a3b-instruct';
const DEFAULT_EMBED_MODEL = 'text-embedding-3-small';

function parseOpenRouterText(content) {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((chunk) => {
        if (!chunk || typeof chunk !== 'object') {
          return '';
        }
        return chunk.text ?? chunk.content ?? '';
      })
      .join('')
      .trim();
  }

  if (content && typeof content === 'object') {
    const text =
      typeof content.text === 'string'
        ? content.text
        : typeof content.content === 'string'
        ? content.content
        : null;
    return text?.trim() || null;
  }

  return null;
}

function parseOpenRouterCompletion(json) {
  if (!json || !Array.isArray(json.choices)) {
    return null;
  }

  for (const choice of json.choices) {
    if (!choice || typeof choice !== 'object') {
      continue;
    }

    const message = choice.message || {};
    const contentCandidates = [
      message.content,
      message.text,
      choice.text,
      choice.content
    ];

    for (const candidate of contentCandidates) {
      const parsed = parseOpenRouterText(candidate);
      if (parsed) {
        return parsed;
      }
    }
  }

  console.warn('OpenRouter response format not recognized, falling back to default parser.', {
    choices: json.choices?.map((choice) => ({
      text: choice?.text,
      content: choice?.content,
      message: choice?.message
    }))
  });

  return null;
}

export default {
  name: 'openrouter',

  isAvailable() {
    return Boolean(process.env.OPENROUTER_API_KEY);
  },

  getDefaultModel() {
    return (
      process.env.AI_MODEL ||
      process.env.DEFAULT_MODEL ||
      process.env.OPENROUTER_MODEL ||
      DEFAULT_CHAT_MODEL
    );
  },

  getDefaultEmbedModel() {
    return process.env.OPENROUTER_EMBED_MODEL || DEFAULT_EMBED_MODEL;
  },

  async createCompletion({ prompt, model, maxTokens = 500 }) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('Missing OPENROUTER_API_KEY in .env');
    }

    const selectedModel = model || this.getDefaultModel();
    const baseUrl = process.env.OPENROUTER_BASE_URL || DEFAULT_BASE_URL;
    const url = `${baseUrl}/chat/completions`;

    const body = {
      model: selectedModel,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: maxTokens
    };

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/eodezhygn-beep/terminal-AI-co-agent',
      'X-Title': 'terminal-ai-co-agent',
      'Content-Type': 'application/json'
    };

    const json = await postJson(
      url,
      body,
      headers,
      'OpenRouter',
      { model: selectedModel }
    );

    return parseOpenRouterCompletion(json) || 'No response from OpenRouter.';
  },

  async createEmbedding({ text, model }) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('Missing OPENROUTER_API_KEY in .env');
    }

    const selectedModel = model || this.getDefaultEmbedModel();
    const baseUrl = process.env.OPENROUTER_BASE_URL || DEFAULT_BASE_URL;
    const url = `${baseUrl}/embeddings`;

    const body = {
      model: selectedModel,
      input: text
    };

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/eodezhygn-beep/terminal-AI-co-agent',
      'X-Title': 'terminal-ai-co-agent',
      'Content-Type': 'application/json'
    };

    const json = await postJson(
      url,
      body,
      headers,
      'OpenRouter',
      { model: selectedModel }
    );

    return json?.data?.[0]?.embedding || [];
  }
};
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
