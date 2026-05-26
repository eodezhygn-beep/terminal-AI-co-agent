import { getProviderByName, getAvailableProviders } from './providers/index.js';

function getEmbeddingProviderObject() {
  const openrouter = getProviderByName('openrouter');
  if (openrouter?.isAvailable()) {
    return openrouter;
  }

  const openai = getProviderByName('openai');
  if (openai?.isAvailable()) {
    return openai;
  }

  return null;
}

export async function embedText(text, options = {}) {
  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string.');
  }

  const provider = getEmbeddingProviderObject();
  if (!provider) {
    return Array.from({ length: 16 }, () => 0);
  }

  return provider.createEmbedding({ text, model: options.model });
}

export function getEmbeddingProvider() {
  const provider = getEmbeddingProviderObject();
  return provider?.name || 'stub';
}
