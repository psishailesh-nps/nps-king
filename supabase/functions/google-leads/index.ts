import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-key' }
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type':'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error:'POST only' },405)

  const expected = Deno.env.get('GOOGLE_WEBHOOK_KEY') || ''
  const supplied = req.headers.get('x-webhook-key') || new URL(req.url).searchParams.get('key') || ''
  if (!expected || supplied !== expected) return json({ error:'Invalid webhook key' },401)

  let payload: any
  try { payload = await req.json() } catch { return json({ error:'Invalid JSON' },400) }

  const fields: Record<string,string> = {}
  const cols = payload?.user_column_data || payload?.userColumnData || payload?.lead?.user_column_data || []
  if (Array.isArray(cols)) for (const item of cols) {
    const key = String(item.column_id || item.column_name || item.name || '').toLowerCase()
    const val = String(item.string_value || item.value || '')
    if (key) fields[key] = val
  }
  const pick = (...keys:string[]) => { for (const k of keys) if (fields[k]) return fields[k]; return '' }
  const phone = pick('phone_number','phone','mobile')
  const email = pick('email')
  const name = pick('full_name','name','first_name')
  const city = pick('city','address_city')
  const state = pick('state','address_state') || 'Gujarat'
  const keyword = pick('keyword','search_term','search_query','utm_term') || payload?.keyword || payload?.search_term || ''
  const campaign = String(payload?.campaign_name || payload?.campaign || '')
  const campaignId = String(payload?.campaign_id || '')
  const adGroup = String(payload?.ad_group_name || payload?.adgroup_name || payload?.ad_group || '')
  const adGroupId = String(payload?.ad_group_id || payload?.adgroup_id || '')
  const adId = String(payload?.ad_id || '')
  const gclid = String(payload?.gclid || '')
  const leadId = String(payload?.lead_id || payload?.leadId || '')

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const id = Date.now()
  const { error } = await supabase.from('leads').insert({
    id, lead_date: new Date().toLocaleDateString('gu-IN'), name, phone, email, city, state,
    budget: pick('budget','investment','corpus'), source:'Google Ads (Lead Form)', keyword,
    campaign, campaign_id:campaignId, ad_group:adGroup, ad_group_id:adGroupId, ad_id:adId,
    gclid, lead_id:leadId, raw_data:payload
  })
  if (error) return json({ error:error.message },500)
  return json({ ok:true, id })
})
