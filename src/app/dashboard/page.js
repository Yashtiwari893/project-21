"use client"

import { useState, useEffect, useRef } from "react"

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
}

function formatDate(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function groupByDate(messages) {
  const groups = {}
  const reversed = [...messages].reverse()
  for (const msg of reversed) {
    const dateKey = formatDate(msg.timestamp)
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(msg)
  }
  return groups
}

function getUniqueContacts(messages) {
  const contacts = {}
  for (const msg of messages) {
    const number = msg.direction === "incoming" ? msg.from : msg.to
    if (number && number !== "BOT" && number !== "BOT (Manual)") {
      if (!contacts[number]) {
        contacts[number] = { number, lastMsg: msg.text, lastTime: msg.timestamp, unread: 0 }
      }
      if (new Date(msg.timestamp) > new Date(contacts[number].lastTime)) {
        contacts[number].lastMsg = msg.text
        contacts[number].lastTime = msg.timestamp
      }
      if (msg.direction === "incoming") contacts[number].unread++
    }
  }
  return Object.values(contacts).sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime))
}

export default function Dashboard() {
  const [messages, setMessages] = useState([])
  const [selectedContact, setSelectedContact] = useState(null)
  const [sendTo, setSendTo] = useState("")
  const [sendText, setSendText] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, incoming: 0, outgoing: 0 })
  const [toast, setToast] = useState(null)
  const bottomRef = useRef(null)

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/messages")
      const data = await res.json()
      setMessages(data.messages || [])
      const inc = (data.messages || []).filter(m => m.direction === "incoming").length
      const out = (data.messages || []).filter(m => m.direction === "outgoing").length
      setStats({ total: data.total, incoming: inc, outgoing: out })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, selectedContact])

  const showToast = (msg, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!sendTo || !sendText) return
    setSending(true)
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: sendTo, text: sendText }),
      })
      if (res.ok) {
        setSendText("")
        fetchMessages()
        showToast("Message bhej diya! ✅")
      } else {
        showToast("Error aaya! ❌", "error")
      }
    } catch {
      showToast("Network error ❌", "error")
    } finally {
      setSending(false)
    }
  }

  const handleClear = async () => {
    if (!confirm("Saare messages clear karo?")) return
    await fetch("/api/messages", { method: "DELETE" })
    setMessages([])
    setStats({ total: 0, incoming: 0, outgoing: 0 })
    setSelectedContact(null)
    showToast("Messages clear ho gaye!")
  }

  const contacts = getUniqueContacts(messages)

  const contactMessages = selectedContact
    ? messages.filter(m => m.from === selectedContact || m.to === selectedContact)
    : []

  const groupedMessages = groupByDate(contactMessages)

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0f1117" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 999,
          background: toast.type === "error" ? "#e53e3e" : "#25d366",
          color: "#fff", padding: "10px 20px", borderRadius: 10,
          fontWeight: 600, fontSize: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{
        background: "#1a1f2e", borderBottom: "1px solid #2d3748",
        padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "#25d366", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18
          }}>🤖</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>WhatsApp Bot Dashboard</div>
            <div style={{ fontSize: 12, color: "#68d391" }}>● Live — auto-refresh har 3 seconds</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* Stats */}
          {[
            { label: "Total", value: stats.total, color: "#667eea" },
            { label: "Received", value: stats.incoming, color: "#25d366" },
            { label: "Sent", value: stats.outgoing, color: "#63b3ed" },
          ].map(s => (
            <div key={s.label} style={{
              background: "#0f1117", borderRadius: 8, padding: "6px 14px",
              border: `1px solid ${s.color}33`, textAlign: "center"
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#a0aec0" }}>{s.label}</div>
            </div>
          ))}
          <button onClick={handleClear} style={{
            background: "#e53e3e22", border: "1px solid #e53e3e55",
            color: "#fc8181", borderRadius: 8, padding: "7px 14px",
            cursor: "pointer", fontSize: 13, fontWeight: 600
          }}>
            🗑 Clear
          </button>
          <button onClick={fetchMessages} style={{
            background: "#25d36622", border: "1px solid #25d36655",
            color: "#25d366", borderRadius: 8, padding: "7px 14px",
            cursor: "pointer", fontSize: 13, fontWeight: 600
          }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left: Contacts Sidebar */}
        <div style={{
          width: 300, background: "#141920", borderRight: "1px solid #2d3748",
          display: "flex", flexDirection: "column", overflow: "hidden"
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #2d3748" }}>
            <div style={{ fontSize: 13, color: "#a0aec0", fontWeight: 600 }}>CONTACTS ({contacts.length})</div>
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {contacts.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#4a5568", fontSize: 13 }}>
                Koi message nahi aaya abhi...<br />
                WhatsApp pe message bhejo!
              </div>
            ) : contacts.map(c => (
              <div
                key={c.number}
                onClick={() => setSelectedContact(c.number)}
                style={{
                  padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #1a2030",
                  background: selectedContact === c.number ? "#1e2a3a" : "transparent",
                  borderLeft: selectedContact === c.number ? "3px solid #25d366" : "3px solid transparent",
                  transition: "all 0.15s"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%",
                      background: "#25d36622", border: "1px solid #25d36644",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, flexShrink: 0
                    }}>👤</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#e2e8f0" }}>+{c.number}</div>
                      <div style={{
                        fontSize: 11, color: "#718096", marginTop: 2,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160
                      }}>{c.lastMsg}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: "#4a5568" }}>{formatTime(c.lastTime)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Chat View */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div style={{
                background: "#1a1f2e", padding: "12px 20px",
                borderBottom: "1px solid #2d3748", display: "flex", alignItems: "center", gap: 12
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "#25d36622", border: "1px solid #25d36644",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
                }}>👤</div>
                <div>
                  <div style={{ fontWeight: 600, color: "#fff", fontSize: 15 }}>+{selectedContact}</div>
                  <div style={{ fontSize: 12, color: "#25d366" }}>WhatsApp User</div>
                </div>
              </div>

              {/* Messages */}
              <div style={{
                flex: 1, overflowY: "auto", padding: "20px",
                background: "#0d1117",
                backgroundImage: "radial-gradient(circle at 20% 80%, #1a2a1a15 0%, transparent 50%), radial-gradient(circle at 80% 20%, #1a1a2a15 0%, transparent 50%)"
              }}>
                {loading ? (
                  <div style={{ textAlign: "center", color: "#4a5568", paddingTop: 60 }}>Loading...</div>
                ) : Object.keys(groupedMessages).length === 0 ? (
                  <div style={{ textAlign: "center", color: "#4a5568", paddingTop: 60 }}>Koi message nahi</div>
                ) : Object.entries(groupedMessages).map(([date, msgs]) => (
                  <div key={date}>
                    {/* Date Divider */}
                    <div style={{ textAlign: "center", margin: "16px 0" }}>
                      <span style={{
                        background: "#1a2030", color: "#718096", fontSize: 11,
                        padding: "4px 12px", borderRadius: 20, border: "1px solid #2d3748"
                      }}>{date}</span>
                    </div>
                    {msgs.map(msg => (
                      <div key={msg.id} style={{
                        display: "flex",
                        justifyContent: msg.direction === "incoming" ? "flex-start" : "flex-end",
                        marginBottom: 8
                      }}>
                        <div style={{
                          maxWidth: "65%",
                          background: msg.direction === "incoming" ? "#1e2a1e" : "#1a3a2a",
                          border: msg.direction === "incoming"
                            ? "1px solid #2d4a2d"
                            : "1px solid #25d36633",
                          borderRadius: msg.direction === "incoming"
                            ? "4px 16px 16px 16px"
                            : "16px 4px 16px 16px",
                          padding: "8px 14px",
                        }}>
                          {msg.manual && (
                            <div style={{ fontSize: 10, color: "#63b3ed", marginBottom: 3, fontWeight: 600 }}>
                              📤 Manual Send
                            </div>
                          )}
                          <div style={{
                            fontSize: 13.5, color: msg.direction === "incoming" ? "#e2e8f0" : "#c6f6d5",
                            whiteSpace: "pre-wrap", lineHeight: 1.5
                          }}>
                            {msg.text}
                          </div>
                          <div style={{
                            fontSize: 10, color: "#4a5568", marginTop: 4,
                            textAlign: "right", display: "flex", justifyContent: "flex-end", gap: 6, alignItems: "center"
                          }}>
                            {formatTime(msg.timestamp)}
                            {msg.direction === "outgoing" && <span style={{ color: "#25d366" }}>✓✓</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Manual Send Box */}
              <form onSubmit={handleSend} style={{
                background: "#1a1f2e", padding: "12px 20px",
                borderTop: "1px solid #2d3748", display: "flex", gap: 10, alignItems: "center"
              }}>
                <input
                  type="text"
                  value={sendTo}
                  onChange={e => setSendTo(e.target.value)}
                  placeholder="Number (e.g. 919876543210)"
                  style={{
                    background: "#0f1117", border: "1px solid #2d3748", borderRadius: 10,
                    padding: "10px 14px", color: "#e2e8f0", fontSize: 13, width: 200,
                    outline: "none"
                  }}
                />
                <input
                  type="text"
                  value={sendText}
                  onChange={e => setSendText(e.target.value)}
                  placeholder="Message type karo..."
                  style={{
                    flex: 1, background: "#0f1117", border: "1px solid #2d3748", borderRadius: 10,
                    padding: "10px 14px", color: "#e2e8f0", fontSize: 13, outline: "none"
                  }}
                />
                <button
                  type="submit"
                  disabled={sending || !sendTo || !sendText}
                  style={{
                    background: sending ? "#1a4a2a" : "#25d366",
                    color: "#fff", border: "none", borderRadius: 10,
                    padding: "10px 20px", cursor: sending ? "default" : "pointer",
                    fontWeight: 700, fontSize: 14, transition: "all 0.2s"
                  }}
                >
                  {sending ? "..." : "Send ➤"}
                </button>
              </form>
            </>
          ) : (
            /* No contact selected */
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              color: "#4a5568", gap: 16
            }}>
              <div style={{ fontSize: 64 }}>💬</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#718096" }}>WhatsApp Bot Monitor</div>
              <div style={{ fontSize: 14, color: "#4a5568", textAlign: "center", maxWidth: 300 }}>
                Left side se koi contact select karo<br />messages dekhne ke liye
              </div>
              {contacts.length === 0 && (
                <div style={{
                  marginTop: 20, background: "#1a1f2e", border: "1px solid #2d3748",
                  borderRadius: 12, padding: "16px 24px", fontSize: 13, color: "#a0aec0", textAlign: "center"
                }}>
                  📱 Apne WhatsApp se test number pe<br />
                  <strong style={{ color: "#25d366" }}>+1 555 651 0894</strong><br />
                  koi bhi message bhejo!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
