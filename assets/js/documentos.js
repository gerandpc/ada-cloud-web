
const qs = (id) => document.getElementById(id);

const BUCKET_DOCUMENTOS = "ada-documentos";

let perfilActual = null;
let cursos = [];
let materias = [];

function getSelectedValues(select) {
  return Array.from(select.selectedOptions).map(o => o.value).filter(Boolean);
}

function limpiarNombreArchivo(nombre) {
  return nombre
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

function generarStoragePath(file) {
  const fecha = new Date();
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const nombre = limpiarNombreArchivo(file.name);
  const random = crypto.randomUUID();
  return `documentos/${yyyy}/${mm}/${random}-${nombre}`;
}

async function cargarBaseDocumentos() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;
  perfilActual = contexto.perfil;

  const [cursosRes, materiasRes] = await Promise.all([
    supabaseClient.from("cursos").select("id, nombre").order("nombre", { ascending: true }),
    supabaseClient.from("materias").select("id, nombre, cursos(nombre)").order("nombre", { ascending: true })
  ]);

  if (cursosRes.error || materiasRes.error) {
    console.error(cursosRes.error || materiasRes.error);
    return;
  }

  cursos = cursosRes.data || [];
  materias = materiasRes.data || [];

  qs("docCursos").innerHTML = cursos.map(c => `<option value="${c.id}">${c.nombre}</option>`).join("");
  qs("docMaterias").innerHTML = materias.map(m => `<option value="${m.id}">${m.nombre} - ${m.cursos?.nombre || "Sin curso"}</option>`).join("");

  await cargarDocumentos();
}

qs("docArchivo").addEventListener("change", () => {
  const file = qs("docArchivo").files[0];

  if (!file) {
    qs("fileInfo").textContent = "Podés subir PDF, Word, Excel, imágenes u otros materiales institucionales.";
    return;
  }

  qs("fileInfo").textContent = `Archivo seleccionado: ${file.name} (${Math.round(file.size / 1024)} KB)`;
});

async function subirArchivoSiCorresponde() {
  const file = qs("docArchivo").files[0];

  if (!file) {
    return {
      storage_path: qs("docStoragePath").value.trim() || null,
      nombre_archivo_original: null,
      mime_type: null,
      tamanio_bytes: null
    };
  }

  const path = generarStoragePath(file);
  qs("uploadProgress").textContent = "Subiendo archivo a ADA Storage...";

  const { error } = await supabaseClient
    .storage
    .from(BUCKET_DOCUMENTOS)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) {
    throw new Error("Error al subir archivo: " + error.message);
  }

  qs("docStoragePath").value = path;
  qs("uploadProgress").textContent = "Archivo subido correctamente.";

  return {
    storage_path: path,
    nombre_archivo_original: file.name,
    mime_type: file.type || null,
    tamanio_bytes: file.size
  };
}

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

async function cargarDocumentos() {
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
    qs("tablaDocumentos").innerHTML = "<p class='helper-text'>Todavía no hay documentos registrados.</p>";
    return;
  }

  qs("tablaDocumentos").innerHTML = `
    <table class="ada-table">
      <thead>
        <tr>
          <th>Título</th>
          <th>Tipo</th>
          <th>Origen</th>
          <th>IA</th>
          <th>Descarga</th>
          <th>Archivo</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(d => `
          <tr>
            <td>
              <strong>${d.titulo}</strong><br>
              <small>${d.descripcion || ""}</small>
            </td>
            <td>${d.tipo_documento || "-"}</td>
            <td>
              ${d.storage_path ? "<span class='storage-pill'>Storage</span>" : ""}
              ${d.url_archivo ? "<span class='url-pill'>URL</span>" : ""}
              ${!d.storage_path && !d.url_archivo ? "-" : ""}
            </td>
            <td>${d.puede_usarse_ia ? "<span class='status-ok'>Sí</span>" : "No"}</td>
            <td>${d.puede_descargarse ? "Sí" : "No"}</td>
            <td>
              <div class="doc-actions">
                ${(d.storage_path || d.url_archivo) ? `<button class="btn-mini" onclick="abrirDocumento('${d.storage_path || ""}', '${d.url_archivo || ""}')">Abrir</button>` : "-"}
              </div>
              <small>${d.nombre_archivo_original || d.storage_path || d.url_archivo || ""}</small>
            </td>
            <td>${d.activo ? "<span class='status-ok'>Activo</span>" : "<span class='status-off'>Inactivo</span>"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

qs("formDocumento").addEventListener("submit", async (e) => {
  e.preventDefault();

  qs("msgDocumento").textContent = "Guardando documento...";
  qs("uploadProgress").textContent = "";

  try {
    const roles = getSelectedValues(qs("docRoles"));
    const cursosSel = getSelectedValues(qs("docCursos"));
    const materiasSel = getSelectedValues(qs("docMaterias"));

    const archivoData = await subirArchivoSiCorresponde();

    const payload = {
      titulo: qs("docTitulo").value.trim(),
      descripcion: qs("docDescripcion").value.trim(),
      tipo_documento: qs("docTipo").value,
      url_archivo: qs("docUrl").value.trim() || null,
      storage_bucket: BUCKET_DOCUMENTOS,
      storage_path: archivoData.storage_path,
      nombre_archivo_original: archivoData.nombre_archivo_original,
      mime_type: archivoData.mime_type,
      tamanio_bytes: archivoData.tamanio_bytes,
      puede_usarse_ia: qs("docIA").checked,
      puede_descargarse: qs("docDescargable").checked,
      visible_general: qs("docVisibleGeneral").checked,
      creado_por: perfilActual.id,
      activo: true
    };

    const { data: doc, error } = await supabaseClient
      .from("documentos")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const inserts = [];

    if (roles.length) {
      inserts.push(supabaseClient.from("documento_roles").insert(roles.map(rol => ({ documento_id: doc.id, rol }))));
    }

    if (cursosSel.length) {
      inserts.push(supabaseClient.from("documento_cursos").insert(cursosSel.map(curso_id => ({ documento_id: doc.id, curso_id }))));
    }

    if (materiasSel.length) {
      inserts.push(supabaseClient.from("documento_materias").insert(materiasSel.map(materia_id => ({ documento_id: doc.id, materia_id }))));
    }

    const results = await Promise.all(inserts);
    const relError = results.find(r => r.error)?.error;

    if (relError) {
      throw new Error("Documento creado, pero hubo error en permisos: " + relError.message);
    }

    qs("msgDocumento").textContent = "Documento guardado correctamente.";
    e.target.reset();
    qs("fileInfo").textContent = "Podés subir PDF, Word, Excel, imágenes u otros materiales institucionales.";
    qs("uploadProgress").textContent = "";
    await cargarDocumentos();

  } catch (error) {
    qs("msgDocumento").textContent = "Error: " + error.message;
    qs("uploadProgress").textContent = "";
    console.error(error);
  }
});

cargarBaseDocumentos();
