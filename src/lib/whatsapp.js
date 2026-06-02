// src/lib/whatsapp.js

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN

export async function sendWhatsAppMessage(to, text) {
  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  })

  return res.json()
}

export function getBotReply(msgText) {
  const text = msgText?.toLowerCase() || ""

  if (text.includes("hello") || text.includes("hi") || text.includes("helo") || text.includes("hii")) {
    return "👋 Hello! Main aapka WhatsApp Bot hoon. Kaise madad kar sakta hoon?\n\n*help* type karein commands ke liye."
  }
  if (text.includes("help") || text.includes("madad")) {
    return "🆘 *Available Commands:*\n\n• *hello* — Greeting\n• *time* — Current IST time\n• *info* — Bot details\n• *help* — Yeh menu"
  }
  if (text.includes("time") || text.includes("waqt") || text.includes("time")) {
    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    return `🕐 Current time (IST):\n${now}`
  }
  if (text.includes("info")) {
    return "🤖 *WhatsApp Bot v1.0*\nPowered by: Meta Cloud API + Next.js\nStatus: ✅ Active\nDeveloper: MV Digital Work"
  }

  return `🤖 Samajh nahi aaya: "${msgText}"\n\n*help* type karein available commands ke liye.`
}
