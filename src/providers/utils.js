export async function postJson(url, body, apiKeyOrHeaders, providerName, options = {}) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (apiKeyOrHeaders) {
    if (typeof apiKeyOrHeaders === 'string') {
      headers.Authorization = `Bearer ${apiKeyOrHeaders}`;
    } else if (typeof apiKeyOrHeaders === 'object') {
      Object.assign(headers, apiKeyOrHeaders);
    }
  }

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw new Error(`${providerName} network error at ${url}: ${error.message}`);
  }

  if (!response.ok) {
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (error) {
      json = null;
    }

    if (providerName === 'OpenRouter') {
      throw createOpenRouterError(response.status, response.statusText, json, options);
    }

    if (response.status === 401) {
      throw new Error(`${providerName} authentication failed. Check the API key and .env variables for the configured provider.`);
    }
    if (response.status === 400) {
      throw new Error(`${providerName} bad request. ${text}`);
    }
    if (response.status === 429) {
      throw new Error(`${providerName} rate limit reached. ${text}`);
    }
    if (response.status >= 500) {
      throw new Error(`${providerName} provider/server error ${response.status} ${response.statusText} at ${url} - ${text}`);
    }

    throw new Error(`${providerName} error ${response.status} ${response.statusText} at ${url} - ${text}`);
  }

  return response.json();
}

function createOpenRouterError(status, statusText, json, options) {
  const error = json?.error || {};
  const metadata = error.metadata || {};
  const raw = metadata.raw || error.message || '';
  const retryAfter = metadata.retry_after_seconds;
  const model = options?.model;
  const modelText = model ? ` for ${model}` : '';

  if (status === 401) {
    return new Error('OpenRouter authentication failed. Check OPENROUTER_API_KEY and .env variables for OpenRouter.');
  }

  if (status === 429) {
    let message = `OpenRouter rate limit reached${modelText}.`;
    if (retryAfter) {
      message += `\nRetry after ${retryAfter} seconds.`;
    }
    message += `\n\nTip:\nFree models can be temporarily saturated.\nTry another model or retry shortly.`;
    if (raw) {
      message += `\n\n${raw}`;
    }
    return new Error(message);
  }

  if (status === 400) {
    return new Error(`OpenRouter bad request${modelText}: ${raw || statusText}`);
  }

  if (status >= 500) {
    let message = `OpenRouter provider/server issue${modelText}${retryAfter ? `, retry after ${retryAfter} seconds` : ''}. ${raw || statusText}`;
    return new Error(message);
  }

  return new Error(`OpenRouter error ${status}${modelText ? ` for ${model}` : ''}: ${raw || statusText}`);
}
