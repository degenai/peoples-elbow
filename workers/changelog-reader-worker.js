export default {
  async fetch(request, env, ctx) {
    // Set CORS headers for cross-origin requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Expected GET request' }), 
        { status: 405, headers: corsHeaders }
      );
    }

    try {
      // Parse query parameters
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit')) || 50;
      const offset = parseInt(url.searchParams.get('offset')) || 0;

      // Validate limit (max 100 for performance)
      if (limit > 100) {
        return new Response(
          JSON.stringify({ error: 'Limit cannot exceed 100' }), 
          { status: 400, headers: corsHeaders }
        );
      }

      // Query changelog entries from D1, ordered by date (newest first)
      const ps = env.CHANGELOG_DB.prepare(`
        SELECT 
          commit_hash,
          commit_message,
          commit_date,
          author_name,
          author_email
        FROM changelog_entries 
        ORDER BY commit_date DESC 
        LIMIT ? OFFSET ?
      `);

      // Also get total count for pagination and version calculation
      const countPs = env.CHANGELOG_DB.prepare(`
        SELECT COUNT(*) as total FROM changelog_entries
      `);

      const [result, countResult] = await Promise.all([
        ps.bind(limit, offset).all(),
        countPs.all()
      ]);

      const totalCount = countResult.results[0].total;
      const hasMore = (offset + limit) < totalCount;

      const response = {
        success: true,
        data: result.results || [],
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore
        }
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: corsHeaders
      });

    } catch (error) {
      console.error('Error fetching changelog entries:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch changelog entries',
          message: error.message 
        }), 
        { status: 500, headers: corsHeaders }
      );
    }
  }
};
