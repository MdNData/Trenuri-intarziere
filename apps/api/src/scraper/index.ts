import * as cheerio from "cheerio";
import { z } from "zod";

// === Zod Schemas ===

export const StopSchema = z.object({
  stationName: z.string(),
  stationKm: z.number().default(0),
  stationOrder: z.number(),
  scheduledArrival: z.string().nullable().default(null),
  actualArrival: z.string().nullable().default(null),
  scheduledDeparture: z.string().nullable().default(null),
  actualDeparture: z.string().nullable().default(null),
  delayMinutes: z.number().default(0),
  status: z.string().default("UNKNOWN"),
  stopDurationMinutes: z.number().default(0),
  isFirstStation: z.boolean().default(false),
  isLastStation: z.boolean().default(false),
});

export const TrainDataSchema = z.object({
  trainNumber: z.string(),
  trainType: z.string(),
  route: z.string(),
  departureStation: z.string(),
  arrivalStation: z.string(),
  date: z.string(),
  finalDelayMinutes: z.number().default(0),
  status: z.string().default("UNKNOWN"),
  stops: z.array(StopSchema),
});

export type TrainData = z.infer<typeof TrainDataSchema>;
export type StopData = z.infer<typeof StopSchema>;

// === Core Scraper ===

/**
 * Scrapes train data from CFR Călători using their 2-step AJAX flow.
 * 
 * Step 1: GET the train page → extract cookies + CSRF token + hidden form fields
 * Step 2: POST to /Trains/TrainsResult with serialized form → get HTML with station data
 */
