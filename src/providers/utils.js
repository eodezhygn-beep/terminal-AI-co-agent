export async function postJson(url, body, apiKey, providerName) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
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
    if (response.status === 401) {
      throw new Error(`${providerName} authentication failed. Check the API key and .env variables for the configured provider.`);
    }
    throw new Error(`${providerName} error ${response.status} ${response.statusText} at ${url} - ${text}`);
  }

  return response.json();
}
