// ============================================
// Google Drive REST wrapper  (Lead-o-Tron v2)
// Scope: drive.file (the app only ever sees files it created).
// All methods take a valid OAuth access token.
//
// v2 error contract: every method returns { ok, status, ... } so callers can
// tell "the request failed" (ok:false) apart from "no such file" (ok:true,
// fileId:null). The v1 wrapper returned null for BOTH, which is how a transient
// network error at sign-in spawned an empty duplicate file that then shadowed
// the user's real data. Never collapse those two cases again.
// ============================================

const DRIVE_FILENAME = 'peoples-elbow-crm.json';
const DRIVE_UPLOAD   = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_FILES    = 'https://www.googleapis.com/drive/v3/files';

export const Drive = {
  // Find the CRM file by name. ok:true + fileId:null means "confirmed: no file".
  // ok:false means the lookup itself failed — caller must NOT treat that as "no file".
  async find(token) {
    try {
      const q = encodeURIComponent(`name='${DRIVE_FILENAME}' and trashed=false`);
      const res = await fetch(
        `${DRIVE_FILES}?q=${q}&orderBy=modifiedTime%20desc&pageSize=1&fields=files(id)`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return { ok: false, status: res.status, fileId: null };
      const { files } = await res.json();
      return { ok: true, status: res.status, fileId: files?.[0]?.id || null };
    } catch (e) {
      return { ok: false, status: 0, fileId: null, error: e };
    }
  },

  // Read + parse the JSON content of a Drive file.
  async read(fileId, token) {
    try {
      const res = await fetch(
        `${DRIVE_FILES}/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return { ok: false, status: res.status, data: null };
      return { ok: true, status: res.status, data: await res.json() };
    } catch (e) {
      return { ok: false, status: 0, data: null, error: e };
    }
  },

  // Create a new JSON file in Drive; returns its id on success.
  async create(data, token) {
    try {
      const metadata = { name: DRIVE_FILENAME, mimeType: 'application/json' };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file',     new Blob([JSON.stringify(data)],     { type: 'application/json' }));
      const res = await fetch(
        `${DRIVE_UPLOAD}?uploadType=multipart&fields=id`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
      );
      if (!res.ok) return { ok: false, status: res.status, fileId: null };
      return { ok: true, status: res.status, fileId: (await res.json()).id };
    } catch (e) {
      return { ok: false, status: 0, fileId: null, error: e };
    }
  },

  // Overwrite an existing Drive file with new JSON content.
  async update(fileId, data, token) {
    try {
      const res = await fetch(
        `${DRIVE_UPLOAD}/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      return { ok: res.ok, status: res.status };
    } catch (e) {
      return { ok: false, status: 0, error: e };
    }
  },

  // Delete the CRM file (for an explicit "start fresh" flow).
  async remove(fileId, token) {
    try {
      const res = await fetch(
        `${DRIVE_FILES}/${fileId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
      return { ok: res.ok, status: res.status };
    } catch (e) {
      return { ok: false, status: 0, error: e };
    }
  },
};
