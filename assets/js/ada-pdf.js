(function () {
  'use strict';

  const BRAND = { r: 122, g: 31, b: 43 };
  const TEXT = { r: 31, g: 41, b: 55 };
  const MUTED = { r: 100, g: 116, b: 139 };
  const BORDER = { r: 203, g: 213, b: 225 };
  const LIGHT = { r: 244, g: 231, b: 234 };

  function clean(value) {
    return String(value ?? '')
      .replace(/\r/g, '')
      .replace(/\u00a0/g, ' ')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u2026/g, '...')
      .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, '');
  }

  function pdfEscape(value) {
    return clean(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  function safeName(value) {
    return clean(value || 'ADA_Documento')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'ADA_Documento';
  }

  function dateStamp() { return new Date().toISOString().slice(0, 10); }

  function splitText(text, maxChars) {
    const out = [];
    clean(text).split('\n').forEach(paragraph => {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(''); return; }
      let line = '';
      words.forEach(word => {
        if (word.length > maxChars) {
          if (line) { out.push(line); line = ''; }
          for (let i = 0; i < word.length; i += maxChars) out.push(word.slice(i, i + maxChars));
          return;
        }
        const candidate = line ? `${line} ${word}` : word;
        if (candidate.length > maxChars) { out.push(line); line = word; }
        else line = candidate;
      });
      if (line) out.push(line);
    });
    return out;
  }

  class PdfDocument {
    constructor(options = {}) {
      this.orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
      this.pageW = this.orientation === 'landscape' ? 841.89 : 595.28;
      this.pageH = this.orientation === 'landscape' ? 595.28 : 841.89;
      this.margin = Number(options.margin || 42);
      this.contentW = this.pageW - this.margin * 2;
      this.pages = [];
      this.page = null;
      this.y = this.pageH - this.margin;
      this.title = clean(options.title || 'Documento ADA');
      this.subtitle = clean(options.subtitle || '');
      this.institution = clean(options.institution || document.querySelector('[data-institution-name]')?.textContent?.trim() || 'ADA Cloud');
      this.filename = options.filename || `${safeName(this.title)}_${dateStamp()}.pdf`;
      this.newPage();
    }

    cmd(value) { this.page.push(value); }
    color(c) { return `${(c.r / 255).toFixed(3)} ${(c.g / 255).toFixed(3)} ${(c.b / 255).toFixed(3)}`; }

    newPage() {
      this.page = [];
      this.pages.push(this.page);
      this.y = this.pageH - this.margin;
      this.header();
    }

    header() {
      this.rect(this.margin, this.y - 5, this.contentW, 4, BRAND, true);
      this.y -= 25;
      this.text(this.title, this.margin, this.y, { size: 18, bold: true, color: BRAND, maxChars: this.orientation === 'landscape' ? 88 : 62, leading: 21 });
      if (this.subtitle) this.text(this.subtitle, this.margin, this.y - 3, { size: 9, color: MUTED, maxChars: this.orientation === 'landscape' ? 130 : 88, leading: 12 });
      this.y -= 10;
      this.line(this.margin, this.y, this.pageW - this.margin, this.y, BORDER, 0.8);
      this.y -= 18;
    }

    ensure(height) { if (this.y - height < this.margin + 28) this.newPage(); }

    text(value, x, y, options = {}) {
      const size = options.size || 10;
      const leading = options.leading || size * 1.35;
      const maxChars = options.maxChars || Math.max(12, Math.floor((this.pageW - this.margin - x) / (size * 0.52)));
      const lines = splitText(value, maxChars);
      lines.forEach((line, index) => {
        const yy = y - index * leading;
        this.cmd(`BT /${options.bold ? 'F2' : 'F1'} ${size} Tf ${this.color(options.color || TEXT)} rg 1 0 0 1 ${x.toFixed(2)} ${yy.toFixed(2)} Tm (${pdfEscape(line)}) Tj ET`);
      });
      if (x === this.margin && y === this.y) this.y -= lines.length * leading;
      return lines.length * leading;
    }

    line(x1, y1, x2, y2, color = BORDER, width = 1) {
      this.cmd(`${this.color(color)} RG ${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
    }

    rect(x, y, w, h, color = BORDER, fill = false) {
      this.cmd(`${this.color(color)} ${fill ? 'rg' : 'RG'} ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${fill ? 'f' : 'S'}`);
    }

    heading(value, level = 2) {
      this.ensure(level === 1 ? 34 : 27);
      const size = level === 1 ? 15 : 12;
      this.text(value, this.margin, this.y, { size, bold: true, color: BRAND, maxChars: this.orientation === 'landscape' ? 100 : 72, leading: size * 1.25 });
      this.y -= 3;
      if (level === 1) { this.line(this.margin, this.y, this.pageW - this.margin, this.y, LIGHT, 1.2); this.y -= 10; }
    }

    paragraph(value, options = {}) {
      if (value === null || value === undefined || clean(value).trim() === '') return;
      const size = options.size || 10;
      const maxChars = options.maxChars || (this.orientation === 'landscape' ? 132 : 88);
      const lines = splitText(value, maxChars);
      this.ensure(lines.length * size * 1.35 + 10);
      this.text(value, this.margin, this.y, { size, color: options.color || TEXT, maxChars, leading: size * 1.35, bold: options.bold });
      this.y -= 7;
    }

    keyValues(items = []) {
      const filtered = items.filter(item => item && clean(item[1]).trim() !== '');
      filtered.forEach(([label, value]) => {
        const max = this.orientation === 'landscape' ? 110 : 74;
        const lines = splitText(value, max);
        const height = Math.max(24, lines.length * 12 + 12);
        this.ensure(height + 4);
        this.rect(this.margin, this.y - height + 4, this.contentW, height, LIGHT, true);
        this.text(label, this.margin + 8, this.y - 10, { size: 9, bold: true, color: BRAND, maxChars: 28, leading: 11 });
        this.text(value, this.margin + 145, this.y - 10, { size: 9, color: TEXT, maxChars: max, leading: 11 });
        this.y -= height + 5;
      });
    }

    cards(items = [], columns = 4) {
      if (!items.length) return;
      const gap = 8;
      const width = (this.contentW - gap * (columns - 1)) / columns;
      const rows = Math.ceil(items.length / columns);
      for (let r = 0; r < rows; r++) {
        this.ensure(62);
        const batch = items.slice(r * columns, r * columns + columns);
        batch.forEach((item, i) => {
          const x = this.margin + i * (width + gap);
          this.rect(x, this.y - 48, width, 52, BORDER, false);
          this.text(item.label || '', x + 8, this.y - 10, { size: 8, bold: true, color: MUTED, maxChars: 22, leading: 9 });
          this.text(item.value ?? '—', x + 8, this.y - 31, { size: 15, bold: true, color: BRAND, maxChars: 18, leading: 16 });
        });
        this.y -= 62;
      }
    }

    table(headers = [], rows = [], options = {}) {
      if (!headers.length) return;
      const cols = headers.length;
      const widths = options.widths && options.widths.length === cols
        ? options.widths.map(w => this.contentW * w)
        : Array(cols).fill(this.contentW / cols);
      const fontSize = options.fontSize || (cols >= 6 ? 7 : cols >= 4 ? 8 : 9);
      const maxChars = widths.map(w => Math.max(8, Math.floor(w / (fontSize * 0.50))));
      const drawRow = (cells, header = false) => {
        const wrapped = cells.map((cell, i) => splitText(cell, maxChars[i]));
        const lines = Math.max(1, ...wrapped.map(x => x.length));
        const height = Math.max(21, lines * (fontSize + 3) + 8);
        this.ensure(height + (header ? 0 : 1));
        let x = this.margin;
        cells.forEach((cell, i) => {
          if (header) this.rect(x, this.y - height + 4, widths[i], height, LIGHT, true);
          this.rect(x, this.y - height + 4, widths[i], height, BORDER, false);
          this.text(cell, x + 5, this.y - 10, { size: fontSize, bold: header, color: header ? BRAND : TEXT, maxChars: maxChars[i], leading: fontSize + 3 });
          x += widths[i];
        });
        this.y -= height;
      };
      drawRow(headers, true);
      (rows.length ? rows : [Array(headers.length).fill('Sin datos')]).forEach(row => drawRow(row.map(v => v ?? ''), false));
      this.y -= 10;
    }

    note(value) {
      const lines = splitText(value, this.orientation === 'landscape' ? 130 : 86);
      const height = Math.max(34, lines.length * 11 + 18);
      this.ensure(height);
      this.rect(this.margin, this.y - height + 4, this.contentW, height, LIGHT, true);
      this.text(value, this.margin + 10, this.y - 11, { size: 8.5, color: TEXT, maxChars: this.orientation === 'landscape' ? 126 : 82, leading: 11 });
      this.y -= height + 6;
    }

    footerCommands(pageNumber, total) {
      return [
        `${this.color(BORDER)} RG 0.7 w ${this.margin} 28 m ${this.pageW - this.margin} 28 l S`,
        `BT /F1 7.5 Tf ${this.color(MUTED)} rg 1 0 0 1 ${this.margin} 16 Tm (${pdfEscape(`${this.institution} - Documento generado por ADA Cloud`)}) Tj ET`,
        `BT /F1 7.5 Tf ${this.color(MUTED)} rg 1 0 0 1 ${(this.pageW - this.margin - 65).toFixed(2)} 16 Tm (${pdfEscape(`Pagina ${pageNumber} de ${total}`)}) Tj ET`
      ];
    }

    build() {
      const objects = [];
      const add = content => { objects.push(content); return objects.length; };
      const fontRegular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      const pagesIdPlaceholder = objects.length + 1;
      add('PAGES_PLACEHOLDER');
      const pageIds = [];
      this.pages.forEach((commands, index) => {
        const stream = [...commands, ...this.footerCommands(index + 1, this.pages.length)].join('\n');
        const contentId = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
        const pageId = add(`<< /Type /Page /Parent ${pagesIdPlaceholder} 0 R /MediaBox [0 0 ${this.pageW.toFixed(2)} ${this.pageH.toFixed(2)}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`);
        pageIds.push(pageId);
      });
      objects[pagesIdPlaceholder - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
      const catalogId = add(`<< /Type /Catalog /Pages ${pagesIdPlaceholder} 0 R >>`);
      let pdf = '%PDF-1.4\n%ADA\n';
      const offsets = [0];
      objects.forEach((obj, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
      const xref = pdf.length;
      pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
      for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
      pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
      return new Blob([new Uint8Array(Array.from(pdf, ch => ch.charCodeAt(0) & 0xff))], { type: 'application/pdf' });
    }

    save() {
      const blob = this.build();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
  }

  function fromHTML(title, html, options = {}) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<main>${html}</main>`, 'text/html');
    const pdf = new PdfDocument({ ...options, title });
    const root = doc.querySelector('main');
    const walk = node => {
      if (node.nodeType !== 1) return;
      const tag = node.tagName.toLowerCase();
      if (['script', 'style', 'button'].includes(tag)) return;
      if (tag === 'h1') { if (clean(node.textContent) !== clean(title)) pdf.heading(node.textContent, 1); return; }
      if (tag === 'h2' || tag === 'h3') { pdf.heading(node.textContent, tag === 'h2' ? 1 : 2); return; }
      if (tag === 'table') {
        const headers = Array.from(node.querySelectorAll('thead th')).map(x => x.textContent.trim());
        const allRows = Array.from(node.querySelectorAll('tbody tr')).map(tr => Array.from(tr.querySelectorAll('th,td')).map(x => x.textContent.trim()));
        if (!headers.length) {
          const first = node.querySelector('tr');
          if (first) headers.push(...Array.from(first.querySelectorAll('th,td')).map(x => x.textContent.trim()));
        }
        pdf.table(headers, allRows, { fontSize: headers.length >= 6 ? 7 : 8 });
        return;
      }
      if (tag === 'ul' || tag === 'ol') { Array.from(node.children).forEach((li, i) => pdf.paragraph(`${tag === 'ol' ? `${i + 1}.` : '-'} ${li.textContent.trim()}`)); return; }
      if (['p', 'div', 'section', 'article'].includes(tag)) {
        const direct = Array.from(node.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim();
        if (direct) pdf.paragraph(direct);
        Array.from(node.children).forEach(walk);
        return;
      }
      Array.from(node.children).forEach(walk);
    };
    Array.from(root.children).forEach(walk);
    pdf.save();
  }

  function fromElements(title, elements, options = {}) {
    const html = elements.filter(Boolean).map(el => {
      const clone = el.cloneNode(true);
      clone.querySelectorAll('button,input,select,textarea,.no-export,[hidden],script,style').forEach(n => n.remove());
      return clone.outerHTML;
    }).join('');
    fromHTML(title, html, options);
  }

  window.ADA_PDF = {
    create: options => new PdfDocument(options),
    fromHTML,
    fromElements,
    download(config = {}) {
      const pdf = new PdfDocument(config);
      (config.cards || []).length && pdf.cards(config.cards, config.cardColumns || 4);
      (config.keyValues || []).length && pdf.keyValues(config.keyValues);
      (config.sections || []).forEach(section => {
        if (section.title) pdf.heading(section.title, section.level || 1);
        if (section.text) pdf.paragraph(section.text);
        if (section.keyValues) pdf.keyValues(section.keyValues);
        if (section.cards) pdf.cards(section.cards, section.columns || 4);
        if (section.table) pdf.table(section.table.headers, section.table.rows, section.table.options || {});
        if (section.note) pdf.note(section.note);
      });
      if (config.note) pdf.note(config.note);
      pdf.save();
    }
  };
})();
