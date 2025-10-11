import type { Message } from "whatsapp-web.js"
import fs from "node:fs"
import path from "node:path"
import url from "node:url"
import * as faceapi from "face-api.js"
import * as canvas from "canvas"
import terminal from "../utils/terminal.js"
import sharp from "sharp"

const { Canvas, Image, ImageData } = canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData })

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

async function loadModels() {
  try {
    const MODEL_PATH = path.join(__dirname, "models")
    await faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_PATH)
    await faceapi.nets.faceLandmark68TinyNet.loadFromDisk(MODEL_PATH)
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH)
    terminal.info("Models loaded!")
  } catch (error) {
    terminal.error(`Error loading models: ${error}`)
    throw error
  }
}

async function getFaceDescriptor(imageData: string | Buffer): Promise<Float32Array | undefined> {
  try {
    let img: canvas.Image

    if (Buffer.isBuffer(imageData)) {
      terminal.info(`Loading image from buffer, size: ${imageData.length}`)
      const pngBuffer = await sharp(imageData).png().toBuffer()
      img = await canvas.loadImage(pngBuffer)
    } else {
      terminal.info(`Loading image from: ${imageData.substring(0, 50)}...`)
      img = await canvas.loadImage(imageData)
    }

    terminal.info(`Image loaded successfully: ${img.width}x${img.height}`)

    const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks(true).withFaceDescriptor()

    if (!detection) {
      terminal.info("No face detected in image")
      return undefined
    }
    return detection.descriptor
  } catch (error) {
    terminal.error(`Error processing image: ${error}`)
    return undefined
  }
}

export async function secretServices(message: Message) {
  try {
    const meImagePath = path.join(__dirname, "./images/me.jpg")

    if (!fs.existsSync(meImagePath)) {
      terminal.error("me.jpg not found")
      return
    }

    const media = await message.downloadMedia()
    if (!media) {
      terminal.info("No media found in message")
      return
    }

    terminal.info(`Media mimetype: ${media.mimetype}`)
    terminal.info(`Media data length: ${media.data.length}`)

    await loadModels()

    const mediaBuffer = Buffer.from(media.data, "base64")
    const mediaDescriptor = await getFaceDescriptor(mediaBuffer)
    const meDescriptor = await getFaceDescriptor(meImagePath)

    if (mediaDescriptor && meDescriptor) {
      const distance = faceapi.euclideanDistance(mediaDescriptor, meDescriptor)
      terminal.info(`Euclidean distance: ${distance}`)

      if (distance < 0.6) {
        const chat = await message.getChat()
        await chat.sendStateTyping()
        await chat.sendMessage("Aduh ganteng banget sih.. 😍", {
          quotedMessageId: message.id._serialized
        })
      } else {
        terminal.info("Wajah tidak mirip.")
      }
    } else {
      terminal.info("Gagal mendeteksi wajah di salah satu atau kedua gambar.")
    }
  } catch (error) {
    terminal.error(`Error in secretServices: ${error}`)
  }
}
