
const qs = (id) => document.getElementById(id);
let perfilActual = null, cursos = [], materias = [];

function getSelectedValues(select) { return Array.from(select.selectedOptions).map(o => o.value).filter(Boolean); }

async function cargarBaseDocumentos() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;
  perfilActual = contexto.perfil;

  const [cursosRes, materiasRes] = await Promise.all([
    supabaseClient.from("cursos").select("id, nombre").order("nombre", { ascending: true }),
    supabaseClient.from("materias").select("id, nombre, cursos(nombre)").order("nombre", { ascending: true })
  ]);

  if (cursosRes.error || materiasRes.error) { console.error(cursosRes.error || materiasRes.error); return; }

  cursos = cursosRes.data || [];
  materias = materiasRes.data || [];
  qs("docCursos").innerHTML = cursos.map(c => `<option value="${c.id}">${c.nombre}</option>`).join("");
  qs("docMaterias").innerHTML = materias.map(m => `<option value="${m.id}">${m.nombre} - ${m.cursos?.nombre || "Sin curso"}</option>`).join("");
  await cargarDocumentos();
}

async function cargarDocumentos() {
  const { data, error } = await supabaseClient.from("documentos").select("*").order("creado_en", { ascending: false });
  if (error) { qs("tablaDocumentos").innerHTML = `<p class="form-message">Error: ${error.message}</p>`; console.error(error); return; }
  if (!data || data.length === 0) { qs("tablaDocumentos").innerHTML = "<p class='helper-text'>Todavía no hay documentos registrados.</p>"; return; }

  qs("tablaDocumentos").innerHTML = `<table class="ada-table"><thead><tr><th>Título</th><th>Tipo</th><th>IA</th><th>Descarga</th><th>Archivo</th><th>Estado</th></tr></thead><tbody>${data.map(d => `<tr><td><strong>${d.titulo}</strong><br><small>${d.descripcion || ""}</small></td><td>${d.tipo_documento || "-"}</td><td>${d.puede_usarse_ia ? "<span class='status-ok'>Sí</span>" : "No"}</td><td>${d.puede_descargarse ? "Sí" : "No"}</td><td>${d.url_archivo ? `<a href="${d.url_archivo}" target="_blank">Abrir</a>` : (d.storage_path || "-")}</td><td>${d.activo ? "<span class='status-ok'>Activo</span>" : "<span class='status-off'>Inactivo</span>"}</td></tr>`).join("")}</tbody></table>`;
}

qs("formDocumento").addEventListener("submit", async e => {
  e.preventDefault();
  qs("msgDocumento").textContent = "Guardando documento...";

  const roles = getSelectedValues(qs("docRoles"));
  const cursosSel = getSelectedValues(qs("docCursos"));
  const materiasSel = getSelectedValues(qs("docMaterias"));

  const payload = {
    titulo: qs("docTitulo").value.trim(),
    descripcion: qs("docDescripcion").value.trim(),
    tipo_documento: qs("docTipo").value,
    url_archivo: qs("docUrl").value.trim() || null,
    storage_path: qs("docStoragePath").value.trim() || null,
    puede_usarse_ia: qs("docIA").checked,
    puede_descargarse: qs("docDescargable").checked,
    visible_general: qs("docVisibleGeneral").checked,
    creado_por: perfilActual.id,
    activo: true
  };

  const { data: doc, error } = await supabaseClient.from("documentos").insert(payload).select().single();
  if (error) { qs("msgDocumento").textContent = "Error: " + error.message; console.error(error); return; }

  const inserts = [];
  if (roles.length) inserts.push(supabaseClient.from("documento_roles").insert(roles.map(rol => ({ documento_id: doc.id, rol }))));
  if (cursosSel.length) inserts.push(supabaseClient.from("documento_cursos").insert(cursosSel.map(curso_id => ({ documento_id: doc.id, curso_id }))));
  if (materiasSel.length) inserts.push(supabaseClient.from("documento_materias").insert(materiasSel.map(materia_id => ({ documento_id: doc.id, materia_id }))));

  const results = await Promise.all(inserts);
  const relError = results.find(r => r.error)?.error;
  if (relError) { qs("msgDocumento").textContent = "Documento creado, pero hubo error en permisos: " + relError.message; console.error(relError); return; }

  qs("msgDocumento").textContent = "Documento guardado correctamente.";
  e.target.reset();
  await cargarDocumentos();
});

cargarBaseDocumentos();
