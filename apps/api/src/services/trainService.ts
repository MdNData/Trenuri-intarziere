import { db, trains, trainStops } from "@cfr-tracker/db";
import { eq, and } from "drizzle-orm";
import { TrainData } from "../scraper/index.js";

/**
 * Saves or updates scraped train data in the database.
 */
export async function saveScrapedTrain(data: TrainData): Promise<string> {
  // Check if train already exists for the given trainNumber and date
  const existing = await db
    .select()
    .from(trains)
    .where(and(eq(trains.trainNumber, data.trainNumber), eq(trains.date, data.date)))
    .limit(1);

  let trainId: string;

  if (existing.length > 0) {
    trainId = existing[0].id;
    // Update existing train header
    await db
      .update(trains)
      .set({
        finalDelayMinutes: data.finalDelayMinutes,
        status: data.status,
        lastScrapedAt: new Date(),
        route: data.route,
        trainType: data.trainType,
      })
      .where(eq(trains.id, trainId));

    // Clear old stops and re-insert the new ones to keep it simple and clean
    await db.delete(trainStops).where(eq(trainStops.trainId, trainId));
  } else {
    // Create new train header
    const [newTrain] = await db
      .insert(trains)
      .values({
        trainNumber: data.trainNumber,
        trainType: data.trainType,
        route: data.route,
        departureStation: data.departureStation,
        arrivalStation: data.arrivalStation,
        date: data.date,
        finalDelayMinutes: data.finalDelayMinutes,
        status: data.status,
      })
      .returning();
    trainId = newTrain.id;
  }

  // Insert all stops
  if (data.stops.length > 0) {
    await db.insert(trainStops).values(
      data.stops.map((stop) => ({
        trainId,
        ...stop,
      }))
    );
  }

  return trainId;
}
