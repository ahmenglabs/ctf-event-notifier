import "dotenv/config.js"
import pkg from "whatsapp-web.js"
const { Client, LocalAuth, MessageMedia } = pkg
import type { GroupChat } from "whatsapp-web.js"
import qrcode from "qrcode-terminal"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc.js"
import timezone from "dayjs/plugin/timezone.js"

dayjs.extend(utc)
dayjs.extend(timezone)

import terminal from "./utils/terminal.js"
import { fetchCTFTimeThatNotHasNotifiedInWeek } from "./services/ctftime.js"
import { storeEventThatHasNotified } from "./services/mongodb.js"

const client = new Client({
  puppeteer: {
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-accelerated-2d-canvas", "--no-first-run", "--no-zygote", "--disable-gpu"],
  },
  authStrategy: new LocalAuth(),
})

client.on("qr", (qr) => {
  terminal.info("QR Code received, scan it with your WhatsApp app to log in.")
  terminal.info(qr)
  qrcode.generate(qr, { small: true })
})

let loadingPercent: number = 0

client.on("loading_screen", (percent) => {
  loadingPercent = Number(percent)
  terminal.info(`Loading: ${loadingPercent}%`)
})

client.on("ready", () => {
  terminal.info("WhatsApp Bot is running! CTRL + C to stop.")
  notifyEvents()
  setInterval(notifyEvents, 1000 * 60 * 60)
})

client.on("message", async (message) => {
  if (loadingPercent < 99) return
  if (message.fromMe) return

  terminal.info(`Received message from ${message.from}: ${message.body}`)

  if (message.body.includes("@everyone") || message.body.includes("@here")) {
    const chat = await message.getChat() as GroupChat

    if (chat.isGroup) {
      let text = "Attention All Participants!\n\n"
      const mentions = []

      for (const participant of chat.participants) {
        if (participant.id._serialized !== message.from || participant.id._serialized === client.info.wid._serialized) {
          mentions.push(participant.id._serialized)
          text += `@${participant.id.user} `
        }
      }

      await client.sendMessage(message.from, text.slice(0, -1), {
        mentions
      })
    }
  }
})

client.initialize()

process.on("SIGINT", () => {
  terminal.info("Shutting down WhatsApp Bot!")
  client.destroy()
  process.exit(0)
})

async function notifyEvents() {
  try {
    const events = await fetchCTFTimeThatNotHasNotifiedInWeek()
    if (events.length === 0) return

    if (process.env.MAIN_CHAT_ID === undefined) {
      throw new Error("MAIN_CHAT_ID is not defined")
    }

    const chat = await client.getChatById(process.env.MAIN_CHAT_ID)

    for (const event of events) {
      const media = await MessageMedia.fromUrl(event.logo, { unsafeMime: true }).catch(() => null)

      if (media) {
        await chat.sendStateTyping()
        await client.sendMessage(process.env.MAIN_CHAT_ID, media, {
          caption: `*NEW CTF EVENT INFORMATION*

*Title:* ${event.title}
*Format:* ${event.format}
*Restrictions:* ${event.restrictions}
*On site:* ${event.onsite ? "Yes" : "No"}

*Duration:* ${event.duration.days} days ${event.duration.hours} hours
*Start:* ${dayjs(event.start).tz("Asia/Jakarta").format("DD MMMM YYYY HH.mm")} WIB.
*Finish:* ${dayjs(event.finish).tz("Asia/Jakarta").format("DD MMMM YYYY HH.mm")} WIB.

*Location:* ${event.location}
*CTFTime URL:* ${event.ctftime_url}
*Register on* ${event.url}

*Description:*
${event.description}
`,
        })
      } else {
        await chat.sendStateTyping()
        await client.sendMessage(
          process.env.MAIN_CHAT_ID,
          `*NEW CTF EVENT INFORMATION*

*Title:* ${event.title}
*Format:* ${event.format}
*Restrictions:* ${event.restrictions}
*On site:* ${event.onsite ? "Yes" : "No"}

*Duration:* ${event.duration.days} days ${event.duration.hours} hours
*Start:* ${dayjs(event.start).tz("Asia/Jakarta").format("DD MMMM YYYY HH.mm")} WIB.
*Finish:* ${dayjs(event.finish).tz("Asia/Jakarta").format("DD MMMM YYYY HH.mm")} WIB.

*Location:* ${event.location}
*CTFTime URL:* ${event.ctftime_url}
*Register on* ${event.url}

*Description:*
${event.description}
`
        )
      }

      await storeEventThatHasNotified(event)
      terminal.info(`Notified event "${event.title}"`)
      await new Promise((resolve) => setTimeout(resolve, 10 * 1000))
    }
  } catch (error) {
    terminal.error(`Failed to notify events: ${(error as Error).message}`)
  }
}
