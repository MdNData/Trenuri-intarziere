import { scrapeTrain } from "./scraper/index.js";
import { saveScrapedTrain } from "./services/trainService.js";
import { db, trains } from "@cfr-tracker/db";
import { eq, or } from "drizzle-orm";

// List of default trains to monitor (fallback / core trains)
const DEFAULT_ACTIVE_TRAINS = ["12992", "12990", "1994", "1921", "1645", "1633"];

// Helper to format date in DD.MM.YYYY
function getFormattedDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function startWorker() {
  console.log("[Worker] Scraper Worker started!");

  // Run immediately on startup
  runScraperCycle();

  // Run every 15 minutes to keep history updated
  setInterval(runScraperCycle, 15 * 60 * 1000);
}

async function runScraperCycle() {
  console.log(`[Worker] Starting scheduled scraping cycle at ${new Date().toISOString()}`);

  // Discover all trains for today and yesterday in our DB to update them too
  let trainsToScrape = [...DEFAULT_ACTIVE_TRAINS];
  try {
    const todayStr = getFormattedDate(new Date());
    const yesterdayStr = getFormattedDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

    const recentDbTrains = await db
      .select({ trainNumber: trains.trainNumber })
      .from(trains)
      .where(or(eq(trains.date, todayStr), eq(trains.date, yesterdayStr)));

    const numbers = recentDbTrains.map((t) => t.trainNumber);
    // Combine and deduplicate
    trainsToScrape = Array.from(new Set([...DEFAULT_ACTIVE_TRAINS, ...numbers]));
    console.log(`[Worker] Discovered ${trainsToScrape.length} trains to update (recent searches + defaults)`);
  } catch (error) {
    console.error("[Worker] Failed to query recent train numbers from DB, using defaults:", error);
  }

  for (const trainNo of trainsToScrape) {
    try {
      console.log(`[Worker] Scraping train ${trainNo}...`);
      
      // Delay between scrapes to avoid rate limit (3 to 6 seconds)
      const delay = 3000 + Math.random() * 3000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      const data = await scrapeTrain(trainNo);
      await saveScrapedTrain(data);

      console.log(`[Worker] Train ${trainNo} successfully updated. Final delay: ${data.finalDelayMinutes} min`);
    } catch (error: any) {
      console.error(`[Worker] Failed to process train ${trainNo}:`, error.message);
    }
  }
  console.log(`[Worker] Scraping cycle finished.`);
}
