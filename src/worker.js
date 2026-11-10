const encoder = new TextEncoder()
const decoder = new TextDecoder()
const PAIR_TTL = 10 * 60 * 1000
const EMPTY_STATE = { transactions: [], budgets: [], debts: [], groups: [], categories: [], recurring: [] }
const json = (body, status = 200, extraHeaders = {}) => { const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); if (extraHeaders instanceof Headers) extraHeaders.forEach((value, key) => headers.append(key, value)); else Object.entries(extraHeaders).forEach(([key, value]) => headers.append(key, value)); return new Response(JSON.stringify(body), { status, headers }) }
const token = (bytes = 32) => [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('')
const hash = async (value) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))].map((b) => b.toString(16).padStart(2, '0')).join('')
const cookie = (request, name) => (request.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1] || ''
async function cryptoKey(secret) {
  if (!secret) throw new Error('SALDO_ENCRYPTION_KEY fehlt in den Worker-Secrets.')
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
}
function b64(bytes) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '') }
function unb64(value) { return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)), c => c.charCodeAt(0)) }
async function encrypt(value, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cryptoKey(secret), encoder.encode(JSON.stringify(value)))
  return JSON.stringify({ iv: b64(iv), data: b64(new Uint8Array(data)) })
}
async function decrypt(value, secret) {
  const payload = JSON.parse(value)
  const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(payload.iv) }, await cryptoKey(secret), unb64(payload.data))
  return JSON.parse(decoder.decode(data))
}
async function load(env) {
  const row = await env.DB.prepare('SELECT encrypted_profile FROM app_state WHERE id=1').first()
  return row ? decrypt(row.encrypted_profile, env.SALDO_ENCRYPTION_KEY) : null
}
async function save(env, profile) {
  const encrypted = await encrypt(profile, env.SALDO_ENCRYPTION_KEY)
  await env.DB.prepare('INSERT INTO app_state(id,encrypted_profile,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET encrypted_profile=excluded.encrypted_profile,updated_at=excluded.updated_at').bind(encrypted, Date.now()).run()
}
const dashboardAuth = (request, profile) => Boolean(profile?.dashboardToken && cookie(request, 'saldo_session') === profile.dashboardToken)
async function deviceAuth(request, env) {
  const raw = cookie(request, 'saldo_device')
  if (!raw) return false
  return Boolean(await env.DB.prepare("SELECT id FROM pairings WHERE status='connected' AND device_hash=?").bind(await hash(raw)).first())
}
function setCookie(name, value) { return `${name}=${value}; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Strict` }
async function createPair(env) {
  await env.DB.prepare('DELETE FROM pairings WHERE created_at < ? OR status = ?').bind(Date.now() - PAIR_TTL, 'waiting').run()
  for (let i = 0; i < 5; i++) {
    const id = token(12), code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0'), device = token()
    try {
      await env.DB.prepare('INSERT INTO pairings(id,code,device_hash,created_at,status) VALUES(?,?,?,?,\'waiting\')').bind(id, code, await hash(device), Date.now()).run()
      return { id, code, device }
    } catch (error) { if (i === 4) throw error }
  }
}
async function route(request, env) {
  const url = new URL(request.url)
  try {
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/.well-known/meta-wearables-manifest.json') {
      const body = JSON.stringify({ version: 1, name: 'Saldo', description: 'Deine Finanzen auf einen Blick.', appearance: { theme_color: '#53C8F5', icon: { src: '../images/saldo-mark.svg' } } })
      return new Response(request.method === 'HEAD' ? null : body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
    }
    if (request.method === 'POST' && url.pathname === '/api/glasses/pair') {
      const pair = await createPair(env)
      return json({ code: pair.code, expiresIn: PAIR_TTL }, 200, { 'Set-Cookie': setCookie('saldo_device', pair.device) })
    }
    if (request.method === 'GET' && url.pathname === '/api/glasses/pair-status') {
      const device = cookie(request, 'saldo_device')
      const row = await env.DB.prepare('SELECT id,status,created_at FROM pairings WHERE device_hash=?').bind(await hash(device)).first()
      if (!row || Date.now() - row.created_at > PAIR_TTL) return json({ connected: false, expired: true })
      return json({ connected: row.status === 'connected' })
    }
    if (request.method === 'POST' && url.pathname === '/api/pair/claim') {
      const body = await request.json().catch(() => ({})), code = String(body.code || '').replace(/\s/g, '')
      if (!/^\d{6}$/.test(code)) return json({ error: 'Bitte den sechsstelligen Verbindungscode eingeben.' }, 400)
      const pair = await env.DB.prepare("SELECT id,created_at FROM pairings WHERE code=? AND status='waiting'").bind(code).first()
      if (!pair || Date.now() - pair.created_at > PAIR_TTL) return json({ error: 'Code ungültig oder abgelaufen. Erzeuge auf der Brille einen neuen.' }, 400)
      let profile = await load(env)
      if (!profile) profile = { ...EMPTY_STATE, dashboardToken: token() }
      await save(env, profile)
      await env.DB.prepare("UPDATE pairings SET status='connected' WHERE id=?").bind(pair.id).run()
      return json({ connected: true }, 200, { 'Set-Cookie': setCookie('saldo_session', profile.dashboardToken) })
    }
    if (request.method === 'GET' && url.pathname === '/api/app-status') {
      const profile = await load(env)
      return json({ connected: dashboardAuth(request, profile) })
    }
    if (url.pathname === '/api/state' && request.method === 'GET') {
      const profile = await load(env)
      if (!dashboardAuth(request, profile)) return json({ error: 'Bitte zuerst Brille und PC koppeln.' }, 401)
      return json({ transactions: profile.transactions || [], budgets: profile.budgets || [], debts: profile.debts || [], groups: profile.groups || [], categories: profile.categories || [], recurring: profile.recurring || [] })
    }
    if (url.pathname === '/api/state' && request.method === 'PUT') {
      const profile = await load(env)
      if (!dashboardAuth(request, profile)) return json({ error: 'Sitzung abgelaufen. Bitte erneut koppeln.' }, 401)
      const body = await request.json().catch(() => ({}))
      for (const key of ['transactions', 'budgets', 'debts', 'groups', 'categories', 'recurring']) { if (body[key] !== undefined && (!Array.isArray(body[key]) || body[key].length > 10000)) return json({ error: 'Ungültige Daten.' }, 400) }
        await save(env, { ...profile, transactions: body.transactions ?? profile.transactions ?? [], budgets: body.budgets ?? profile.budgets ?? [], debts: body.debts ?? profile.debts ?? [], groups: body.groups ?? profile.groups ?? [], categories: body.categories ?? profile.categories ?? [], recurring: body.recurring ?? profile.recurring ?? [] })
      return json({ saved: true })
    }
    if (url.pathname === '/api/glasses/state' && request.method === 'GET') {
      if (!await deviceAuth(request, env)) return json({ error: 'Brille ist noch nicht gekoppelt.' }, 401)
      const profile = await load(env)
      return json({ transactions: profile?.transactions || [], budgets: profile?.budgets || [], debts: profile?.debts || [], groups: profile?.groups || [], categories: profile?.categories || [] })
    }
    if (request.method === 'POST' && url.pathname === '/api/glasses/transaction') {
      if (!await deviceAuth(request, env)) return json({ error: 'Brille ist noch nicht gekoppelt.' }, 401)
      const profile = await load(env)
      if (!profile) return json({ error: 'Saldo wurde noch nicht eingerichtet.' }, 404)
      const body = await request.json().catch(() => ({}))
      const type = body.type === 'income' ? 'income' : body.type === 'expense' ? 'expense' : ''
      const amount = Number(body.amount), category = String(body.category || '').trim().slice(0, 48), note = String(body.note || '').trim().slice(0, 100)
      const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || '')) ? body.date : new Date().toISOString().slice(0, 10)
      if (!type || !Number.isFinite(amount) || amount <= 0 || amount > 100000000 || !category) return json({ error: 'Bitte Typ, Kategorie und einen gültigen Betrag angeben.' }, 400)
      const transaction = { id: `tx-${token(12)}`, type, amount: Math.round(amount * 100) / 100, category, groupId: '', note: note || category, date: `${date}T12:00:00`, payment: 'Brille' }
      const transactions = [...(profile.transactions || []), transaction]
      await save(env, { ...profile, transactions })
      return json({ saved: true, transaction, transactions })
    }
    if (request.method === 'POST' && url.pathname === '/api/disconnect') {
      const profile = await load(env)
      if (!dashboardAuth(request, profile)) return json({ error: 'Nicht angemeldet.' }, 401)
      await env.DB.prepare('DELETE FROM app_state WHERE id=1').run()
      await env.DB.prepare('DELETE FROM pairings').run()
      const headers = new Headers(); headers.append('Set-Cookie', 'saldo_session=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict'); headers.append('Set-Cookie', 'saldo_device=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict');
      return json({ connected: false }, 200, headers)
    }
    if (request.method === 'GET' || request.method === 'HEAD') return env.ASSETS.fetch(request)
    return json({ error: 'Nicht gefunden.' }, 404)
  } catch (error) {
    console.error('Saldo Worker error:', error.message)
    return json({ error: 'Saldo konnte die Anfrage nicht verarbeiten.' }, 500)
  }
}
export default { fetch: route }
