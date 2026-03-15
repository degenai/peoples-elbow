/**
 * Admin Authentication Worker for The People's Elbow
 *
 * Validates a password against an env Secret and issues a simple token.
 */

// List of allowed origins for CORS
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

    // 2. Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
        status: 405,
        headers: getCorsHeaders(request)
      });
    }

    try {
      const data = await request.json();
      const action = data.action;

      // 3. Handle login action
      if (action === 'login') {
        const { password } = data;

        if (!password) {
          return new Response(JSON.stringify({ success: false, message: 'Password required' }), {
            status: 400,
            headers: getCorsHeaders(request)
          });
        }

        // Compare with Cloudflare Secret
        if (password === env.ADMIN_PASSWORD) {
          // In a real production app, use JWT. For this static site context,
          // a hashed representation of the secret mixed with a salt is enough for simple gatekeeping.
          // Since the validation is done on the worker side, this acts as an opaque token.

          const tokenStr = `${env.ADMIN_PASSWORD}_authenticated_token_salt_xyz`;
          const token = await hashToken(tokenStr);

          return new Response(JSON.stringify({
            success: true,
            token: token
          }), {
            status: 200,
            headers: getCorsHeaders(request)
          });
        } else {
          // Sleep briefly to prevent timing attacks / brute force
          await new Promise(resolve => setTimeout(resolve, 500));

          return new Response(JSON.stringify({ success: false, message: 'Invalid password' }), {
            status: 401,
            headers: getCorsHeaders(request)
          });
        }
      }
      // 4. Handle verify action
      else if (action === 'verify') {
        const { token } = data;

        if (!token) {
          return new Response(JSON.stringify({ success: false, message: 'Token required' }), {
            status: 400,
            headers: getCorsHeaders(request)
          });
        }

        // Reconstruct expected token to verify
        const expectedTokenStr = `${env.ADMIN_PASSWORD}_authenticated_token_salt_xyz`;
        const expectedToken = await hashToken(expectedTokenStr);

        if (token === expectedToken) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: getCorsHeaders(request)
          });
        } else {
          return new Response(JSON.stringify({ success: false, message: 'Invalid token' }), {
            status: 401,
            headers: getCorsHeaders(request)
          });
        }
      }
      // 5. Unknown action
      else {
        return new Response(JSON.stringify({ success: false, message: 'Unknown action' }), {
          status: 400,
          headers: getCorsHeaders(request)
        });
      }

    } catch (error) {
      console.error('Worker error:', error);
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
  const origin = request.headers.get('Origin');

  // Create headers with restrict origin list, but allow localhost for testing
  const headers = getCorsHeaders(request);
  headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'Content-Type';
  headers['Access-Control-Max-Age'] = '86400';

  return new Response(null, { headers });
}

/**
 * Get standard CORS headers, restricted to allowed origins
 */
function getCorsHeaders(request) {
  const origin = request?.headers?.get('Origin') || '';

  // Check if the origin is in our allowed list, or if it's localhost (for local dev)
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) ||
                          origin.startsWith('http://localhost:') ||
                          origin.startsWith('http://127.0.0.1:');

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    'Content-Type': 'application/json',
    'Vary': 'Origin' // Important for CDN caching with dynamic CORS
  };
}

/**
 * Simple SHA-256 hash function using Web Crypto API
 */
async function hashToken(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
