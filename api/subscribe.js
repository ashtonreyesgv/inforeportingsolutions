import { createClient } from '@supabase/supabase-js';

// Same reasoning as submit-assessment.js: we use the browser-safe "anon"
// (publishable) key even though this runs on the server. Our RLS policy lets it
// INSERT rows but NOT read them — so if this endpoint were ever compromised, it
// still could not dump the subscriber list.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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

  // 4. Insert exactly one row. id and created_at are filled in by the database.
  const { error } = await supabase
    .from('subscribers')
    .insert({ email: cleanEmail, source_page: cleanSource });

  if (error) {
    // 23505 = Postgres unique_violation: this email is already subscribed.
    // That's not a failure from the visitor's point of view, and we must not
    // say "you're already on the list" — that would let someone test whether a
    // given address is subscribed. So we return the same success either way.
    if (error.code === '23505') {
      return res.status(201).json({ ok: true });
    }
    // Log the real reason server-side; send the visitor a generic message.
    console.error('Supabase subscriber insert failed:', error);
    return res.status(500).json({ error: 'Could not save subscription' });
  }

  return res.status(201).json({ ok: true });
}
