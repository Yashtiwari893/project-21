// src/app/api/messages/route.js

import { messageStore } from "@/lib/store"
import { sendWhatsAppMessage } from "@/lib/whatsapp"

// GET — dashboard ke liye saare messages fetch karo
export async function GET() {
  const messages = messageStore.getAll()
  return Response.json({ messages, total: messages.length })
}

// DELETE — saare messages clear karo
export async function DELETE() {
  messageStore.clear()
  return Response.json({ success: true })
}

// POST — dashboard se manually message bhejo
export async function POST(request) {
  const { to, text } = await request.json()

  if (!to || !text) {
    return Response.json({ error: "to aur text required hai" }, { status: 400 })
  }

  const result = await sendWhatsAppMessage(to, text)

  messageStore.add({
    id: `${Date.now()}-manual`,
    from: "BOT (Manual)",
    to,
    direction: "outgoing",
    text,
    timestamp: new Date().toISOString(),
    type: "text",
    manual: true,
  })

  return Response.json({ success: true, result })
}
