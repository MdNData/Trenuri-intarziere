import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config();

const sql = postgres(process.env.DATABASE_URL!);

async function resetAndMigrate() {
  console.log("Dropping old tables...");
  await sql`DROP TABLE IF EXISTS train_updates CASCADE`;
  await sql`DROP TABLE IF EXISTS train_stops CASCADE`;
  await sql`DROP TABLE IF EXISTS trains CASCADE`;
  
  // Also drop the drizzle migrations table so we start fresh
  await sql`DROP TABLE IF EXISTS __drizzle_migrations CASCADE`;
  await sql`DROP TABLE IF EXISTS drizzle.__drizzle_migrations CASCADE`;
  await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;

  console.log("Old tables dropped. Now recreating...");

  await sql`
    CREATE TABLE trains (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      train_number TEXT NOT NULL,
      train_type TEXT NOT NULL,
      route TEXT NOT NULL,
      departure_station TEXT NOT NULL,
      arrival_station TEXT NOT NULL,
      date TEXT NOT NULL,
      final_delay_minutes INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'UNKNOWN',
      last_scraped_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE UNIQUE INDEX trains_number_date_idx ON trains (train_number, date)`;

  await sql`
    CREATE TABLE train_stops (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      train_id UUID NOT NULL REFERENCES trains(id) ON DELETE CASCADE,
      station_name TEXT NOT NULL,
      station_km INTEGER DEFAULT 0,
      station_order INTEGER NOT NULL,
      scheduled_arrival TEXT,
      actual_arrival TEXT,
      scheduled_departure TEXT,
      actual_departure TEXT,
      delay_minutes INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'UNKNOWN',
      stop_duration_minutes INTEGER DEFAULT 0,
      is_first_station BOOLEAN NOT NULL DEFAULT FALSE,
      is_last_station BOOLEAN NOT NULL DEFAULT FALSE
    )
  `;

  console.log("✅ New tables created successfully!");
  
  // Verify
  const result = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  console.log("Tables:", result.map(r => r.tablename));

  await sql.end();
}

resetAndMigrate().catch(console.error);
