import { createClient } from '@supabase/supabase-js';

// We use the browser-safe "anon" (publishable) key here on purpose.
// Our RLS policy lets this key INSERT rows but NOT read them — so even though
// this runs on the server, it holds the least power it possibly can.
// (The benchmark endpoint, which needs to read, will use the secret key instead.)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// The only values we'll accept. Anything else is rejected before we touch the DB.
// One entry per published assessment — add a new string here whenever a new
// assessment goes live, or its results will be rejected with a 400.
const VALID_TYPES = [
  'quick-check',
  'full-assessment',
  'hospital-quick-check',
  'hospital-full-assessment',
  'general-assessment',
];
const VALID_RISK = ['low', 'medium', 'high'];

export default async function handler(req, res) {
  // 1. This endpoint only creates data, so only POST is allowed.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Pull the three fields out of the JSON body the browser sends.
  const { assessment_type, score, risk_level } = req.body || {};

  // 3. Validate everything before writing. This is the real "required fields"
  //    guard we talked about — the code enforces it, the DB is the backstop.
  if (!VALID_TYPES.includes(assessment_type)) {
    return res.status(400).json({ error: 'Invalid assessment_type' });
  }
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    return res.status(400).json({ error: 'Invalid score' });
  }
  if (!VALID_RISK.includes(risk_level)) {
    return res.status(400).json({ error: 'Invalid risk_level' });
  }

  // 4. Insert exactly one row. id and created_at are filled in by the database.
  const { error } = await supabase
    .from('assessment_results')
    .insert({ assessment_type, score, risk_level });

  if (error) {
    // Log the real reason server-side; send the visitor a generic message.
    console.error('Supabase insert failed:', error);
    return res.status(500).json({ error: 'Could not save result' });
  }

  // 5. Success. Nothing sensitive to return — just an acknowledgement.
  return res.status(201).json({ ok: true });
}
