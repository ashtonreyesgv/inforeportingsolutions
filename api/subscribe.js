import { sendToPortal } from './_portal.js';

// 254 is the maximum length of an email address per RFC 5321.
const MAX_EMAIL_LENGTH = 254;

// Deliberately permissive: "something @ something . something", no spaces.
// Strict email regexes reject valid addresses; the real test is whether mail
// to it actually delivers, which we can't know here anyway.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Which page the visitor subscribed from — useful for seeing which assessment
// drives signups. Allow-listed so nobody can write arbitrary text to the DB.
const SAFE_SOURCE = /^[a-z0-9-]{1,60}$/;

export default async function handler(req, res) {
  // 1. This endpoint only creates data, so only POST is allowed.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, source, company } = req.body || {};

  // 2. Honeypot. `company` is a hidden field no human ever sees, let alone
  //    fills in. Bots fill every input they find. If it has any value we return
  //    success WITHOUT saving — a silent rejection teaches the bot nothing, so
  //    it doesn't come back and try a different shape.
  if (typeof company === 'string' && company.trim() !== '') {
    return res.status(201).json({ ok: true });
  }

  // 3. Validate before we touch the database.
  if (typeof email !== 'string') {
    return res.status(400).json({ error: 'Invalid email' });
  }

  // Normalize first, then validate, so " Colin@Example.COM " and
  // "colin@example.com" can never become two separate rows.
  const cleanEmail = email.trim().toLowerCase();

  if (cleanEmail.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(cleanEmail)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const cleanSource =
    typeof source === 'string' && SAFE_SOURCE.test(source) ? source : null;

  // 4. Add the address to the list. The portal keeps one row per address, so
  //    subscribing twice changes nothing, and it answers the same way both
  //    times. We pass that same success on to the visitor: saying "you're
  //    already on the list" would let someone test whether a given address is
  //    subscribed.
  const saved = await sendToPortal('subscriber', {
    email: cleanEmail,
    sourcePage: cleanSource,
  });

  if (!saved.ok) {
    // Log the real reason server-side; send the visitor a generic message.
    console.error('Saving the subscription failed:', saved.reason);
    return res.status(500).json({ error: 'Could not save subscription' });
  }

  return res.status(201).json({ ok: true });
}
