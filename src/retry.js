export async function retryOperation(action, options = {}) {
  const retries = Number(options.retries ?? 2);
  const delayMs = Number(options.delayMs ?? 300);
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}
