const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const OPENROUTER_EMBED_URL = 'https://api.openrouter.ai/v1/embeddings';

function providerFromEnv() {
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  return null;
}

async function postJson(url, body, apiKey) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Embedding provider error: ${response.status} ${response.statusText} - ${text}`);
  }

  return response.json();
}

async function openaiEmbed(text, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  const url = process.env.AI_BASE_URL || OPENAI_EMBED_URL;
  const model = process.env.AI_MODEL || 'text-embedding-3-small';

  const body = { model, input: text };
  const json = await postJson(url, body, apiKey);
  return json.data?.[0]?.embedding ?? [];
}

async function openrouterEmbed(text, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const url = process.env.AI_BASE_URL || OPENROUTER_EMBED_URL;
  const model = process.env.AI_MODEL || 'text-embedding-3-small';

  const body = { model, input: text };
  const json = await postJson(url, body, apiKey);
  return json.data?.[0]?.embedding ?? [];
}

export async function embedText(text, options = {}) {
  const provider = providerFromEnv();
  if (!provider) {
    return Array.from({ length: 16 }, () => 0);
  }

  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string.');
  }

  if (provider === 'openai') {
    return openaiEmbed(text, options);
  }
  return openrouterEmbed(text, options);
}

export function getEmbeddingProvider() {
  return providerFromEnv();
}
