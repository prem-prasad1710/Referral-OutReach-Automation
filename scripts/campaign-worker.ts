/**
 * CLI worker for processing running campaigns outside the browser.
 * Usage: npm run worker
 */
import { processCampaignWorker } from "../src/lib/campaign/worker";

const POLL_MS = 5000;

async function loop() {
  console.log("[worker] Starting campaign worker…");
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const result = await processCampaignWorker();
      if (result.processed && result.processed > 0) {
        console.log(
          `[worker] Campaign ${result.campaignId}: sent=${result.sent} failed=${result.failed} remaining=${result.remaining}`,
        );
      }
      if (result.completed) {
        console.log(`[worker] Campaign ${result.campaignId} completed`);
      }
    } catch (err) {
      console.error("[worker] Error:", err);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

loop();
