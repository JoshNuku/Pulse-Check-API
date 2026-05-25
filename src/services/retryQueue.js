import { config } from '../config/env.js';

export function queueWebhookDispatch(id, url, payload, attempt = 1, delayMs = 0) {
  setTimeout(async () => {
    console.log(`[Webhook Queue] Executing dispatch to ${url} for monitor ${id} (Attempt ${attempt}/${config.MAX_WEBHOOK_RETRIES})`);
    let timeoutId;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), config.WEBHOOK_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Watchdog-Sentinel-API/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (response.ok) {
        console.log(`[Webhook Success] Successfully dispatched alert webhook for monitor ${id} (Response: ${response.status})`);
      } else {
        throw new Error(`Server returned status ${response.status}`);
      }
    } catch (err) {
      console.error(`[Webhook Error] Attempt ${attempt} failed for monitor ${id}: ${err.message}`);

      if (attempt < config.MAX_WEBHOOK_RETRIES) {
        const nextAttempt = attempt + 1;
        const delaySecs = Math.pow(2, attempt); // 2s, 4s, 8s, 16s
        const nextDelayMs = delaySecs * 1000;
        console.log(`[Webhook Retry] Scheduling retry #${nextAttempt} in ${delaySecs}s for monitor ${id}`);
        queueWebhookDispatch(id, url, payload, nextAttempt, nextDelayMs);
      } else {
        console.error(`[Webhook Failure] Max retries (${config.MAX_WEBHOOK_RETRIES}) reached. Discarding webhook for monitor ${id}.`);
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }, delayMs);
}