export async function scrapeTrain(trainNumber: string, date?: string): Promise<TrainData> {
  const today = date || new Date().toLocaleDateString("ro-RO", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  // Step 1: GET the page to get cookies and form tokens
  const pageUrl = `https://bilete.infofer.ro/ro-RO/Trains?TrainRunningNumber=${trainNumber}&Date=${today}`;
  console.log(`[Scraper] Step 1: GET ${pageUrl}`);

  const pageRes = await fetch(pageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
    },
  });

  if (!pageRes.ok) throw new Error(`Infofer page returned ${pageRes.status}`);

  const cookies = pageRes.headers.getSetCookie?.() || [];
  const cookieString = cookies.map((c) => c.split(";")[0]).join("; ");
  const pageHtml = await pageRes.text();
  const $page = cheerio.load(pageHtml);

  // Extract hidden form fields
  const formData: Record<string, string> = {};
  $page("#form-search input[type='hidden']").each((_, el) => {
    const name = $page(el).attr("name");
    const value = $page(el).attr("value") || "";
    if (name) formData[name] = value;
  });

  if (!formData["TrainRunningNumber"]) {
    throw new Error(`Train ${trainNumber} not found on Infofer for date ${today}`);
  }

  // Step 2: POST AJAX to get the actual train results
  const postUrl = "https://bilete.infofer.ro/ro-RO/Trains/TrainsResult";
  console.log(`[Scraper] Step 2: POST ${postUrl}`);

  const resultRes = await fetch(postUrl, {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookieString,
      "X-Requested-With": "XMLHttpRequest",
      "Referer": pageUrl,
    },
    body: new URLSearchParams(formData).toString(),
  });

  if (!resultRes.ok) throw new Error(`Infofer AJAX returned ${resultRes.status}`);
  const resultHtml = await resultRes.text();
  const $ = cheerio.load(resultHtml);

  // Parse train type and route from page content
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  
  // Extract train type - look for the span with category class
  let trainType = "UNKNOWN";
  $(".span-train-category-ir, .span-train-category-irn, .span-train-category-ic, .span-train-category-r, [class*='span-train-category']").each((_, el) => {
    const t = $(el).text().trim().toUpperCase();
    if (t && trainType === "UNKNOWN") trainType = t;
  });
  // Fallback: try from body text
  if (trainType === "UNKNOWN") {
    const typeMatch = bodyText.match(/\b(IRN|IR|IC|ICN|R-E|RE|R)\s+\d+/i);
    if (typeMatch) trainType = typeMatch[1].toUpperCase();
  }

  // Parse all stations from the result HTML
  // Strategy: collect all rows with "km" in them, then deduplicate by station name+km
  const rawStops: Array<{
    stationName: string;
    stationKm: number;
    time: string | null;
    status: string;
    delayMinutes: number;
    stopDuration: number;
  }> = [];

  $(".row").each((_, row) => {
    const rowText = $(row).text().replace(/\s+/g, " ").trim();
    if (!rowText.includes("km ")) return;

    const stationMatch = rowText.match(/^(.+?)\s+km\s+(\d+)/);
    if (!stationMatch) return;

    let stationName = stationMatch[1].trim();
    // 1. Remove times (e.g., 23:52)
    stationName = stationName.replace(/\b\d{1,2}:\d{2}\b/g, "");
    // 2. Remove anything in parentheses (e.g., (întârziere) or (întârziere)*)
    stationName = stationName.replace(/\([^)]*\)\*?/g, "");
    // 3. Remove "la timp" or "la timp*"
    stationName = stationName.replace(/\bla timp\*?/gi, "");
    // 4. Remove minutes and delays (e.g., +68 min, 10 min, +72 min)
    stationName = stationName.replace(/\b\+?\d+\s*min\b/gi, "");
    // 5. Remove leftover delay keywords
    stationName = stationName.replace(/\b[îi]nt[aâ]rziere\b/gi, "");
    // 6. Clean leading/trailing spaces and symbols
    stationName = stationName.replace(/^[\s+*,:-]+/g, "");
    stationName = stationName.trim();

    const stationKm = parseInt(stationMatch[2], 10);
    const times = rowText.match(/\d{1,2}:\d{2}/g) || [];

    let delayMinutes = 0;
    let status = "UNKNOWN";
    if (rowText.includes("la timp")) status = "ON_TIME";

    const delayMatch = rowText.match(/(\d+)\s*min.*?[îi]nt[aâ]rziere/i) || 
                       rowText.match(/[îi]nt[aâ]rziere.*?(\d+)\s*min/i);
    if (delayMatch) {
      delayMinutes = parseInt(delayMatch[1], 10);
      status = "DELAYED";
    }

    let stopDuration = 0;
    const stopMatch = rowText.match(/(\d+)\s*min\s*oprire/i);
    if (stopMatch) stopDuration = parseInt(stopMatch[1], 10);

    // Only add if this row has a time
    if (times.length > 0) {
      rawStops.push({
        stationName,
        stationKm,
        time: times[0],
        status,
        delayMinutes,
        stopDuration,
      });
    }
  });

  // Deduplicate: merge stops with same station name + km
  // Keep only unique stations, combining arrival/departure times
  const seenStations = new Map<string, StopData>();
  let stationOrder = 0;

  for (const raw of rawStops) {
    const key = `${raw.stationName}|${raw.stationKm}`;
    
    if (!seenStations.has(key)) {
      seenStations.set(key, {
        stationName: raw.stationName,
        stationKm: raw.stationKm,
        stationOrder: stationOrder++,
        scheduledArrival: null,
        actualArrival: null,
        scheduledDeparture: raw.time,
        actualDeparture: null,
        delayMinutes: raw.delayMinutes,
        status: raw.status,
        stopDurationMinutes: raw.stopDuration,
        isFirstStation: false,
        isLastStation: false,
      });
    }
    // If we see the same station again, it might have different time info
    // (arrival vs departure), update the delay if higher
    else {
      const existing = seenStations.get(key)!;
      if (raw.delayMinutes > existing.delayMinutes) {
        existing.delayMinutes = raw.delayMinutes;
        existing.status = raw.status;
      }
    }
  }

  const stops = Array.from(seenStations.values());

  // Mark first and last station
  if (stops.length > 0) {
    stops[0].isFirstStation = true;
    stops[stops.length - 1].isLastStation = true;
  }

  // Determine overall train status and route
  const departureStation = stops[0]?.stationName || "Unknown";
  const arrivalStation = stops[stops.length - 1]?.stationName || "Unknown";
  const route = `${departureStation} → ${arrivalStation}`;
  const maxDelay = Math.max(...stops.map((s) => s.delayMinutes), 0);
  const finalDelay = stops[stops.length - 1]?.delayMinutes || maxDelay;
  const overallStatus = finalDelay > 0 ? "DELAYED" : stops.some((s) => s.status === "ON_TIME") ? "ON_TIME" : "UNKNOWN";

  console.log(`[Scraper] Train ${trainType} ${trainNumber}: ${route}, ${stops.length} stops, delay=${finalDelay}min, status=${overallStatus}`);

  return TrainDataSchema.parse({
    trainNumber,
    trainType,
    route,
    departureStation,
    arrivalStation,
    date: today,
    finalDelayMinutes: finalDelay,
    status: overallStatus,
    stops,
  });
}
