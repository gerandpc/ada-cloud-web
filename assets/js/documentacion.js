// ADA Cloud Web - Bloque 28
// Documentación familiar, justificaciones y firmas.

const ADA_DOC_BUCKET = "ada-documentacion-familiar";
const ADA_DOC_GESTION_ROLES = ["admin", "directivo", "secretaria", "preceptor"];

let adaDocContext = null;
let adaDocCursos = [];
let adaDocAlumnos = [];
let adaDocFamiliasPorAlumno = new Map();

function adaDoc$(id) { return document.getElementById(id); }

function adaDocSetMessage(text, type = "") {
  const el = adaDoc$("mensajeDocumentacion");
  if (!el) return;
  el.textContent = text || "";
  el.className = `form-message ${type}`.trim();
}

function adaDocRole() { return adaDocContext?.perfil?.rol || "alumno"; }
function adaDocIsGestion() { return ADA_DOC_GESTION_ROLES.includes(adaDocRole()); }
function adaDocIsFamiliaAlumno() { return ["familia", "alumno"].includes(adaDocRole()); }

function adaDocFormatDate(value) {
  if (!value) return "Sin fecha";
  const d = new Date(value + (value.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-AR");
}

function adaDocCleanFileName(fileName) {
  return (fileName || "archivo").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function adaDocTipoLabel(tipo) {
  const map = {
    documento_firma: "Documento para firma",
    autorizacion: "Autorización",
    ficha: "Ficha / formulario",
    acta: "Acta",
    justificacion: "Justificación",
    certificado: "Certificado / comprobante",
    tardanza: "Tardanza",
    retiro: "Retiro anticipado",
    informativo: "Informativo",
    documentacion: "Documentación"
  };
  return map[tipo] || tipo || "Trámite";
}

function adaDocEstadoLabel(estado) {
  const map = {
    pendiente: "Pendiente",
    visto: "Visto",
    devuelto: "Devuelto",
    aprobado: "Aprobado",
    observado: "Observado",
    rechazado: "Rechazado",
    vencido: "Vencido",
    archivado: "Archivado"
  };
  return map[estado] || estado || "Pendiente";
}

function adaDocOrigenLabel(origen) {
  if (origen === "secretaria") return "Secretaría";
  if (origen === "preceptoria") return "Preceptoría";
  return origen || "ADA";
}

async function adaDocUploadFile(file, path) {
  if (!file) return null;
  const { error } = await supabaseClient.storage.from(ADA_DOC_BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

async function adaDocSignedUrl(path) {
  if (!path) return null;
  const { data, error } = await supabaseClient.storage.from(ADA_DOC_BUCKET).createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data?.signedUrl;
}

async function adaDocDownload(path) {
  try {
    const url = await adaDocSignedUrl(path);
    if (url) window.open(url, "_blank", "noopener");
  } catch (error) {
    console.error(error);
    adaDocSetMessage("No se pudo abrir el archivo.", "error");
  }
}

async function adaDocLoadBaseData() {
  const cursosReq = supabaseClient.from("cursos").select("id,nombre,nivel,turno,activo").order("nombre", { ascending: true });
  const alumnosReq = supabaseClient.from("profiles").select("id,nombre,apellido,email,rol,activo").in("rol", ["alumno", "Alumno"]).order("apellido", { ascending: true });

  const [{ data: cursos }, { data: alumnos, error: alumnosError }] = await Promise.all([cursosReq, alumnosReq]);
  adaDocCursos = (cursos || []).filter(c => c.activo !== false);

  if (alumnosError) {
    console.warn("No se pudieron leer alumnos desde profiles:", alumnosError);
    adaDocAlumnos = [];
  } else {
    adaDocAlumnos = (alumnos || []).filter(a => a.activo !== false).map(a => ({
      ...a,
      nombreCompleto: `${a.apellido || ""} ${a.nombre || ""}`.trim() || a.email || "Alumno"
    }));
  }

  await adaDocLoadFamiliasPorAlumno();
  adaDocRenderSelectors();
}

async function adaDocLoadFamiliasPorAlumno() {
  adaDocFamiliasPorAlumno = new Map();
  try {
    const { data, error } = await supabaseClient.from("familia_alumnos").select("familia_id, alumno_id, activo");
    if (error) throw error;
    (data || []).filter(r => r.activo !== false).forEach(r => {
      if (!adaDocFamiliasPorAlumno.has(r.alumno_id)) adaDocFamiliasPorAlumno.set(r.alumno_id, []);
      adaDocFamiliasPorAlumno.get(r.alumno_id).push(r.familia_id);
    });
  } catch (error) {
    console.warn("No se pudo leer familia_alumnos. Se usará destinatario sin familia explícita:", error);
  }
}

function adaDocRenderSelectors() {
  const cursosBox = adaDoc$("selectorCursos");
  const alumnosBox = adaDoc$("selectorAlumnos");
  if (cursosBox) {
    cursosBox.innerHTML = adaDocCursos.length ? adaDocCursos.map(c => `
      <label class="selector-item"><input type="checkbox" value="${c.id}" data-curso-check> <span>${c.nombre || "Curso"}</span></label>
    `).join("") : `<div class="doc-empty">No hay cursos cargados.</div>`;
  }
  if (alumnosBox) {
    alumnosBox.innerHTML = adaDocAlumnos.length ? adaDocAlumnos.map(a => `
      <label class="selector-item"><input type="checkbox" value="${a.id}" data-alumno-check> <span>${a.nombreCompleto}</span></label>
    `).join("") : `<div class="doc-empty">No hay alumnos cargados.</div>`;
  }
}

async function adaDocGetAlumnoCursosMap(alumnoIds = null) {
  try {
    let q = supabaseClient.from("alumno_cursos").select("alumno_id,curso_id,activo");
    if (alumnoIds && alumnoIds.length) q = q.in("alumno_id", alumnoIds);
    const { data, error } = await q;
    if (error) throw error;
    const map = new Map();
    (data || []).filter(r => r.activo !== false).forEach(r => {
      if (!map.has(r.alumno_id)) map.set(r.alumno_id, []);
      map.get(r.alumno_id).push(r.curso_id);
    });
    return map;
  } catch (error) {
    console.warn("No se pudo leer alumno_cursos:", error);
    return new Map();
  }
}

async function adaDocGetAlumnosPorCursos(cursoIds) {
  if (!cursoIds.length) return [];
  const { data, error } = await supabaseClient
    .from("alumno_cursos")
    .select("alumno_id,curso_id,activo")
    .in("curso_id", cursoIds);
  if (error) throw error;
  const registros = (data || []).filter(r => r.activo !== false);
  const alumnoMap = new Map();
  registros.forEach(r => {
    if (!alumnoMap.has(r.alumno_id)) alumnoMap.set(r.alumno_id, new Set());
    alumnoMap.get(r.alumno_id).add(r.curso_id);
  });
  return Array.from(alumnoMap.entries()).map(([alumno_id, cursos]) => ({ alumno_id, cursos: Array.from(cursos) }));
}

async function adaDocResolveDestinatarios() {
  const modo = document.querySelector("input[name='destinoModo']:checked")?.value || "curso";
  let alumnos = [];

  if (modo === "todos") {
    const cursoMap = await adaDocGetAlumnoCursosMap(adaDocAlumnos.map(a => a.id));
    alumnos = adaDocAlumnos.map(a => ({ alumno_id: a.id, cursos: cursoMap.get(a.id) || [] }));
  }

  if (modo === "alumnos") {
    const ids = Array.from(document.querySelectorAll("[data-alumno-check]:checked")).map(i => i.value);
    const cursoMap = await adaDocGetAlumnoCursosMap(ids);
    alumnos = ids.map(id => ({ alumno_id: id, cursos: cursoMap.get(id) || [] }));
  }

  if (modo === "curso") {
    const cursoIds = Array.from(document.querySelectorAll("[data-curso-check]:checked")).map(i => i.value);
    alumnos = await adaDocGetAlumnosPorCursos(cursoIds);
  }

  const rows = [];
  alumnos.forEach(item => {
    const familias = adaDocFamiliasPorAlumno.get(item.alumno_id) || [null];
    familias.forEach(familia_id => {
      rows.push({
        alumno_id: item.alumno_id,
        familia_id,
        curso_id: item.cursos?.[0] || null,
        estado: "pendiente"
      });
    });
  });

  const unique = new Map();
  rows.forEach(r => unique.set(`${r.alumno_id}_${r.familia_id || "sf"}`, r));
  return Array.from(unique.values());
}

function adaDocBindTabs() {
  document.querySelectorAll(".doc-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".doc-tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".doc-tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      adaDoc$(btn.dataset.tab)?.classList.add("active");
    });
  });
}

function adaDocApplyRoleUI() {
  const gestion = adaDocIsGestion();
  document.querySelectorAll("[data-area-only='gestion']").forEach(el => el.classList.toggle("hidden", !gestion));
  document.querySelectorAll("[data-area-only='familia']").forEach(el => el.classList.toggle("hidden", !adaDocIsFamiliaAlumno()));

  const origen = adaDoc$("tramiteOrigen");
  if (origen) {
    if (adaDocRole() === "secretaria") { origen.value = "secretaria"; origen.disabled = true; }
    if (adaDocRole() === "preceptor") { origen.value = "preceptoria"; origen.disabled = true; }
  }
}

function adaDocBindRecipientModes() {
  document.querySelectorAll("input[name='destinoModo']").forEach(radio => {
    radio.addEventListener("change", () => {
      const modo = document.querySelector("input[name='destinoModo']:checked")?.value;
      adaDoc$("selectorCursos")?.classList.toggle("hidden", modo !== "curso");
      adaDoc$("selectorAlumnos")?.classList.toggle("hidden", modo !== "alumnos");
    });
  });
}

async function adaDocCreateTramite(event) {
  event.preventDefault();
  try {
    adaDocSetMessage("Creando trámite y destinatarios...");
    const origen = adaDoc$("tramiteOrigen").value;
    const tipo = adaDoc$("tramiteTipo").value;
    const titulo = adaDoc$("tramiteTitulo").value.trim();
    const descripcion = adaDoc$("tramiteDescripcion").value.trim();
    const fecha_limite = adaDoc$("tramiteFechaLimite").value || null;
    const requiere_devolucion = adaDoc$("tramiteRequiereDevolucion").checked;
    const file = adaDoc$("tramiteArchivo").files?.[0] || null;
    const destinatarios = await adaDocResolveDestinatarios();

    if (!titulo) throw new Error("Ingresá un título.");
    if (!destinatarios.length) throw new Error("Seleccioná al menos un destinatario válido.");

    const { data: tramite, error: insertError } = await supabaseClient.from("documentacion_tramites").insert({
      titulo, descripcion, origen_area: origen, tipo_tramite: tipo, requiere_devolucion, fecha_limite,
      creado_por: adaDocContext.session.user.id,
      estado: "activo"
    }).select("*").single();
    if (insertError) throw insertError;

    let archivoPath = null;
    if (file) {
      const year = new Date().getFullYear();
      archivoPath = `enviados/${origen}/${year}/${tramite.id}/${Date.now()}_${adaDocCleanFileName(file.name)}`;
      await adaDocUploadFile(file, archivoPath);
      const { error: updateError } = await supabaseClient.from("documentacion_tramites").update({
        archivo_enviado_path: archivoPath,
        archivo_enviado_nombre: file.name,
        archivo_enviado_tipo: file.type || "application/octet-stream"
      }).eq("id", tramite.id);
      if (updateError) throw updateError;
    }

    const rows = destinatarios.map(d => ({ ...d, tramite_id: tramite.id }));
    const { error: destError } = await supabaseClient.from("documentacion_destinatarios").insert(rows);
    if (destError) throw destError;

    await adaDocAudit(tramite.id, null, "enviado", `Destinatarios: ${rows.length}`);
    adaDocSetMessage(`Trámite enviado correctamente a ${rows.length} destinatario/s.`, "success");
    event.target.reset();
    await adaDocLoadSeguimiento();
  } catch (error) {
    console.error(error);
    adaDocSetMessage(error.message || "No se pudo crear el trámite.", "error");
  }
}

async function adaDocLoadFamilyStudents() {
  const select = adaDoc$("familiaAlumno");
  if (!select) return;
  let alumnos = [];

  if (adaDocRole() === "alumno") {
    const p = adaDocContext.perfil;
    alumnos = [{ id: p.id, nombreCompleto: `${p.apellido || ""} ${p.nombre || ""}`.trim() || p.email || "Alumno" }];
  } else if (adaDocRole() === "familia") {
    try {
      const { data, error } = await supabaseClient
        .from("familia_alumnos")
        .select("alumno_id, alumno:profiles!familia_alumnos_alumno_id_fkey(id,nombre,apellido,email)")
        .eq("familia_id", adaDocContext.perfil.id);
      if (error) throw error;
      alumnos = (data || []).map(r => ({
        id: r.alumno_id,
        nombreCompleto: `${r.alumno?.apellido || ""} ${r.alumno?.nombre || ""}`.trim() || r.alumno?.email || "Alumno"
      }));
    } catch (error) {
      console.warn("No se pudo traer alumnos vinculados con relación explícita:", error);
      alumnos = adaDocAlumnos;
    }
  }

  select.innerHTML = alumnos.length ? alumnos.map(a => `<option value="${a.id}">${a.nombreCompleto}</option>`).join("") : `<option value="">No hay alumnos asociados</option>`;
}

async function adaDocCreateFamilySolicitud(event) {
  event.preventDefault();
  try {
    adaDocSetMessage("Enviando certificado o solicitud...");
    const alumno_id = adaDoc$("familiaAlumno").value;
    const origen_area = adaDoc$("familiaDestino").value;
    const tipo = adaDoc$("familiaTipo").value;
    const fecha = adaDoc$("familiaFecha").value || null;
    const observacion = adaDoc$("familiaObservacion").value.trim();
    const file = adaDoc$("familiaArchivo").files?.[0];
    if (!alumno_id) throw new Error("Seleccioná un alumno.");
    if (!file) throw new Error("Adjuntá un archivo.");

    const titulo = `${adaDocTipoLabel(tipo)} familiar`;
    const { data: tramite, error: tramiteError } = await supabaseClient.from("documentacion_tramites").insert({
      titulo,
      descripcion: observacion,
      origen_area,
      tipo_tramite: tipo,
      requiere_devolucion: false,
      fecha_limite: fecha,
      creado_por: adaDocContext.session.user.id,
      estado: "activo"
    }).select("*").single();
    if (tramiteError) throw tramiteError;

    const { data: destinatario, error: destError } = await supabaseClient.from("documentacion_destinatarios").insert({
      tramite_id: tramite.id,
      alumno_id,
      familia_id: adaDocRole() === "familia" ? adaDocContext.perfil.id : null,
      estado: "devuelto",
      fecha_devolucion: new Date().toISOString()
    }).select("*").single();
    if (destError) throw destError;

    const year = new Date().getFullYear();
    const path = `recibidos/${year}/${tramite.id}/${alumno_id}/${Date.now()}_${adaDocCleanFileName(file.name)}`;
    await adaDocUploadFile(file, path);

    const { error: devError } = await supabaseClient.from("documentacion_devoluciones").insert({
      tramite_id: tramite.id,
      destinatario_id: destinatario.id,
      alumno_id,
      familia_id: adaDocRole() === "familia" ? adaDocContext.perfil.id : null,
      archivo_path: path,
      archivo_nombre: file.name,
      archivo_tipo: file.type || "application/octet-stream",
      observacion_familia: observacion,
      estado_revision: "pendiente",
      subido_por: adaDocContext.session.user.id
    });
    if (devError) throw devError;

    await adaDocAudit(tramite.id, destinatario.id, "devuelto", "Certificado o solicitud familiar cargada");
    adaDocSetMessage("Archivo enviado correctamente. Queda pendiente de revisión.", "success");
    event.target.reset();
    await adaDocLoadSeguimiento();
  } catch (error) {
    console.error(error);
    adaDocSetMessage(error.message || "No se pudo enviar la solicitud.", "error");
  }
}

async function adaDocAudit(tramite_id, destinatario_id, accion, detalle = "") {
  try {
    await supabaseClient.from("documentacion_auditoria").insert({
      tramite_id, destinatario_id, accion, detalle, usuario_id: adaDocContext?.session?.user?.id || null
    });
  } catch (error) {
    console.warn("Auditoría no registrada:", error);
  }
}

async function adaDocFetchDestinatarios() {
  const estado = adaDoc$("filtroEstado")?.value || "";
  const origen = adaDoc$("filtroOrigen")?.value || "";
  let q = supabaseClient
    .from("documentacion_destinatarios")
    .select("*, tramite:documentacion_tramites(*), devoluciones:documentacion_devoluciones(*)")
    .order("creado_en", { ascending: false });

  if (estado) q = q.eq("estado", estado);
  const rol = adaDocRole();
  if (rol === "familia") q = q.eq("familia_id", adaDocContext.perfil.id);
  if (rol === "alumno") q = q.eq("alumno_id", adaDocContext.perfil.id);

  const { data, error } = await q;
  if (error) throw error;
  let rows = data || [];
  if (origen) rows = rows.filter(r => r.tramite?.origen_area === origen);
  return rows;
}

async function adaDocLoadSeguimiento() {
  try {
    const rows = await adaDocFetchDestinatarios();
    adaDocRenderList(rows, adaDoc$("listaDocumentacion"), false);
    const revision = rows.filter(r => (r.devoluciones || []).length || r.estado === "devuelto");
    adaDocRenderList(revision, adaDoc$("listaRevision"), true);
  } catch (error) {
    console.error(error);
    adaDocSetMessage("No se pudo cargar la documentación. Revisá que el SQL del Bloque 28 esté ejecutado.", "error");
  }
}

function adaDocGetAlumnoName(alumnoId) {
  const a = adaDocAlumnos.find(x => x.id === alumnoId);
  return a?.nombreCompleto || "Alumno";
}

function adaDocRenderList(rows, container, revisionMode = false) {
  if (!container) return;
  if (!rows.length) {
    container.innerHTML = `<div class="doc-empty">No hay trámites para mostrar.</div>`;
    return;
  }
  container.innerHTML = rows.map(row => adaDocCardHTML(row, revisionMode)).join("");
  container.querySelectorAll("[data-download]").forEach(btn => btn.addEventListener("click", () => adaDocDownload(btn.dataset.download)));
  container.querySelectorAll("[data-mark-seen]").forEach(btn => btn.addEventListener("click", () => adaDocMarkSeen(btn.dataset.markSeen)));
  container.querySelectorAll("[data-upload-return]").forEach(form => form.addEventListener("submit", adaDocUploadReturn));
  container.querySelectorAll("[data-review-form]").forEach(form => form.addEventListener("submit", adaDocReview));
}

function adaDocCardHTML(row, revisionMode) {
  const t = row.tramite || {};
  const devs = row.devoluciones || [];
  const lastDev = devs[devs.length - 1];
  const status = row.estado || "pendiente";
  const alumno = adaDocGetAlumnoName(row.alumno_id);
  const canReturn = adaDocIsFamiliaAlumno() && t.requiere_devolucion && !["aprobado", "rechazado", "archivado"].includes(status);
  const canReview = adaDocIsGestion() && (devs.length || status === "devuelto");

  return `
    <article class="doc-card">
      <div class="doc-card-top">
        <span class="doc-origin">${adaDocOrigenLabel(t.origen_area)}</span>
        <span class="doc-status ${status}">${adaDocEstadoLabel(status)}</span>
      </div>
      <h3>${t.titulo || "Trámite"}</h3>
      <p class="doc-description">${t.descripcion || adaDocTipoLabel(t.tipo_tramite)}</p>
      <div class="doc-meta">
        <span>👤 <strong>Alumno:</strong> ${alumno}</span>
        <span>🧾 <strong>Tipo:</strong> ${adaDocTipoLabel(t.tipo_tramite)}</span>
        <span>📅 <strong>Límite:</strong> ${adaDocFormatDate(t.fecha_limite)}</span>
        <span>↩️ <strong>Requiere devolución:</strong> ${t.requiere_devolucion ? "Sí" : "No"}</span>
        ${lastDev ? `<span>📬 <strong>Última devolución:</strong> ${lastDev.archivo_nombre || "Archivo recibido"}</span>` : ""}
        ${row.observacion_revision ? `<span>💬 <strong>Observación:</strong> ${row.observacion_revision}</span>` : ""}
      </div>
      <div class="doc-actions">
        ${t.archivo_enviado_path ? `<button type="button" data-download="${t.archivo_enviado_path}" class="primary-action">Descargar enviado</button>` : ""}
        ${lastDev?.archivo_path ? `<button type="button" data-download="${lastDev.archivo_path}">Ver devolución</button>` : ""}
        ${status === "pendiente" && adaDocIsFamiliaAlumno() ? `<button type="button" data-mark-seen="${row.id}">Marcar visto</button>` : ""}
        ${canReturn ? adaDocReturnForm(row.id, t.id, row.alumno_id) : ""}
      </div>
      ${canReview || revisionMode ? adaDocReviewForm(row) : ""}
    </article>
  `;
}

function adaDocReturnForm(destinatarioId, tramiteId, alumnoId) {
  return `
    <form class="family-upload-inline" data-upload-return data-destinatario-id="${destinatarioId}" data-tramite-id="${tramiteId}" data-alumno-id="${alumnoId}">
      <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" required>
      <button type="submit" class="primary-action">Subir devolución</button>
    </form>
  `;
}

function adaDocReviewForm(row) {
  if (!adaDocIsGestion()) return "";
  return `
    <form class="doc-review-box" data-review-form data-destinatario-id="${row.id}" data-tramite-id="${row.tramite_id}">
      <textarea rows="2" placeholder="Observación de revisión">${row.observacion_revision || ""}</textarea>
      <button type="submit" name="estado" value="aprobado">Aprobar</button>
      <button type="submit" name="estado" value="observado">Observar</button>
      <button type="submit" name="estado" value="rechazado" class="danger-action">Rechazar</button>
    </form>
  `;
}

async function adaDocMarkSeen(destinatarioId) {
  try {
    const { error } = await supabaseClient.from("documentacion_destinatarios").update({
      estado: "visto",
      fecha_visto: new Date().toISOString()
    }).eq("id", destinatarioId);
    if (error) throw error;
    await adaDocAudit(null, destinatarioId, "visto", "Marcado como visto");
    await adaDocLoadSeguimiento();
  } catch (error) {
    console.error(error);
    adaDocSetMessage("No se pudo marcar como visto.", "error");
  }
}

async function adaDocUploadReturn(event) {
  event.preventDefault();
  try {
    const form = event.currentTarget;
    const file = form.querySelector("input[type='file']")?.files?.[0];
    if (!file) throw new Error("Seleccioná un archivo.");
    const tramiteId = form.dataset.tramiteId;
    const destinatarioId = form.dataset.destinatarioId;
    const alumnoId = form.dataset.alumnoId;
    const year = new Date().getFullYear();
    const path = `recibidos/${year}/${tramiteId}/${alumnoId}/${Date.now()}_${adaDocCleanFileName(file.name)}`;
    await adaDocUploadFile(file, path);

    const { error: devError } = await supabaseClient.from("documentacion_devoluciones").insert({
      tramite_id: tramiteId,
      destinatario_id: destinatarioId,
      alumno_id: alumnoId,
      familia_id: adaDocRole() === "familia" ? adaDocContext.perfil.id : null,
      archivo_path: path,
      archivo_nombre: file.name,
      archivo_tipo: file.type || "application/octet-stream",
      estado_revision: "pendiente",
      subido_por: adaDocContext.session.user.id
    });
    if (devError) throw devError;

    const { error: updError } = await supabaseClient.from("documentacion_destinatarios").update({
      estado: "devuelto",
      fecha_devolucion: new Date().toISOString()
    }).eq("id", destinatarioId);
    if (updError) throw updError;

    await adaDocAudit(tramiteId, destinatarioId, "devuelto", "Familia/alumno subió devolución");
    adaDocSetMessage("Devolución subida correctamente.", "success");
    await adaDocLoadSeguimiento();
  } catch (error) {
    console.error(error);
    adaDocSetMessage(error.message || "No se pudo subir la devolución.", "error");
  }
}

async function adaDocReview(event) {
  event.preventDefault();
  try {
    const submitter = event.submitter;
    const estado = submitter?.value || "observado";
    const form = event.currentTarget;
    const observacion = form.querySelector("textarea")?.value || "";
    const destinatarioId = form.dataset.destinatarioId;
    const tramiteId = form.dataset.tramiteId;
    const { error } = await supabaseClient.from("documentacion_destinatarios").update({
      estado,
      observacion_revision: observacion,
      revisado_por: adaDocContext.session.user.id,
      revisado_en: new Date().toISOString()
    }).eq("id", destinatarioId);
    if (error) throw error;
    await supabaseClient.from("documentacion_devoluciones").update({ estado_revision: estado }).eq("destinatario_id", destinatarioId);
    await adaDocAudit(tramiteId, destinatarioId, estado, observacion);
    adaDocSetMessage("Revisión guardada correctamente.", "success");
    await adaDocLoadSeguimiento();
  } catch (error) {
    console.error(error);
    adaDocSetMessage("No se pudo guardar la revisión.", "error");
  }
}

function adaDocBindForms() {
  adaDoc$("formNuevoTramite")?.addEventListener("submit", adaDocCreateTramite);
  adaDoc$("formSolicitudFamilia")?.addEventListener("submit", adaDocCreateFamilySolicitud);
  adaDoc$("btnActualizarDocumentacion")?.addEventListener("click", adaDocLoadSeguimiento);
  adaDoc$("btnLimpiarTramite")?.addEventListener("click", () => adaDoc$("formNuevoTramite")?.reset());
  adaDoc$("filtroEstado")?.addEventListener("change", adaDocLoadSeguimiento);
  adaDoc$("filtroOrigen")?.addEventListener("change", adaDocLoadSeguimiento);
}

async function adaDocInit() {
  adaDocContext = await adaRequirePageAccess(["admin", "directivo", "secretaria", "preceptor", "familia", "alumno"]);
  if (!adaDocContext || window.ADA_ACCESS_DENIED) return;

  adaDocBindTabs();
  adaDocBindRecipientModes();
  adaDocApplyRoleUI();
  adaDocBindForms();

  try {
    await adaDocLoadBaseData();
    await adaDocLoadFamilyStudents();
    await adaDocLoadSeguimiento();
    adaDocSetMessage("Módulo listo.", "success");
  } catch (error) {
    console.error(error);
    adaDocSetMessage("El módulo cargó, pero falta ejecutar o revisar el SQL del Bloque 28.", "error");
  }
}

document.addEventListener("DOMContentLoaded", adaDocInit);
