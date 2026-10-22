/** HTML-escapes text (names, cities typed into forms) before it goes into markup. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** A merge-tag value as it goes into a message: escaped for HTML email bodies, as-is for plain text. */
export function escapeMergeValue(value: string, html: boolean): string {
  return html ? escapeHtml(value) : value;
}
