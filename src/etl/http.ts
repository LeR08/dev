/** Every external call in the ETL gets a timeout and three backed-off retries (§8). */
export async function fetchWithRetry(
  url: string,
  init: RequestInit & { timeoutMs?: number; attempts?: number; label?: string } = {},
): Promise<Response> {
  const { timeoutMs = 60_000, attempts = 3, label = url, ...rest } = init;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...rest,
        signal: controller.signal,
        headers: {
          'User-Agent':
            process.env.ETL_USER_AGENT ??
            'the-smoke-trail/0.1 (+https://github.com/LeR08/dev)',
          ...(rest.headers ?? {}),
        },
      });
      if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const delay = 2 ** attempt * 1000;
        console.warn(`  ${label}: attempt ${attempt} failed (${String(error)}), retrying in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`${label}: all ${attempts} attempts failed: ${String(lastError)}`);
}
