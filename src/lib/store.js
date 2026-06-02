import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export const messageStore = {
  async add(msg) {
    await supabase.from('messages').upsert({
      id: msg.id,
      from: msg.from,
      to: msg.to || null,
      direction: msg.direction,
      text: msg.text,
      timestamp: msg.timestamp,
      type: msg.type,
      manual: msg.manual || false,
    })
  },
  async getAll() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(200)
    return data || []
  },
  async clear() {
    await supabase.from('messages').delete().neq('id', '')
  },
}
