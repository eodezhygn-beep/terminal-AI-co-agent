const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_URL = 'https://api.openrouter.ai/v1/chat/completions';

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
    throw new Error(`AI provider error: ${response.status} ${response.statusText} - ${text}`);
  }

  return response.json();
}

async function openaiCall(prompt, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  const url = process.env.AI_BASE_URL || OPENAI_URL;
  const model = process.env.AI_MODEL || 'gpt-3.5-turbo';

  const payload = {
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: options.maxTokens || 500
  };

  const body = await postJson(url, payload, apiKey);
  return body.choices?.[0]?.message?.content?.trim() ?? '';
}

async function openrouterCall(prompt, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const url = process.env.AI_BASE_URL || OPENROUTER_URL;
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  const payload = {
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: options.maxTokens || 500
  };

  const body = await postJson(url, payload, apiKey);
  return body.choices?.[0]?.message?.content?.trim() ?? '';
}

export async function callAI(prompt, options = {}) {
  const provider = providerFromEnv();
  if (!provider) {
    throw new Error('No AI provider configured. Set OPENAI_API_KEY or OPENROUTER_API_KEY.');
  }

  if (!prompt || !prompt.trim()) {
    throw new Error('AI prompt cannot be empty.');
  }

  if (provider === 'openai') {
    return openaiCall(prompt, options);
  }

  return openrouterCall(prompt, options);
}

export function getProvider() {
  return providerFromEnv();
}
