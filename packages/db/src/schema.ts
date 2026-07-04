import { pgTable, text, timestamp, integer, uuid, boolean, date, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Schema per il database CFR Tracker.
 * 
 * Struttura:
 * - trains: un record per ogni treno univoco in un giorno specifico
 * - trainStops: un record per ogni fermata del treno, con orario previsto vs effettivo
 */

export const trains = pgTable("trains", {
  id: uuid("id").primaryKey().defaultRandom(),
  trainNumber: text("train_number").notNull(),
  trainType: text("train_type").notNull(), // IRN, IR, R, IC, ICN
  route: text("route").notNull(), // es. "Timișoara Nord → Mangalia"
  departureStation: text("departure_station").notNull(),
  arrivalStation: text("arrival_station").notNull(),
  date: text("date").notNull(), // formato DD.MM.YYYY
  finalDelayMinutes: integer("final_delay_minutes").default(0).notNull(),
  status: text("status").notNull().default("UNKNOWN"), // ON_TIME, DELAYED, CANCELLED, UNKNOWN
  lastScrapedAt: timestamp("last_scraped_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("trains_number_date_idx").on(table.trainNumber, table.date),
]);

export const trainStops = pgTable("train_stops", {
  id: uuid("id").primaryKey().defaultRandom(),
  trainId: uuid("train_id").references(() => trains.id, { onDelete: "cascade" }).notNull(),
  stationName: text("station_name").notNull(),
  stationKm: integer("station_km").default(0),
  stationOrder: integer("station_order").notNull(), // ordine sequenziale delle fermate
  scheduledArrival: text("scheduled_arrival"), // formato HH:MM
  actualArrival: text("actual_arrival"),
  scheduledDeparture: text("scheduled_departure"),
  actualDeparture: text("actual_departure"),
  delayMinutes: integer("delay_minutes").default(0).notNull(),
  status: text("status").notNull().default("UNKNOWN"), // ON_TIME, DELAYED, UNKNOWN
  stopDurationMinutes: integer("stop_duration_minutes").default(0),
  isFirstStation: boolean("is_first_station").default(false).notNull(),
  isLastStation: boolean("is_last_station").default(false).notNull(),
});
