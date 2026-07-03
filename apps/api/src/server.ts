import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { db, trains, trainUpdates } from '@cfr-tracker/db'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('*', cors())

app.get('/', (c) => {
  return c.text('CFR Tracker API is running!')
})

// Basic endpoint to check db connection
app.get('/trains', async (c) => {
  try {
    const allTrains = await db.select().from(trains).limit(10)
    return c.json(allTrains)
  } catch (error) {
    console.error("DB Error:", error);
    return c.json({ error: "Failed to fetch trains" }, 500)
  }
})

const port = 3002
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
