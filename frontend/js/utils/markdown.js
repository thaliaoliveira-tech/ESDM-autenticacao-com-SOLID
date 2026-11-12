import { escapeHTML } from './helpers.js';

// Escapes first, then adds only the few tags the assistant is asked to use.
const inline = text => escapeHTML(text)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
  .replace(/`([^`]+)`/g, '<code>$1</code>');

export function renderMarkdown(source) {
  let html = '';
  let list = null;
  let paragraph = [];
  const flushParagraph = () => {
    if (paragraph.length) html += `<p>${paragraph.map(inline).join('<br>')}</p>`;
    paragraph = [];
  };
  const closeList = () => {
    if (list) html += `</${list}>`;
    list = null;
  };
  for (const line of String(source).replace(/\r\n?/g, '\n').split('\n')) {
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    const item = line.match(/^\s*(?:([-*•])|\d+[.)])\s+(.*)$/);
    if (/^\s*([-*_])\1{2,}\s*$/.test(line) || !line.trim()) {
      flushParagraph(); closeList();
    } else if (heading) {
      flushParagraph(); closeList();
      html += `<h3>${inline(heading[1])}</h3>`;
    } else if (item) {
      flushParagraph();
      const tag = item[1] ? 'ul' : 'ol';
      if (list !== tag) { closeList(); html += `<${tag}>`; list = tag; }
      html += `<li>${inline(item[2])}</li>`;
    } else {
      closeList();
      paragraph.push(line);
    }
  }
  flushParagraph(); closeList();
  return html;
}
