// Frozen compatibility fixture from 52bcaa77e0ea728319c990451743a0e6d3737dbf.
export function formatHostEmail({ venueName, contactName, contactEmail, venueType, message, sourceDate }) {
  const isoDate = sourceDate || new Date().toISOString();

  // The machine-readable payload. JSON.stringify escapes quotes, backslashes,
  // newlines, and HTML-ish characters inside the string values for us.
  const leadJson = JSON.stringify({
    schema: 'lead-v1',
    name: venueName,
    venueType: venueType,
    contacts: [
      { name: contactName, email: contactEmail, isPrimary: true }
    ],
    message: message,
    source: 'website',
    sourceDate: isoDate
  });

  // Human section first, then the fence. The fence is just plain text living
  // inside the same plaintext body -- no MIME changes, no separate part.
  return `
    New Host Connection Request

    Venue Name: ${venueName}
    Contact Name: ${contactName}
    Contact Email: ${contactEmail}
    Venue Type: ${venueType}

    Message:
    ${message}

--- LEAD JSON v1 ---
${leadJson}
--- END LEAD JSON ---
  `;
}
