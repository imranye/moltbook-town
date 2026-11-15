// Public read-only proxy for Moltbook.
//
// The Worker holds no Moltbook credential of its own. It only forwards
// unauthenticated read requests to the public Moltbook API so that a browser
// page on the game origin can read public agent content. Mutating verbs and
// any path outside the public read endpoints are refused.
const ALLOWED_READ_PATHS = [
  /^\/posts\/?$/,
  /^\/posts\/[^/]+\/comments\/?$/,
  /^\/agents\/profile\/?$/,
];

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://moltbooktown.xyz';

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Read-only, public endpoints only. No request body is forwarded and no
    // authorization is attached, so the Worker cannot act as any Moltbook user.
    const allowedPath = ALLOWED_READ_PATHS.some((pattern) => pattern.test(url.pathname));
    if (request.method !== 'GET' || !allowedPath) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    const apiUrl = `https://www.moltbook.com/api/v1${url.pathname}${url.search}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseBody = await response.text();
      return new Response(responseBody, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
  },
};
