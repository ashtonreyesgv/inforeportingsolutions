import { sendToPortal } from './_portal.js';

// The only assessments we'll accept. Anything else is rejected before it is saved.
// One entry per published assessment: the short name its page sends, and the
// name the firm sees for it in the client portal. Add a line here whenever a new
// assessment goes live, or its results will be rejected with a 400.
const ASSESSMENTS = {
  'quick-check': 'Casino Quick Check',
  'full-assessment': 'Casino Readiness Assessment',
  'hospital-quick-check': 'Hospital Quick Check',
  'hospital-full-assessment': 'Hospital Readiness Assessment',
  'general-assessment': '2026-2027 Reporting Changes Assessment',
  'pharma-quick-check': 'Pharma and Biotech Quick Check',
  'pharma-full-assessment': 'Pharma and Biotech Readiness Assessment',
};
const VALID_RISK = ['low', 'medium', 'high'];

export default async function handler(req, res) {
  // 1. This endpoint only creates data, so only POST is allowed.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Pull the three fields out of the JSON body the browser sends.
  const { assessment_type, score, risk_level } = req.body || {};

  // 3. Validate everything before sending it on. The portal checks again on its
  //    side, but a bad request should stop here, at the first door.
  if (typeof assessment_type !== 'string' || !Object.hasOwn(ASSESSMENTS, assessment_type)) {
    return res.status(400).json({ error: 'Invalid assessment_type' });
  }
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    return res.status(400).json({ error: 'Invalid score' });
  }
  if (!VALID_RISK.includes(risk_level)) {
    return res.status(400).json({ error: 'Invalid risk_level' });
  }

  // 4. Save exactly one result. Nothing about the visitor goes with it: no name,
  //    no email, no IP address. The portal fills in the date and time itself.
  const saved = await sendToPortal('assessment', {
    type: assessment_type,
    label: ASSESSMENTS[assessment_type],
    score,
    riskLevel: risk_level,
  });

  if (!saved.ok) {
    // Log the real reason server-side; send the visitor a generic message.
    console.error('Saving the assessment result failed:', saved.reason);
    return res.status(500).json({ error: 'Could not save result' });
  }

  // 5. Success. Nothing sensitive to return — just an acknowledgement.
  return res.status(201).json({ ok: true });
}
