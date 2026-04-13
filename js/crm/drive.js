// ============================================
// Google Drive REST wrapper
// Scope: drive.file (app-created files only)
// All methods require a valid OAuth access token.
// ============================================

const DRIVE_FILENAME = 'peoples-elbow-crm.json';
const DRIVE_UPLOAD   = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_FILES    = 'https://www.googleapis.com/drive/v3/files';

export const Drive = {
  // Find the CRM file by name; returns file ID or null.
  // Sorted by modifiedTime desc so if duplicates exist we get the freshest.
  async find(token) {
    const q = encodeURIComponent(`name='${DRIVE_FILENAME}' and trashed=false`);
    const res = await fetch(
      `${DRIVE_FILES}?q=${q}&orderBy=modifiedTime%20desc&pageSize=1&fields=files(id)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const { files } = await res.json();
    return files?.[0]?.id || null;
  },

  // Read and parse the JSON content of a Drive file.
  async read(fileId, token) {
    const res = await fetch(
      `${DRIVE_FILES}/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    return res.json();
  },

  // Create a new JSON file in Drive; returns the new file ID.
  async create(data, token) {
    const metadata = { name: DRIVE_FILENAME, mimeType: 'application/json' };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file',     new Blob([JSON.stringify(data)],     { type: 'application/json' }));
    const res = await fetch(
      `${DRIVE_UPLOAD}?uploadType=multipart&fields=id`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
    );
    if (!res.ok) return null;
    return (await res.json()).id;
  },

  // Overwrite an existing Drive file with new JSON content.
  async update(fileId, data, token) {
    return fetch(
      `${DRIVE_UPLOAD}/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );
  },

  // Delete the CRM file from Drive (for "start fresh" flows).
  async delete(fileId, token) {
    return fetch(
      `${DRIVE_FILES}/${fileId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
    );
  }
};
