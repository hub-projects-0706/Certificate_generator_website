/**
 * template-store.js
 * Shared "backend" for the demo — persists everything to localStorage
 * so the Admin page and Student page can talk to each other without a server.
 *
 * Swap this module out for real API calls when connecting a backend.
 */

const CertifyStore = (() => {
  const KEYS = {
    TEMPLATE_IMG: 'certify_template_image',   // base64 data URL
    TEMPLATE_DIMS: 'certify_template_dims',   // {w,h}
    FIELDS: 'certify_fields',                 // [{key,label,x,y,w,h,fontSize,color,font,align}]
    ROSTER: 'certify_roster',                 // [{uid,name,...extra}]
    ADMIN_AUTH: 'certify_admin_auth'
  };

  function saveTemplateImage(dataUrl, dims) {
    localStorage.setItem(KEYS.TEMPLATE_IMG, dataUrl);
    localStorage.setItem(KEYS.TEMPLATE_DIMS, JSON.stringify(dims));
  }

  function getTemplateImage() {
    return localStorage.getItem(KEYS.TEMPLATE_IMG);
  }

  function getTemplateDims() {
    const raw = localStorage.getItem(KEYS.TEMPLATE_DIMS);
    return raw ? JSON.parse(raw) : null;
  }

  function saveFields(fields) {
    localStorage.setItem(KEYS.FIELDS, JSON.stringify(fields));
  }

  function getFields() {
    const raw = localStorage.getItem(KEYS.FIELDS);
    return raw ? JSON.parse(raw) : [];
  }

  function saveRoster(roster) {
    localStorage.setItem(KEYS.ROSTER, JSON.stringify(roster));
  }

  function getRoster() {
    const raw = localStorage.getItem(KEYS.ROSTER);
    return raw ? JSON.parse(raw) : [];
  }

  function findRosterEntry(uid, name) {
    const roster = getRoster();
    const u = (uid || '').trim().toLowerCase();
    const n = (name || '').trim().toLowerCase();
    return roster.find(r =>
      String(r.uid).trim().toLowerCase() === u &&
      String(r.name).trim().toLowerCase() === n
    );
  }

  function clearAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }

  function isPublished() {
    return !!(getTemplateImage() && getFields().length && getRoster().length);
  }

  return {
    KEYS,
    saveTemplateImage, getTemplateImage, getTemplateDims,
    saveFields, getFields,
    saveRoster, getRoster, findRosterEntry,
    clearAll, isPublished
  };
})();
