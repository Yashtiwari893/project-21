// src/app/api/webhook/route.js

import { messageStore } from "@/lib/store"
import { sendWhatsAppMessage, getBotReply } from "@/lib/whatsapp"

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN

// ✅ Webhook verify karne ke liye (Meta isko call karta hai)
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!")
    return new Response(challenge, { status: 200 })
  }
  return new Response("Forbidden", { status: 403 })
}

// 📩 Message receive karne ke liye
export async function POST(request) {
  try {
    const body = await request.json()
    const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages

    if (!messages?.length) {
      return new Response("OK", { status: 200 })
    }

    const message = messages[0]
    const from = message.from
    const msgText = message?.text?.body || ""
    const timestamp = new Date().toISOString()

    // User message store karo
    await messageStore.add({
      id: `${Date.now()}-user`,
      from,
      direction: "incoming",
      text: msgText,
      timestamp,
      type: message.type,
    })

    // Bot reply generate karo
    const replyText = getBotReply(msgText)

    // WhatsApp pe reply bhejo
    await sendWhatsAppMessage(from, replyText)

    // Bot message store karo
    await messageStore.add({
      id: `${Date.now()}-bot`,
      from: "BOT",
      to: from,
      direction: "outgoing",
      text: replyText,
      timestamp: new Date().toISOString(),
      type: "text",
    })

    return new Response("OK", { status: 200 })
  } catch (err) {
    console.error("Webhook error:", err)
    return new Response("Error", { status: 500 })
  }
}
