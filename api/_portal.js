// Where this site's data is saved: the GradientV client portal, where the firm
// signs in to see its assessment results and its newsletter signups.
//
// (The underscore at the front of the file name tells Vercel this is a helper
// for the other files in api/, not an endpoint of its own.)
//
// PORTAL_SITE_KEY is this site's key to the portal. It lives in Vercel's
// Environment Variables and nowhere else, and it is deliberately weak: it can
// ADD a result or a signup for this one firm, and that is all. It cannot read
// anything back. So if one of these endpoints were ever compromised, it still
// could not dump the subscriber list.
//
// PORTAL_URL is optional. It is only for pointing a test at a different copy
// of the portal. Left unset, everything goes to the real one.
const PORTAL_URL = (process.env.PORTAL_URL || 'https://gradientv.com').replace(/\/$/, '');

// How long to wait for the portal before giving up, in milliseconds.
const TIMEOUT = 8000;

// Sends one record to the portal. `kind` is 'assessment' or 'subscriber'.
// Never throws: it answers { ok: true }, or { ok: false, reason } with a reason
// that is safe to log (it never contains the key or the record itself).
export async function sendToPortal(kind, record) {
  const key = process.env.PORTAL_SITE_KEY;
  if (!key) {
    return { ok: false, reason: 'PORTAL_SITE_KEY is not set' };
  }

  try {
    const response = await fetch(`${PORTAL_URL}/api/collect/${kind}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(TIMEOUT),
    });

    if (response.ok) {
      return { ok: true };
    }
    return { ok: false, reason: `the portal answered ${response.status}` };
  } catch (error) {
    // The portal could not be reached at all, or took too long.
    return { ok: false, reason: error.message };
  }
}
