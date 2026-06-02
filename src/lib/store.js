// src/lib/store.js

import { Worker, isMainThread, parentPort, workerData, MessageChannel, receiveMessageOnPort } from "node:worker_threads"
import { createClient } from "@supabase/supabase-js"

const TABLE_NAME = "messages"
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required")
}

if (!isMainThread) {
  const client = createClient(workerData.supabaseUrl, workerData.supabaseAnonKey)

  parentPort.on("message", async ({ action, payload, port }) => {
    try {
      let result = null

      if (action === "add") {
        const { error } = await client.from(TABLE_NAME).insert(payload)
        if (error) throw error
      } else if (action === "getAll") {
        const { data, error } = await client
          .from(TABLE_NAME)
          .select("*")
          .order("timestamp", { ascending: false })
          .limit(200)

        if (error) throw error
        result = data ?? []
      } else if (action === "clear") {
        const { error } = await client.from(TABLE_NAME).delete()
        if (error) throw error
      } else {
        throw new Error(`Unknown action: ${action}`)
      }

      port.postMessage({ result })
    } catch (error) {
      port.postMessage({ error: error?.message || "Supabase store operation failed" })
    } finally {
      port.close()
    }
  })
}

const globalStore = globalThis

function getWorker() {
  if (!globalStore.__waStoreWorker) {
    globalStore.__waStoreWorker = new Worker(new URL(import.meta.url), {
      type: "module",
      workerData: {
        supabaseUrl: SUPABASE_URL,
        supabaseAnonKey: SUPABASE_ANON_KEY,
      },
    })
  }

  return globalStore.__waStoreWorker
}

function runOperation(action, payload) {
  const worker = getWorker()
  const { port1, port2 } = new MessageChannel()

  worker.postMessage({ action, payload, port: port2 }, [port2])

  while (true) {
    const message = receiveMessageOnPort(port1)

    if (message) {
      port1.close()

      if (message.message?.error) {
        throw new Error(message.message.error)
      }

      return message.message?.result
    }

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50)
  }
}

export const messageStore = {
  add(msg) {
    runOperation("add", msg)
  },
  getAll() {
    return runOperation("getAll") || []
  },
  clear() {
    runOperation("clear")
  },
}
