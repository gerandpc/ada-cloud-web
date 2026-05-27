
const qs = (id) => document.getElementById(id);
const BUCKET_DOCUMENTOS = "ada-documentos";

async function abrirDocumento(storagePath, urlExterna) {
  if (urlExterna) {
    window.open(urlExterna, "_blank");
    return;
  }

  if (!storagePath) {
    alert("Este documento no tiene archivo asociado.");
    return;
  }

  const { data, error } = await supabaseClient
    .storage
    .from(BUCKET_DOCUMENTOS)
    .createSignedUrl(storagePath, 60 * 10);

  if (error) {
    alert("No se pudo abrir el documento: " + error.message);
    console.error(error);
    return;
  }

  window.open(data.signedUrl, "_blank");
}

window.abrirDocumento = abrirDocumento;

async function cargarDocumentosHabilitados() {
  await obtenerSesionPerfil();

  const { data, error } = await supabaseClient
    .from("documentos")
    .select("*")
    .order("creado_en", { ascending: false });

  if (error) {
    qs("tablaDocumentos").innerHTML = `<p class="form-message">Error: ${error.message}</p>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    qs("tablaDocumentos").innerHTML = "<p class='helper-text'>No hay documentos habilitados para este usuario.</p>";
    return;
  }

  qs("tablaDocumentos").innerHTML = `
    <table class="ada-table">
      <thead>
        <tr>
          <th>Documento</th>
          <th>Tipo</th>
          <th>IA</th>
          <th>Descarga</th>
          <th>Archivo</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(d => `
          <tr>
            <td><strong>${d.titulo}</strong><br><small>${d.descripcion || ""}</small></td>
            <td>${d.tipo_documento || "-"}</td>
            <td>${d.puede_usarse_ia ? "<span class='status-ok'>Sí</span>" : "No"}</td>
            <td>${d.puede_descargarse ? "Sí" : "No"}</td>
            <td>
              ${(d.storage_path || d.url_archivo)
                ? `<button class="btn-mini" onclick="abrirDocumento('${d.storage_path || ""}', '${d.url_archivo || ""}')">Abrir</button>`
                : "-"
              }
              <br><small>${d.nombre_archivo_original || d.storage_path || d.url_archivo || ""}</small>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

cargarDocumentosHabilitados();
