/**
 * Rate limiter utility for managing API request pacing and retries
 * Prevents bursting requests and handles 429 rate limit errors gracefully
 */

/**
 * Creates a request limiter that paces requests and limits concurrency
 * @param {Object} options - Configuration options
 * @param {number} options.minIntervalMs - Minimum time between requests (default: 300ms)
 * @param {number} options.maxConcurrency - Maximum concurrent requests (default: 1)
 * @returns {Function} Schedule function that queues and paces requests
 */
export function makeLimiter({ minIntervalMs = 300, maxConcurrency = 1 } = {}) {
  let last = 0;
  let inFlight = 0;
  const queue = [];
  
  const runNext = () => {
    if (!queue.length) return;
    if (inFlight >= maxConcurrency) return;

    const now = Date.now();
    const wait = Math.max(0, last + minIntervalMs - now);
    const { fn, resolve, reject } = queue.shift();
    inFlight++;
    
    setTimeout(async () => {
      last = Date.now();
      try {
        const out = await fn();
        resolve(out);
      } catch (e) {
        reject(e);
      } finally {
        inFlight--;
        runNext();
      }
    }, wait);
  };

  return function schedule(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      runNext();
    });
  };
}

/**
 * Wraps a fetch call with intelligent retry logic for 429 rate limit errors
 * Respects Retry-After header and uses exponential backoff
 * @param {Function} doFetch - Function that returns a fetch promise
 * @param {Object} options - Retry configuration
 * @param {number} options.tries - Maximum retry attempts (default: 3)
 * @returns {Promise<Response>} Fetch response or last 429 error
 */
export async function with429Retry(doFetch, { tries = 3 } = {}) {
  let lastErr;
  
  for (let i = 0; i < tries; i++) {
    const res = await doFetch();
    
    // Success or non-429 error - return immediately
    if (res.status !== 429) return res;
    
    lastErr = res;
    
    // Parse Retry-After header (seconds or HTTP date)
    const retryAfter = res.headers.get('retry-after');
    let backoffMs;
    
    if (retryAfter) {
      const ra = parseInt(retryAfter, 10);
      if (!isNaN(ra)) {
        // Retry-After is in seconds
        backoffMs = ra * 1000;
      } else {
        // Retry-After is an HTTP date
        const retryDate = new Date(retryAfter);
        backoffMs = Math.max(0, retryDate.getTime() - Date.now());
      }
    } else {
      // Exponential backoff: 3s, 6s, 12s (capped at 15s with jitter)
      backoffMs = Math.min(3000 * Math.pow(2, i) + Math.random() * 500, 15000);
    }
    
    console.log(`🔄 [RETRY] 429 rate limit hit, retrying in ${(backoffMs / 1000).toFixed(1)}s (attempt ${i + 1}/${tries})`);
    await new Promise(r => setTimeout(r, backoffMs));
  }
  
  console.error('❌ [RETRY] Failed after max retries, still getting 429');
  return lastErr; // Still 429 after all retries
}

/**
 * Logs rate limit headers from OpenAI for monitoring
 * @param {Response} response - Fetch response object
 * @param {string} provider - Provider name for logging
 */
export function logRateLimitHeaders(response, provider = 'OpenAI') {
  const remaining = response.headers.get('x-ratelimit-remaining-requests');
  const limit = response.headers.get('x-ratelimit-limit-requests');
  const reset = response.headers.get('x-ratelimit-reset-requests');
  
  if (remaining || limit) {
    console.log(`📊 [${provider}] Rate limit: ${remaining}/${limit} requests remaining${reset ? `, resets at ${reset}` : ''}`);
  }
}