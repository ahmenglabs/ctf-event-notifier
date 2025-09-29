import fetch from "node-fetch"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc.js"
import timezone from "dayjs/plugin/timezone.js"

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("Asia/Jakarta")

import { isEventHasStored } from "./mongodb.js"

export interface CTFTimeOrganizer {
  id: number
  name: string
}

export interface CTFTimeDuration {
  hours: number
  days: number
}

export interface CTFTimeEvent {
  organizers: CTFTimeOrganizer[]
  ctftime_url: string
  ctf_id: number
  weight: number
  duration: CTFTimeDuration
  live_feed: string
  logo: string
  id: number
  title: string
  start: string
  participants: number
  location: string
  finish: string
  description: string
  format: string
  is_votable_now: boolean
  prizes: string
  format_id: number
  onsite: boolean
  restrictions: string
  url: string
  public_votable: boolean
}

export async function fetchCTFTimeThatNotHasNotifiedInWeek() {
  const response = await fetch(`https://ctftime.org/api/v1/events/?limit=100`)
  const result = (await response.json()) as CTFTimeEvent[]

  const currentTime = dayjs()
  const nextWeekTime = currentTime.add(7, "day")

  const events = []
  for (const event of result) {
    const eventStartTime = dayjs(event.start)
    const isAfterCurrent = eventStartTime.isAfter(currentTime)
    const isBeforeNextWeek = eventStartTime.isBefore(nextWeekTime)
    const hasNotBeenStored = !(await isEventHasStored(event.id))

    if (isAfterCurrent && isBeforeNextWeek && hasNotBeenStored) {
      events.push(event)
    }
  }

  return events
}
