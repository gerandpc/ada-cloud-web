(function () {
  "use strict";

  const BUCKET_DOCUMENTOS = "ada-documentos";
  const $ = (id) => document.getElementById(id);
  let documentosVisibles = [];

  function texto(value, fallback = "-") {
    const normalized = String(value ?? "").trim();
    return normalized || fallback;
  }

  function urlSegura(value) {
    if (!value) return null;
    try {
      const parsed = new URL(value, window.location.origin);
      if (!["http:", "https:"].includes(parsed.protocol)) return null;
      return parsed.href;
    } catch (_) {
      return null;
    }
  }

  function mostrarMensaje(message, type = "") {
    const host = $("tablaDocumentos");
    if (!host) return;
    host.replaceChildren();
    const p = document.createElement("p");
    p.className = `form-message ${type}`.trim();
    p.textContent = message;
    host.appendChild(p);
  }

  async function abrirDocumento(documento) {
    if (!documento?.puede_descargarse) {
      alert("Este documento está disponible para consulta interna, pero no admite descarga.");
      return;
    }

    const externalUrl = urlSegura(documento.url_archivo);
    if (externalUrl) {
      window.open(externalUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (!documento.storage_path) {
      alert("Este documento no tiene un archivo disponible.");
      return;
    }

    const { data, error } = await supabaseClient.storage
      .from(BUCKET_DOCUMENTOS)
      .createSignedUrl(documento.storage_path, 60 * 10);

    if (error || !data?.signedUrl) {
      console.error(error);
      alert("No se pudo abrir el documento. Intentá nuevamente.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function celdaTexto(value, className = "") {
    const td = document.createElement("td");
    if (className) td.className = className;
    td.textContent = texto(value);
    return td;
  }

  function renderTabla(documentos) {
    const host = $("tablaDocumentos");
    if (!host) return;
    host.replaceChildren();

    if (!documentos.length) {
      const p = document.createElement("p");
      p.className = "helper-text";
      p.textContent = "No hay documentos habilitados para este usuario.";
      host.appendChild(p);
      return;
    }

    const table = document.createElement("table");
    table.className = "ada-table";
    table.id = "tablaDocumentosHabilitados";

    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    ["Documento", "Tipo", "Uso con IA", "Descarga", "Archivo"].forEach((label) => {
      const th = document.createElement("th");
      th.textContent = label;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    documentos.forEach((documento) => {
      const tr = document.createElement("tr");

      const tdDocumento = document.createElement("td");
      const strong = document.createElement("strong");
      strong.textContent = texto(documento.titulo, "Documento");
      tdDocumento.appendChild(strong);
      if (documento.descripcion) {
        tdDocumento.appendChild(document.createElement("br"));
        const small = document.createElement("small");
        small.textContent = documento.descripcion;
        tdDocumento.appendChild(small);
      }
      tr.appendChild(tdDocumento);

      tr.appendChild(celdaTexto(documento.tipo_documento));
      tr.appendChild(celdaTexto(documento.puede_usarse_ia ? "Sí" : "No"));
      tr.appendChild(celdaTexto(documento.puede_descargarse ? "Sí" : "No"));

      const tdArchivo = document.createElement("td");
      if ((documento.storage_path || urlSegura(documento.url_archivo)) && documento.puede_descargarse) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn-mini no-export";
        button.textContent = "Abrir";
        button.addEventListener("click", () => abrirDocumento(documento));
        tdArchivo.appendChild(button);
      } else {
        tdArchivo.appendChild(document.createTextNode(documento.puede_descargarse ? "Sin archivo" : "Consulta interna"));
      }
      const fileLabel = documento.nombre_archivo_original || documento.url_archivo || "";
      if (fileLabel) {
        tdArchivo.appendChild(document.createElement("br"));
        const small = document.createElement("small");
        small.textContent = fileLabel;
        tdArchivo.appendChild(small);
      }
      tr.appendChild(tdArchivo);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    host.appendChild(table);
  }

  function exportarListado() {
    if (!documentosVisibles.length) {
      alert("No hay documentos para exportar.");
      return;
    }

    if (!window.ADAExport?.openDocument) {
      alert("La exportación no está disponible en este momento.");
      return;
    }

    const rows = documentosVisibles.map((d) => `
      <tr>
        <td>${escapeHtml(texto(d.titulo, "Documento"))}</td>
        <td>${escapeHtml(texto(d.tipo_documento))}</td>
        <td>${escapeHtml(d.puede_usarse_ia ? "Sí" : "No")}</td>
        <td>${escapeHtml(d.puede_descargarse ? "Sí" : "No")}</td>
      </tr>`).join("");

    window.ADAExport.openDocument(
      "Documentos habilitados",
      `<table><thead><tr><th>Documento</th><th>Tipo</th><th>Uso con IA</th><th>Descarga</th></tr></thead><tbody>${rows}</tbody></table>`
    );
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
  }

  async function cargarDocumentosHabilitados() {
    const context = await obtenerSesionPerfil();
    if (!context) return;

    mostrarMensaje("Cargando documentos...");

    const { data, error } = await supabaseClient
      .from("documentos")
      .select("id,titulo,descripcion,tipo_documento,puede_usarse_ia,puede_descargarse,storage_path,url_archivo,nombre_archivo_original,activo,creado_en")
      .eq("activo", true)
      .order("creado_en", { ascending: false });

    if (error) {
      console.error(error);
      mostrarMensaje("No se pudieron cargar los documentos habilitados.", "error");
      return;
    }

    documentosVisibles = Array.isArray(data) ? data : [];
    renderTabla(documentosVisibles);
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("btnExportarDocumentos")?.addEventListener("click", exportarListado);
    cargarDocumentosHabilitados();
  });
})();
