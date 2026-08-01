(function () {
  "use strict";

  const ESCAPE = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  function printableStyles() {
    return `
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; color:#172033; margin:0; font-size:12px; }
      .doc-header { border-bottom:3px solid #168c88; padding-bottom:10px; margin-bottom:18px; }
      .doc-header h1 { margin:0 0 5px; font-size:22px; }
      .doc-meta { color:#5d6b7d; font-size:11px; }
      h2 { margin:20px 0 8px; font-size:15px; color:#0f6461; }
      p { margin:5px 0; line-height:1.45; white-space:pre-wrap; }
      table { width:100%; border-collapse:collapse; margin-top:10px; }
      th, td { border:1px solid #cfd7df; padding:7px; vertical-align:top; text-align:left; }
      th { background:#edf6f5; font-weight:700; }
      tr { break-inside:avoid; }
      .field { margin:0 0 12px; break-inside:avoid; }
      .field-label { display:block; font-weight:700; color:#344054; margin-bottom:3px; }
      .status { display:inline-block; border:1px solid #b8c6d1; border-radius:999px; padding:3px 8px; font-size:10px; }
      .empty { color:#6b7280; font-style:italic; }
      a { color:#0f6461; word-break:break-all; }
      button, .btn-primary, .btn-secondary, .ada-pdf-toolbar, .actions, [data-no-print] { display:none !important; }
    `;
  }

  function openPrintDocument(title, bodyHtml, options = {}) {
    const win = window.open("", "_blank", "noopener,noreferrer,width=1000,height=800");
    if (!win) {
      alert("El navegador bloqueó la ventana de impresión. Habilitá las ventanas emergentes para ADA.");
      return;
    }
    const subtitle = options.subtitle || document.title || "ADA Cloud";
    const date = new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeStyle: "short" }).format(new Date());
    win.document.open();
    win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${ESCAPE(title)}</title><style>${printableStyles()}</style></head><body><header class="doc-header"><h1>${ESCAPE(title)}</h1><div class="doc-meta">${ESCAPE(subtitle)} · Generado ${ESCAPE(date)}</div></header>${bodyHtml}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));<\/script></body></html>`);
    win.document.close();
  }

  function exportElement(elementOrId, title, options = {}) {
    const element = typeof elementOrId === "string" ? document.getElementById(elementOrId) : elementOrId;
    if (!element) {
      alert("No hay información disponible para exportar.");
      return;
    }
    const clone = element.cloneNode(true);
    clone.querySelectorAll("button, form, input, select, textarea, .ada-pdf-toolbar, [data-no-print]").forEach((node) => node.remove());
    openPrintDocument(title || "Informe ADA", clone.outerHTML, options);
  }

  function exportDocument(title, fields, options = {}) {
    const body = (fields || []).map((field) => {
      const label = ESCAPE(field.label || "");
      const value = field.html === true ? (field.value || "") : ESCAPE(field.value || "No informado").replace(/\n/g, "<br>");
      return `<section class="field"><span class="field-label">${label}</span><div>${value || '<span class="empty">No informado</span>'}</div></section>`;
    }).join("");
    openPrintDocument(title || "Documento ADA", body, options);
  }

  function inferTitle(table) {
    const section = table.closest("section, .panel-card, .module-view");
    const heading = section?.querySelector("h2, h1");
    return heading?.textContent?.trim() || document.querySelector("h1")?.textContent?.trim() || "Listado ADA";
  }

  function attachTableExport(table) {
    if (!table || table.dataset.adaPdfReady === "1") return;
    table.dataset.adaPdfReady = "1";
    const wrap = table.closest(".table-wrap") || table.parentElement;
    if (!wrap || wrap.querySelector(":scope > .ada-pdf-toolbar")) return;
    const toolbar = document.createElement("div");
    toolbar.className = "ada-pdf-toolbar";
    toolbar.dataset.noPrint = "true";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn-secondary ada-pdf-button";
    button.textContent = "Exportar listado a PDF";
    button.addEventListener("click", () => exportElement(table, inferTitle(table)));
    toolbar.appendChild(button);
    wrap.insertBefore(toolbar, wrap.firstChild);
  }

  function scanTables() {
    document.querySelectorAll("table.ada-table").forEach(attachTableExport);
  }

  const observer = new MutationObserver(scanTables);
  document.addEventListener("DOMContentLoaded", () => {
    scanTables();
    observer.observe(document.body, { childList: true, subtree: true });
  });

  window.ADAExport = { escape: ESCAPE, openPrintDocument, exportElement, exportDocument, scanTables };
})();
