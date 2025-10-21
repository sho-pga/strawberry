export function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildLocalPreviewHtml(content) {
  const title = escapeHtml(content.title || "Preview");
  const body = escapeHtml(content.body || "");
  return `\n      <article class="local-preview-fallback" style="padding:1.25rem">\n        <h2 style="margin-top:0;">${title}</h2>\n        <div>${body.replace(
    /\n/g,
    "<br/>"
  )}</div>\n      </article>\n    `;
}
