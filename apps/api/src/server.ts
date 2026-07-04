import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { db, trains, trainStops } from '@cfr-tracker/db'
import { eq, and, desc, sql } from 'drizzle-orm'
import { cors } from 'hono/cors'
import { scrapeTrain } from './scraper/index.js'
import { saveScrapedTrain } from './services/trainService.js'
import { startWorker } from './worker.js'

const app = new Hono()

app.use('*', cors({
  origin: ['http://localhost:3003'],
}))

// === Health ===
app.get('/', (c) => c.json({ status: 'ok', api: 'CFR Tracker API v1' }))

app.get('/health', async (c) => {
  try {
    await db.select().from(trains).limit(1)
    return c.json({ status: 'ok', database: 'connected' })
  } catch (e: any) {
    return c.json({ status: 'error', database: 'disconnected', error: e.message }, 500)
  }
})

// === Trains API ===

/**
 * GET /api/trains?date=DD.MM.YYYY
 * Returns all trains saved in the DB for a specific date.
 */
app.get('/api/trains', async (c) => {
  const date = c.req.query('date')
  try {
    let query = db.select().from(trains).orderBy(desc(trains.lastScrapedAt)).limit(50)
    if (date) {
      query = db.select().from(trains).where(eq(trains.date, date)).orderBy(desc(trains.lastScrapedAt)).limit(50) as any
    }
    const results = await query
    return c.json(results)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

/**
 * GET /api/trains/:trainNumber/:date
 * Returns a specific train with ALL its stops for a specific date.
 */
app.get('/api/trains/:trainNumber/:date', async (c) => {
  let { trainNumber, date } = c.req.param()
  trainNumber = trainNumber.replace(/\D/g, '')

  // Helper to check if date is today or yesterday
  const isTodayOrYesterday = (dateStr: string): boolean => {
    try {
      const [d, m, y] = dateStr.split('.').map(Number);
      const trainDate = new Date(y, m - 1, d);
      trainDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      return trainDate.getTime() >= yesterday.getTime();
    } catch {
      return false;
    }
  };

  try {
    // 1. Check if the train exists in our database
    const [existingTrain] = await db.select().from(trains)
      .where(and(eq(trains.trainNumber, trainNumber), eq(trains.date, date)))
      .limit(1)

    let train = existingTrain;
    let shouldScrape = false;

    if (!train) {
      // If it doesn't exist, we must scrape it live so the user gets the page immediately
      shouldScrape = true;
      console.log(`[API] Train ${trainNumber} on ${date} not in database. Scraping live...`);
    } else {
      // If it exists, check if it's stale (older than 10 minutes) AND is for today or yesterday
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const isStale = new Date(train.lastScrapedAt) < tenMinutesAgo;
      const isRecent = isTodayOrYesterday(date);

      if (isStale && isRecent) {
        shouldScrape = true;
        console.log(`[API] Train ${trainNumber} on ${date} is stale (last scraped at ${train.lastScrapedAt}). Scraping live...`);
      }
    }

    if (shouldScrape) {
      try {
        // Trigger live scrape and save to database
        const scrapedData = await scrapeTrain(trainNumber, date);
        const newTrainId = await saveScrapedTrain(scrapedData);
        
        // Fetch the updated train header
        const [updatedTrain] = await db.select().from(trains)
          .where(eq(trains.id, newTrainId))
          .limit(1);
        
        train = updatedTrain;
      } catch (scrapeErr: any) {
        console.error(`[API] Failed live scrape for ${trainNumber} on ${date}:`, scrapeErr.message);
        // If we have existing database data, fall back to it rather than returning 404
        if (!train) {
          return c.json({ error: `Train not found or scrape failed: ${scrapeErr.message}`, trainNumber, date }, 404);
        }
      }
    }

    const stops = await db.select().from(trainStops)
      .where(eq(trainStops.trainId, train.id))
      .orderBy(trainStops.stationOrder)

    // Calculate historical average delays for each station of this train number in the last 90 days
    let avgMap: Record<string, number> = {};
    try {
      const averages = await db
        .select({
          stationName: trainStops.stationName,
          avgDelay: sql<number>`round(avg(${trainStops.delayMinutes}))::integer`
        })
        .from(trainStops)
        .innerJoin(trains, eq(trainStops.trainId, trains.id))
        .where(
          and(
            eq(trains.trainNumber, trainNumber),
            sql`trains.created_at >= now() - interval '90 days'`,
            // Exclude today's in-progress trains: only include today's data if the train
            // has a real final status (not still running with CFR estimates).
            // Past days are always real data so they are always included.
            sql`(${trains.date} != to_char(now() AT TIME ZONE 'Europe/Bucharest', 'DD.MM.YYYY') OR ${trainStops.status} != 'UNKNOWN')`
          )
        )
        .groupBy(trainStops.stationName);
      
      averages.forEach(row => {
        avgMap[row.stationName] = row.avgDelay;
      });
    } catch (avgErr) {
      console.error(`[API] Failed to fetch historical averages for train ${trainNumber}:`, avgErr);
    }

    const stopsWithAverages = stops.map(stop => ({
      ...stop,
      avgDelayMinutes: avgMap[stop.stationName] ?? null
    }));

    return c.json({ ...train, stops: stopsWithAverages })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

/**
 * POST /api/scrape
 * Body: { trainNumber: "12992", date?: "03.07.2026" }
 * Triggers a live scrape from CFR, saves to DB, returns the data.
 */
app.post('/api/scrape', async (c) => {
  const body = await c.req.json()
  let { trainNumber, date } = body

  if (!trainNumber) {
    return c.json({ error: 'trainNumber is required' }, 400)
  }

  trainNumber = String(trainNumber).replace(/\D/g, '')

  try {
    const data = await scrapeTrain(trainNumber, date)
    await saveScrapedTrain(data)
    return c.json({ success: true, data })
  } catch (e: any) {
    console.error(`[API] Scrape error for ${trainNumber}:`, e)
    return c.json({ success: false, error: e.message }, 500)
  }
})

/**
 * GET /api/available-dates
 * Returns a list of unique dates where we already have trains saved in the DB.
 */
app.get('/api/available-dates', async (c) => {
  try {
    const records = await db
      .select({ date: trains.date })
      .from(trains)
      .groupBy(trains.date)
    
    const dates = records.map(r => r.date)
    return c.json({ success: true, dates })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// === Start Server ===
const port = 3002
serve({ fetch: app.fetch, port })
console.log(`[API] CFR Tracker running on http://localhost:${port}`)

// === Start Scraper Worker ===
startWorker()
