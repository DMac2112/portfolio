// Serverless contact handler — the ONLY place the Sanity write token lives.
// Set SANITY_API_TOKEN in Netlify: Site settings > Environment variables.
// Dependency-free: talks to the Sanity Mutations HTTP API with global fetch.

const PROJECT_ID = process.env.SANITY_PROJECT_ID || 'vh789wfu';
const DATASET = 'production';
const MUTATE_URL = `https://${PROJECT_ID}.api.sanity.io/v2022-02-01/data/mutate/${DATASET}`;

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const token = process.env.SANITY_API_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Contact form is not configured' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const name = String(payload.name || '').trim().slice(0, 200);
  const email = String(payload.email || '').trim().slice(0, 200);
  const message = String(payload.message || '').trim().slice(0, 5000);

  if (!name || !email || !message) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
  }

  try {
    const res = await fetch(MUTATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mutations: [{ create: { _type: 'contact', name, email, message } }],
      }),
    });

    if (!res.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Failed to submit' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to submit' }) };
  }
};
