export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Expected POST request', { status: 405 });
    }

    try {
      const commitData = await request.json();

      // Basic validation
      const requiredFields = ['commit_hash', 'commit_message', 'commit_date', 'author_name'];
      for (const field of requiredFields) {
        if (!commitData[field]) {
          return new Response(`Missing required field: ${field}`, { status: 400 });
        }
      }

      const { commit_hash, commit_message, commit_date, author_name, author_email } = commitData;

      const ps = env.CHANGELOG_DB.prepare(
        'INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES (?, ?, ?, ?, ?)'
      );
      
      await ps.bind(commit_hash, commit_message, commit_date, author_name, author_email || null).run();

      return new Response(JSON.stringify({ success: true, message: 'Changelog entry added.' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (e) {
      console.error('Error adding changelog entry:', e);
      // Check for unique constraint violation (specific to SQLite error messages for D1)
      if (e.message && e.message.includes('UNIQUE constraint failed')) {
        return new Response(JSON.stringify({ success: false, message: 'Error: Commit hash already exists.' }), {
          status: 409, // Conflict
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: false, message: 'Failed to add changelog entry.', error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
