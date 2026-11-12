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
async function load(env, deviceHash = '') {
  const row = deviceHash
    ? await env.DB.prepare('SELECT encrypted_profile FROM account_profiles WHERE device_hash=?').bind(deviceHash).first()
    : await env.DB.prepare('SELECT encrypted_profile FROM app_state WHERE id=1').first()
  return row ? decrypt(row.encrypted_profile, env.SALDO_ENCRYPTION_KEY) : null
}
async function save(env, profile, deviceHash = '') {
  const encrypted = await encrypt(profile, env.SALDO_ENCRYPTION_KEY)
  if (deviceHash) {
    await env.DB.prepare('INSERT INTO account_profiles(device_hash,encrypted_profile,updated_at) VALUES(?,?,?) ON CONFLICT(device_hash) DO UPDATE SET encrypted_profile=excluded.encrypted_profile,updated_at=excluded.updated_at').bind(deviceHash, encrypted, Date.now()).run()
    return
  }
  await env.DB.prepare('INSERT INTO app_state(id,encrypted_profile,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET encrypted_profile=excluded.encrypted_profile,updated_at=excluded.updated_at').bind(encrypted, Date.now()).run()
}
const dashboardAuth = (request, profile) => Boolean(profile?.dashboardToken && cookie(request, 'saldo_session') === profile.dashboardToken)
function sharedDeviceCookie(value) { return `mda_device=${value}; Domain=henning-orbit-calendar.workers.dev; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Strict` }
async function centralDeviceForSession(request, env) {
  const rawCookie = request.headers.get('Cookie') || ''
  if (!rawCookie) return null
  const response = await env.META_DISPLAY_APPS.fetch(new Request('https://meta-display-apps.henning-orbit-calendar.workers.dev/api/device/me', { headers: { Cookie: rawCookie }, signal: AbortSignal.timeout(8000) }))
  if (!response.ok) return null
  const data = await response.json().catch(() => null)
  return data?.connected && /^[a-f0-9]{64}$/.test(data.deviceHash || '') ? data : null
}
async function centralDeviceForToken(deviceToken, env) {
  if (!deviceToken || !env.MDA_LINK_SECRET) return null
  const response = await env.META_DISPLAY_APPS.fetch(new Request('https://meta-display-apps.henning-orbit-calendar.workers.dev/api/device/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.MDA_LINK_SECRET}` }, body: JSON.stringify({ deviceToken }), signal: AbortSignal.timeout(8000) }))
  if (!response.ok) return null
  const data = await response.json().catch(() => null)
  return data?.connected && /^[a-f0-9]{64}$/.test(data.deviceHash || '') ? data : null
}
async function deviceAuth(request, env) {
  const raw = cookie(request, 'mda_device') || cookie(request, 'saldo_device')
  if (!raw) return null
  const registered = await centralDeviceForToken(raw, env).catch(() => null)
  if (registered) return registered
  const deviceHash = await hash(raw)
  const pair = await env.DB.prepare("SELECT id FROM pairings WHERE status='connected' AND device_hash=?").bind(deviceHash).first()
  return pair ? { deviceHash: null, legacy: true } : null
}
function setCookie(name, value, shared = false) { return `${name}=${value};${shared ? ' Domain=henning-orbit-calendar.workers.dev;' : ''} Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Strict` }
async function createPair(env, device = token()) {
  const deviceHash = await hash(device)
  await env.DB.prepare("DELETE FROM pairings WHERE created_at < ? OR (device_hash = ? AND status = 'waiting')").bind(Date.now() - PAIR_TTL, deviceHash).run()
  for (let i = 0; i < 5; i++) {
    const id = token(12), code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0')
    try {
      await env.DB.prepare('INSERT INTO pairings(id,code,device_hash,created_at,status) VALUES(?,?,?,?,\'waiting\')').bind(id, code, deviceHash, Date.now()).run()
      return { id, code, device }
    } catch (error) { if (i === 4) throw error }
  }
}
async function dashboardProfile(request, env) {
  const linked = await centralDeviceForSession(request, env).catch(() => null)
  if (linked) {
    let profile = await load(env, linked.deviceHash)
    if (!profile) {
      const legacy = linked.sourceApp === 'saldo' ? await load(env) : null
      profile = { ...(legacy || EMPTY_STATE), dashboardToken: token() }
      await save(env, profile, linked.deviceHash)
      if (legacy) await env.DB.prepare('DELETE FROM app_state WHERE id=1').run()
    }
    return { profile, deviceHash: linked.deviceHash, linked: true }
  }
  return { profile: await load(env), deviceHash: '', linked: false }
}
async function route(request, env) {
  const url = new URL(request.url)
  try {
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/.well-known/meta-wearables-manifest.json') {
      const body = JSON.stringify({ version: 1, name: 'Saldo', description: 'Your finances at a glance.', appearance: { theme_color: '#53C8F5', icon: { src: '../images/saldo-mark.svg' } } })
      return new Response(request.method === 'HEAD' ? null : body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
    }
    if (request.method === 'POST' && url.pathname === '/api/glasses/pair') {
      const device = cookie(request, 'mda_device') || cookie(request, 'saldo_device') || token()
      const linked = await centralDeviceForToken(device, env).catch(() => null)
      if (linked) {
        const profile = await load(env, linked.deviceHash)
        const headers = new Headers()
        headers.append('Set-Cookie', setCookie('mda_device', device, true))
        headers.append('Set-Cookie', setCookie('saldo_device', device, true))
        return json({ id: linked.deviceHash, connected: Boolean(profile), registered: true, setupRequired: !profile }, 200, headers)
      }
      const pair = await createPair(env, device)
      const headers = new Headers()
      headers.append('Set-Cookie', setCookie('mda_device', pair.device, true))
      headers.append('Set-Cookie', setCookie('saldo_device', pair.device, true))
      return json({ code: pair.code, expiresIn: PAIR_TTL }, 200, headers)
    }
    if (request.method === 'GET' && url.pathname === '/api/glasses/pair-status') {
      const device = cookie(request, 'mda_device') || cookie(request, 'saldo_device')
      const linked = await centralDeviceForToken(device, env).catch(() => null)
      if (linked) {
        const profile = await load(env, linked.deviceHash)
        return json({ connected: Boolean(profile), registered: true, setupRequired: !profile })
      }
      const row = await env.DB.prepare('SELECT id,status,created_at FROM pairings WHERE device_hash=?').bind(await hash(device)).first()
      if (!row || Date.now() - row.created_at > PAIR_TTL) return json({ connected: false, expired: true })
      return json({ connected: row.status === 'connected' })
    }
    if (request.method === 'POST' && url.pathname === '/api/pair/claim') {
      const body = await request.json().catch(() => ({})), code = String(body.code || '').replace(/\s/g, '')
      const linked = await centralDeviceForSession(request, env).catch(() => null)
      let deviceHash = linked?.deviceHash || ''
      let pair = null
      if (code) {
        if (!/^\d{6}$/.test(code)) return json({ error: 'Enter the six-digit pairing code.' }, 400)
        pair = await env.DB.prepare("SELECT id,device_hash,created_at FROM pairings WHERE code=? AND status='waiting'").bind(code).first()
        if (!pair || Date.now() - pair.created_at > PAIR_TTL) return json({ error: 'Code is invalid or expired. Generate a new one on your glasses.' }, 400)
        if (linked && pair.device_hash !== linked.deviceHash) return json({ error: 'This code belongs to a different glasses device.' }, 409)
        deviceHash = linked?.deviceHash || ''
      } else if (!linked) return json({ error: 'Sign in to Meta Display Apps and link your glasses first, or enter the code shown on your glasses.' }, 401)
      let profile = deviceHash ? await load(env, deviceHash) : await load(env)
      if (!profile) profile = { ...EMPTY_STATE, dashboardToken: token() }
      if (deviceHash) await save(env, profile, deviceHash)
      else await save(env, profile)
      if (pair) await env.DB.prepare("UPDATE pairings SET status='connected' WHERE id=?").bind(pair.id).run()
      return json({ connected: true }, 200, { 'Set-Cookie': setCookie('saldo_session', profile.dashboardToken) })
    }
    if (request.method === 'POST' && url.pathname === '/api/mda/resolve-code') {
      if (!env.MDA_LINK_SECRET || request.headers.get('Authorization') !== `Bearer ${env.MDA_LINK_SECRET}`) return json({ error: 'Unauthorized.' }, 401)
      const body = await request.json().catch(() => ({})), code = String(body.code || '').replace(/\s/g, '')
      if (!/^\d{6}$/.test(code)) return json({ error: 'Enter the six-digit code shown in Saldo.' }, 400)
      const pair = await env.DB.prepare('SELECT id,device_hash,created_at FROM pairings WHERE code=?').bind(code).first()
      if (!pair || Date.now() - pair.created_at > PAIR_TTL) return json({ error: 'That Saldo code is invalid or has expired.' }, 400)
      return json({ deviceId: pair.id, deviceHash: pair.device_hash })
    }
    if (request.method === 'GET' && url.pathname === '/api/app-status') {
      const account = await dashboardProfile(request, env)
      const connected = account.linked || dashboardAuth(request, account.profile)
      return json({ connected }, 200, account.linked ? { 'Set-Cookie': setCookie('saldo_session', account.profile.dashboardToken) } : {})
    }
    if (url.pathname === '/api/state' && request.method === 'GET') {
      const account = await dashboardProfile(request, env)
      const profile = account.profile
      if (!account.linked && !dashboardAuth(request, profile)) return json({ error: 'Please pair your glasses and computer first.' }, 401)
      return json({ transactions: profile.transactions || [], budgets: profile.budgets || [], debts: profile.debts || [], groups: profile.groups || [], categories: profile.categories || [], recurring: profile.recurring || [] })
    }
    if (url.pathname === '/api/state' && request.method === 'PUT') {
      const account = await dashboardProfile(request, env)
      const profile = account.profile
      if (!account.linked && !dashboardAuth(request, profile)) return json({ error: 'Session expired. Please pair your devices again.' }, 401)
      const body = await request.json().catch(() => ({}))
      for (const key of ['transactions', 'budgets', 'debts', 'groups', 'categories', 'recurring']) { if (body[key] !== undefined && (!Array.isArray(body[key]) || body[key].length > 10000)) return json({ error: 'Invalid data.' }, 400) }
      await save(env, { ...profile, transactions: body.transactions ?? profile.transactions ?? [], budgets: body.budgets ?? profile.budgets ?? [], debts: body.debts ?? profile.debts ?? [], groups: body.groups ?? profile.groups ?? [], categories: body.categories ?? profile.categories ?? [], recurring: body.recurring ?? profile.recurring ?? [] }, account.deviceHash)
      return json({ saved: true })
    }
    if (url.pathname === '/api/glasses/state' && request.method === 'GET') {
      const device = await deviceAuth(request, env)
      if (!device) return json({ error: 'Glasses are not paired yet.' }, 401)
      const profile = device.deviceHash ? await load(env, device.deviceHash) : await load(env)
      return json({ transactions: profile?.transactions || [], budgets: profile?.budgets || [], debts: profile?.debts || [], groups: profile?.groups || [], categories: profile?.categories || [] })
    }
    if (request.method === 'POST' && url.pathname === '/api/glasses/transaction') {
      const device = await deviceAuth(request, env)
      if (!device) return json({ error: 'Glasses are not paired yet.' }, 401)
      const profile = device.deviceHash ? await load(env, device.deviceHash) : await load(env)
      if (!profile) return json({ error: 'Saldo has not been set up yet.' }, 404)
      const body = await request.json().catch(() => ({}))
      const type = body.type === 'income' ? 'income' : body.type === 'expense' ? 'expense' : ''
      const amount = Number(body.amount), category = String(body.category || '').trim().slice(0, 48), note = String(body.note || '').trim().slice(0, 100)
      const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || '')) ? body.date : new Date().toISOString().slice(0, 10)
      if (!type || !Number.isFinite(amount) || amount <= 0 || amount > 100000000 || !category) return json({ error: 'Enter a type, category and valid amount.' }, 400)
      const transaction = { id: `tx-${token(12)}`, type, amount: Math.round(amount * 100) / 100, category, groupId: '', note: note || category, date: `${date}T12:00:00`, payment: 'Brille' }
      const transactions = [...(profile.transactions || []), transaction]
      await save(env, { ...profile, transactions }, device.deviceHash)
      return json({ saved: true, transaction, transactions })
    }
    if (request.method === 'POST' && url.pathname === '/api/disconnect') {
      const account = await dashboardProfile(request, env)
      if (!account.linked && !dashboardAuth(request, account.profile)) return json({ error: 'Not signed in.' }, 401)
      if (account.linked) {
        await env.DB.prepare('DELETE FROM account_profiles WHERE device_hash=?').bind(account.deviceHash).run()
        await env.DB.prepare('DELETE FROM pairings WHERE device_hash=?').bind(account.deviceHash).run()
      } else {
        await env.DB.prepare('DELETE FROM app_state WHERE id=1').run()
        await env.DB.prepare('DELETE FROM pairings').run()
      }
      const headers = new Headers(); headers.append('Set-Cookie', 'saldo_session=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict'); headers.append('Set-Cookie', 'saldo_device=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict');
      return json({ connected: false }, 200, headers)
    }
    if (request.method === 'GET' || request.method === 'HEAD') return env.ASSETS.fetch(request)
    return json({ error: 'Not found.' }, 404)
  } catch (error) {
    console.error('Saldo Worker error:', error.message)
    return json({ error: 'Saldo could not process the request.' }, 500)
  }
}
export default { fetch: route }
