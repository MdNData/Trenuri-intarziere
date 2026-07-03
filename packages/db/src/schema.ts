import { pgTable, text, timestamp, integer, uuid, boolean } from "drizzle-orm/pg-core";

export const trains = pgTable("trains", {
  id: uuid("id").primaryKey().defaultRandom(),
  trainNumber: text("train_number").notNull().unique(),
  date: timestamp("date").notNull(), // The date of the journey
  departureStation: text("departure_station").notNull(),
  arrivalStation: text("arrival_station").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const trainUpdates = pgTable("train_updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  trainId: uuid("train_id").references(() => trains.id, { onDelete: "cascade" }).notNull(),
  station: text("station").notNull(),
  scheduledTime: timestamp("scheduled_time").notNull(),
  actualTime: timestamp("actual_time"),
  delayMinutes: integer("delay_minutes").default(0).notNull(),
  status: text("status").notNull(), // e.g., 'ON_TIME', 'DELAYED', 'CANCELLED'
  isFinal: boolean("is_final").default(false).notNull(), // True if this is the final destination arrival
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});
