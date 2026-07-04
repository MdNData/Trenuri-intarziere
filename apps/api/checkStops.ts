import { db, trainStops, trains } from "@cfr-tracker/db";
import { eq, and } from "drizzle-orm";

async function checkStops() {
  const train = await db.select().from(trains)
    .where(and(eq(trains.trainNumber, "12992"), eq(trains.date, "02.07.2026")))
    .limit(1);

  if (train.length > 0) {
    const stops = await db.select().from(trainStops).where(eq(trainStops.trainId, train[0].id)).limit(10);
    console.log(`Stops for train 12992 on 02.07.2026:`);
    stops.forEach(s => {
      console.log(`- "${s.stationName}" (km ${s.stationKm})`);
    });
  } else {
    console.log("Train 12992 on 02.07.2026 not found");
  }
}

checkStops();
