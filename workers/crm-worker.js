/**
 * CRM Worker for The People's Elbow (Lead-o-Tron 5000 Port)
 *
 * Provides a secure API to read and write a single JSON blob to Cloudflare KV.
 * Validates the admin token before granting access.
 */

const ALLOWED_ORIGINS = [
  'https://peoples-elbow.com',
  'https://degenai.github.io'
];

export default {
  async fetch(request, env, ctx) {
    // 1. Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleCors(request);
    }

    // 2. Only allow GET and POST/PUT requests
    if (request.method !== 'GET' && request.method !== 'POST' && request.method !== 'PUT') {
      return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
        status: 405,
        headers: getCorsHeaders(request)
      });
    }

    try {
      // 3. Verify the admin token from the Authorization header
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ success: false, message: 'Missing or invalid Authorization header' }), {
          status: 401,
          headers: getCorsHeaders(request)
        });
      }

      const token = authHeader.split(' ')[1];
      const isValid = await verifyToken(token, env.ADMIN_PASSWORD);

      if (!isValid) {
        return new Response(JSON.stringify({ success: false, message: 'Invalid token' }), {
          status: 403,
          headers: getCorsHeaders(request)
        });
      }

      // 4. Handle GET request (Read the entire JSON blob from KV)
      if (request.method === 'GET') {
        const crmData = await env.PEOPLES_ELBOW_CRM.get('crm_data', 'json');

        // If no data exists yet, return an empty initialized structure matching the Electron app
        if (!crmData) {
           return new Response(JSON.stringify({ leads: [], activityLog: [] }), {
            status: 200,
            headers: getCorsHeaders(request)
          });
        }

        return new Response(JSON.stringify(crmData), {
          status: 200,
          headers: getCorsHeaders(request)
        });
      }

      // 5. Handle POST/PUT request (Write the entire JSON blob to KV)
      if (request.method === 'POST' || request.method === 'PUT') {
        const data = await request.json();

        // Basic validation that we received an object with leads array
        if (!data || typeof data !== 'object' || !Array.isArray(data.leads)) {
          return new Response(JSON.stringify({ success: false, message: 'Invalid data format. Expected object with leads array.' }), {
            status: 400,
            headers: getCorsHeaders(request)
          });
        }

        // Save the whole blob to KV under the 'crm_data' key
        await env.PEOPLES_ELBOW_CRM.put('crm_data', JSON.stringify(data));

        return new Response(JSON.stringify({ success: true, message: 'CRM data updated successfully' }), {
          status: 200,
          headers: getCorsHeaders(request)
        });
      }

    } catch (error) {
      console.error('CRM Worker error:', error);
      return new Response(JSON.stringify({ success: false, message: 'Internal Server Error' }), {
        status: 500,
        headers: getCorsHeaders(request)
      });
    }
  }
};

/**
 * Handle CORS preflight requests
 */
function handleCors(request) {
  const headers = getCorsHeaders(request);
  headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  headers['Access-Control-Max-Age'] = '86400';

  return new Response(null, { headers });
}

/**
 * Get standard CORS headers, restricted to allowed origins
 */
function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';

  // Check if the origin is in our allowed list, localhost (dev), or a valid Pages PR preview
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) ||
                          origin.startsWith('http://localhost:') ||
                          origin.startsWith('http://127.0.0.1:') ||
                          /^https:\/\/[a-zA-Z0-9-]+\.peoples-elbow\.pages\.dev$/.test(origin);

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    'Content-Type': 'application/json',
    'Vary': 'Origin' // Important for CDN caching with dynamic CORS
  };
}

/**
 * Simple SHA-256 hash function using Web Crypto API to verify the token
 * This logic must match the token generation in admin-auth-worker.js
 */
async function verifyToken(providedToken, adminPassword) {
  if (!adminPassword || !providedToken) return false;

  const expectedTokenStr = `${adminPassword}_authenticated_token_salt_xyz`;
  const msgBuffer = new TextEncoder().encode(expectedTokenStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedToken = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return providedToken === expectedToken;
}
