import { db, trainStops, trains } from "@cfr-tracker/db";
import { eq, and } from "drizzle-orm";

async function dumpStops() {
  const train = await db.select().from(trains)
    .where(and(eq(trains.trainNumber, "12992"), eq(trains.date, "02.07.2026")))
    .limit(1);

  if (train.length > 0) {
    const stops = await db.select().from(trainStops).where(eq(trainStops.trainId, train[0].id));
    console.log(`TOTAL STOPS FOR 12992: ${stops.length}`);
    stops.sort((a, b) => a.stationOrder - b.stationOrder);
    stops.forEach(s => {
      console.log(`Order ${s.stationOrder}: "${s.stationName}" (km ${s.stationKm}) Arr: ${s.scheduledArrival}/${s.actualArrival} Dep: ${s.scheduledDeparture}/${s.actualDeparture} Delay: ${s.delayMinutes}`);
    });
  } else {
    console.log("Train not found");
  }
}

dumpStops();
