import "dotenv/config.js"
import { MongoClient, ServerApiVersion } from "mongodb"
import type { CTFTimeEvent } from "./ctftime.js"

if (process.env.MONGODB_URI === undefined) {
  throw new Error("MONGODB_URI is not defined")
}

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

let isConnected = false

async function ensureConnection() {
  if (!isConnected) {
    await client.connect()
    isConnected = true
  }
}

export async function getEventsCollection() {
  await ensureConnection()
  const db = client.db("ctf-event-notifier")
  return db.collection("events")
}

export async function isEventHasStored(eventId: number) {
  const eventsCollection = await getEventsCollection()
  const event = await eventsCollection.findOne({ id: eventId })
  return event !== null
}

export async function storeEventThatHasNotified(event: CTFTimeEvent) {
  if (!(await isEventHasStored(event.id))) {
    const eventsCollection = await getEventsCollection()
    await eventsCollection.insertOne(event)
  }
}
