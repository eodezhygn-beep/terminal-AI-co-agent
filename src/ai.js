import { chooseProviderAndModel, getConfiguredDefaultProvider } from './providers/index.js';

export async function callAI(prompt, options = {}) {
  if (!prompt || !prompt.trim()) {
    throw new Error('AI prompt cannot be empty.');
  }

  const { provider, model } = chooseProviderAndModel({ explicitModel: options.model, prompt });
  return provider.createCompletion({ prompt, model, maxTokens: options.maxTokens || 500 });
}

export function getProvider() {
  return getConfiguredDefaultProvider()?.name || null;
}

export function resolveAIProviderName(prompt, model = null) {
  return chooseProviderAndModel({ explicitModel: model, prompt }).provider.name;
}
