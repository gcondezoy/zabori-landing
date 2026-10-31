// Web Push estándar con WebCrypto: cifrado del mensaje (RFC 8291) y firma del remitente (VAPID, RFC 8292).
// Sin dependencias, para que funcione igual en Supabase Edge Functions.

const encoder = new TextEncoder()

const toB64Url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const fromB64Url = (text) => Uint8Array.from(
  atob(text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=')),
  (c) => c.charCodeAt(0),
)

function join(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) { out.set(p, at); at += p.length }
  return out
}

async function hkdf(salt, ikm, info, bytes) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8))
}

// Cifra el texto para un navegador. Devuelve el cuerpo listo para enviar (Content-Encoding: aes128gcm).
export async function encryptPayload(text, { p256dh, auth }) {
  const receiver = fromB64Url(p256dh)
  const authSecret = fromB64Url(auth)
  const receiverKey = await crypto.subtle.importKey('raw', receiver, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const sender = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const senderPublic = new Uint8Array(await crypto.subtle.exportKey('raw', sender.publicKey))
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverKey }, sender.privateKey, 256))

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const ikm = await hkdf(authSecret, shared, join(encoder.encode('WebPush: info\0'), receiver, senderPublic), 32)
  const cek = await hkdf(salt, ikm, encoder.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, encoder.encode('Content-Encoding: nonce\0'), 12)

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const plain = join(encoder.encode(text), new Uint8Array([2])) // 2 = último registro
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plain))

  const recordSize = new Uint8Array([0, 0, 16, 0]) // 4096
  return join(salt, recordSize, new Uint8Array([senderPublic.length]), senderPublic, cipher)
}

// Firma que identifica a Zabori ante el servicio de notificaciones del navegador
export async function vapidHeader(endpoint, { publicKey, privateKey, subject }) {
  const pub = fromB64Url(publicKey)
  const jwk = {
    kty: 'EC', crv: 'P-256', d: privateKey,
    x: toB64Url(pub.slice(1, 33)), y: toB64Url(pub.slice(33, 65)),
  }
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const part = (obj) => toB64Url(encoder.encode(JSON.stringify(obj)))
  const unsigned = `${part({ typ: 'JWT', alg: 'ES256' })}.${part({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  })}`
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(unsigned))
  return `vapid t=${unsigned}.${toB64Url(signature)}, k=${publicKey}`
}

// Devuelve el código de respuesta del servicio (404 o 410 = esa suscripción ya no existe)
export async function sendWebPush(subscription, text, vapid) {
  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidHeader(subscription.endpoint, vapid),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '3600',
      Urgency: 'high',
    },
    body: await encryptPayload(text, subscription),
  })
  return res.status
}
