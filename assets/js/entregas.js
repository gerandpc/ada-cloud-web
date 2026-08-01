const b26e = (id) => document.getElementById(id);
let b26eCtx = null;
let b26ePerfil = null;
let b26eRol = null;
let b26eActividades = [];
let b26eEntregas = [];
let b26eAlumnos = [];

const B26_REVIEW_ROLES = ["docente"];
const B26_OVERSIGHT_ROLES = ["admin", "directivo", "secretaria"];
const B26_STORAGE_BUCKET = "ada-actividades";
const B26_MAX_FILE_SIZE = 10 * 1024 * 1024;
const B26_ALLOWED_EXT = ["pdf", "doc", "docx", "jpg", "jpeg", "png", "webp"];

function b26eCanReview(){ return B26_REVIEW_ROLES.includes(b26eRol); }
function b26eCanOversee(){ return B26_OVERSIGHT_ROLES.includes(b26eRol); }
function b26eCanSubmit(){ return b26eRol === "alumno"; }
function b26eEscape(v){ return String(v ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
function b26ePill(text, cls="info"){ return `<span class="b26-pill ${cls}">${b26eEscape(text)}</span>`; }
function b26eEstadoClase(estado){ if(estado==="revisada") return "ok"; if(estado==="devuelta") return "warn"; if(estado==="pendiente") return "warn"; if(estado==="entregada") return "info"; return "info"; }
function b26eToday(){ return new Date().toISOString().slice(0,10); }
function b26eVencida(a){ return a.fecha_entrega && a.fecha_entrega < b26eToday() && a.estado !== "cerrada"; }
function b26eFileExt(name){ return String(name || "").split(".").pop().toLowerCase(); }
function b26eSafeName(name){ return String(name || "archivo").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "archivo"; }
function b26eValidateFile(file){
  if(!file) return null;
  if(file.size > B26_MAX_FILE_SIZE) return "El archivo supera los 10 MB.";
  const ext = b26eFileExt(file.name);
  if(!B26_ALLOWED_EXT.includes(ext)) return "Formato no permitido. Usá PDF, Word o imagen.";
  return null;
}
async function b26eSignedUrl(path){
  if(!path) return "";
  const { data, error } = await supabaseClient.storage.from(B26_STORAGE_BUCKET).createSignedUrl(path, 60 * 60);
  if(error){ console.warn("No se pudo generar enlace firmado", error); return ""; }
  return data?.signedUrl || "";
}
async function b26eAttachSignedUrls(){
  await Promise.all((b26eActividades || []).map(async a => { if(a.archivo_path) a.archivo_signed_url = await b26eSignedUrl(a.archivo_path); }));
  await Promise.all((b26eEntregas || []).map(async e => { if(e.archivo_path) e.archivo_signed_url = await b26eSignedUrl(e.archivo_path); }));
}
async function b26eUploadFile(file, folder, ownerId){
  if(!file) return null;
  const validation = b26eValidateFile(file);
  if(validation) throw new Error(validation);
  const safe = b26eSafeName(file.name);
  const path = `${folder}/${ownerId}/${Date.now()}_${safe}`;
  const { error } = await supabaseClient.storage.from(B26_STORAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || "application/octet-stream" });
  if(error) throw error;
  return { archivo_path: path, archivo_nombre: file.name, archivo_tipo: file.type || null, archivo_tamano: file.size };
}
function b26eFileLink(item, label="Archivo"){
  if(item?.archivo_signed_url) return `<a class="b26-file-link" href="${b26eEscape(item.archivo_signed_url)}" target="_blank" rel="noopener">📎 ${b26eEscape(item.archivo_nombre || label)}</a>`;
  if(item?.archivo_url) return `<a class="b26-file-link" href="${b26eEscape(item.archivo_url)}" target="_blank" rel="noopener">🔗 ${b26eEscape(item.archivo_nombre || label)}</a>`;
  return "";
}

function b26eTabs(){
  document.querySelectorAll(".b26-tab").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll(".b26-tab").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".b26-section").forEach(s=>s.classList.remove("active"));
    btn.classList.add("active");
    b26e(`tab-${btn.dataset.tab}`)?.classList.add("active");
  }));
}

function b26eApplyRole(){
  const visible = b26eCanReview() || b26eCanOversee();
  document.querySelectorAll("[data-b26-review]").forEach(el=>{ el.style.display = visible ? "" : "none"; });
  const tab = document.querySelector('[data-tab="revision"]');
  if(tab && b26eCanOversee()) tab.textContent = "Seguimiento institucional";
}

async function b26eLoad(){
  let cursoIdsAlumno = [];

  if(b26eRol === "alumno"){
    const { data: inscripciones, error: inscripcionesError } = await supabaseClient
      .from("alumno_cursos")
      .select("curso_id")
      .eq("alumno_id", b26ePerfil.id)
      .eq("activo", true);

    if(inscripcionesError) throw inscripcionesError;
    cursoIdsAlumno = [...new Set((inscripciones || []).map(i => i.curso_id).filter(Boolean))];
  }

  let actividadesQuery = supabaseClient
    .from("actividades")
    .select("*, cursos(id,nombre), materias(id,nombre)")
    .in("estado", ["publicada", "cerrada"])
    .order("fecha_entrega", {ascending:false})
    .limit(300);

  if(b26eRol === "docente"){
    actividadesQuery = actividadesQuery.eq("docente_id", b26ePerfil.id);
  } else if(b26eRol === "alumno"){
    if(!cursoIdsAlumno.length){
      b26eActividades = [];
      b26eEntregas = [];
      b26eAlumnos = [];
      await b26eAttachSignedUrls();
      renderEntregas();
      renderRevision();
      updateKpis();
      return;
    }
    actividadesQuery = actividadesQuery.in("curso_id", cursoIdsAlumno);
  }

  let entregasQuery = supabaseClient
    .from("entregas_actividades")
    .select("*, actividades(id,titulo,materia_id,curso_id,docente_id), alumno:profiles!entregas_actividades_alumno_id_fkey(id,nombre,apellido,email)")
    .order("entregado_en", {ascending:false})
    .limit(500);

  if(b26eRol === "alumno"){
    entregasQuery = entregasQuery.eq("alumno_id", b26ePerfil.id);
  }

  const results = await Promise.all([actividadesQuery, entregasQuery]);
  const [actRes, entRes] = results;

  for(const r of results) if(r?.error) throw r.error;

  b26eActividades = actRes.data || [];
  b26eEntregas = entRes.data || [];
  b26eAlumnos = [];

  if(b26eRol === "docente"){
    const ids = new Set(b26eActividades.map(a=>a.id));
    b26eEntregas = b26eEntregas.filter(e=>ids.has(e.actividad_id));
  } else if(b26eRol === "alumno"){
    const ids = new Set(b26eActividades.map(a=>a.id));
    b26eEntregas = b26eEntregas.filter(e=>ids.has(e.actividad_id) && e.alumno_id === b26ePerfil.id);
  }

  await b26eAttachSignedUrls();
  b26eCargarFiltros();
  renderEntregas();
  renderRevision();
  updateKpis();
}

function entregaDeActividad(actividadId){
  return b26eEntregas.find(e=>e.actividad_id === actividadId && e.alumno_id === b26ePerfil.id);
}

function renderEntregas(){
  const cont = b26e("listaEntregas");
  if(!b26eActividades.length){ cont.innerHTML = `<div class="b26-empty">No hay actividades disponibles.</div>`; return; }

  cont.innerHTML = b26eActividades.map(a=>{
    const propia = entregaDeActividad(a.id);
    const vencida = b26eVencida(a);
    const estado = propia?.estado || (b26eCanSubmit() ? "pendiente" : "sin entrega");
    const editable = !propia || ["entregada","devuelta","pendiente"].includes(propia.estado);
    const boton = b26eCanSubmit() && a.estado === "publicada" && !vencida && editable ? `<button class="btn-primary" type="button" data-abrir-entrega="${a.id}">${propia ? "Actualizar entrega" : "Realizar entrega"}</button>` : "";
    const archivoConsigna = b26eFileLink(a, "Consigna adjunta");
    const archivoEntrega = b26eFileLink(propia, "Archivo de entrega");
    return `<article class="b26-card ${vencida && !propia ? "b26-highlight" : ""}">
      <h3>${b26eEscape(a.titulo)}</h3>
      <p>${b26eEscape(a.descripcion || "Sin consigna cargada.")}</p>
      <div class="b26-meta">
        ${b26ePill(a.materias?.nombre || "Materia", "info")}
        ${b26ePill(a.cursos?.nombre || "Curso", "info")}
        ${b26ePill("Fecha límite: " + (a.fecha_entrega || "sin fecha"), vencida ? "warn" : "ok")}
        ${b26ePill(estado, b26eEstadoClase(estado))}
      </div>
      ${archivoConsigna ? `<div class="b26-attachment-row"><strong>Consigna:</strong> ${archivoConsigna}</div>` : ""}
      ${propia?.texto_entrega ? `<div class="b26-note"><strong>Entrega:</strong> ${b26eEscape(propia.texto_entrega)} ${archivoEntrega ? " · " + archivoEntrega : ""}${propia?.archivo_url ? " · " + b26eFileLink({archivo_url: propia.archivo_url}, "Link externo") : ""}</div>` : ""}
      ${propia?.devolucion ? `<div class="b26-note"><strong>Devolución:</strong> ${b26eEscape(propia.devolucion)} ${propia.calificacion ? " · Nota: " + b26eEscape(propia.calificacion) : ""}</div>` : ""}
      <div class="b26-actions">${boton}</div>
    </article>`;
  }).join("");

  cont.querySelectorAll("[data-abrir-entrega]").forEach(btn=>btn.addEventListener("click",()=>abrirModalEntrega(btn.dataset.abrirEntrega)));
}

function b26eFiltrarRevision(){
  const actividadId = b26e("filtroRevisionActividad")?.value || "";
  const estado = b26e("filtroRevisionEstado")?.value || "";
  return b26eEntregas.filter(e => (!actividadId || String(e.actividad_id)===String(actividadId)) && (!estado || e.estado===estado));
}
function b26eCargarFiltros(){
  const select = b26e("filtroRevisionActividad");
  if(!select) return;
  const actuales = select.value;
  select.innerHTML = `<option value="">Todas las actividades</option>` + b26eActividades.map(a=>`<option value="${b26eEscape(a.id)}">${b26eEscape(a.titulo)}</option>`).join("");
  if([...select.options].some(o=>o.value===actuales)) select.value = actuales;
}

function renderRevision(){
  const el = b26e("tablaRevision");
  if(!el) return;
  if(!b26eCanReview()){ el.innerHTML = `<p class="helper-text">La revisión está disponible para docentes y equipos de gestión.</p>`; return; }
  const entregas = b26eFiltrarRevision();
  if(!entregas.length){ el.innerHTML = `<p class="helper-text">No hay entregas que coincidan con los filtros.</p>`; return; }
  const rows = entregas.map(e=>`<tr><td>${b26eEscape(e.actividades?.titulo || "-")}</td><td>${b26eEscape((e.alumno?.apellido || "") + ", " + (e.alumno?.nombre || ""))}</td><td>${b26ePill(e.estado || "entregada", b26eEstadoClase(e.estado))}</td><td>${e.calificacion ?? "-"}</td><td>${e.entregado_en ? new Date(e.entregado_en).toLocaleString("es-AR") : "-"}</td><td>${b26eFileLink(e, "Archivo") || (e.archivo_url ? b26eFileLink({archivo_url:e.archivo_url}, "Link") : "-")}</td><td>${b26eCanReview() ? `<button class="btn-secondary" type="button" data-revisar="${e.id}">Revisar</button>` : "Solo lectura"}</td></tr>`).join("");
  el.innerHTML = `<table class="ada-table"><thead><tr><th>Actividad</th><th>Alumno</th><th>Estado</th><th>Nota</th><th>Fecha</th><th>Archivo</th><th>Acción</th></tr></thead><tbody>${rows}</tbody></table>`;
  el.querySelectorAll("[data-revisar]").forEach(btn=>btn.addEventListener("click",()=>abrirModalRevision(btn.dataset.revisar)));
}

function updateKpis(){
  const revisadas = b26eEntregas.filter(e=>e.estado === "revisada").length;
  const entregadas = b26eEntregas.filter(e=>["entregada","revisada","devuelta"].includes(e.estado)).length;
  b26e("kpiDisponibles").textContent = b26eActividades.length;
  b26e("kpiEntregadas").textContent = entregadas;
  b26e("kpiPendientes").textContent = Math.max(0, b26eActividades.length - (b26eRol === "alumno" ? b26eEntregas.length : entregadas));
  b26e("kpiRevisadas").textContent = revisadas;
}

function abrirModalEntrega(actividadId){
  const act = b26eActividades.find(a=>a.id === actividadId);
  const propia = entregaDeActividad(actividadId);
  if(propia?.estado === "revisada"){ alert("La entrega ya fue revisada y no puede modificarse."); return; }
  b26e("entregaActividadId").value = actividadId;
  b26e("modalEntregaTitulo").textContent = act?.titulo || "Actividad";
  b26e("entregaTexto").value = propia?.texto_entrega || "";
  b26e("entregaArchivoUrl").value = propia?.archivo_url || "";
  if(b26e("entregaArchivo")) b26e("entregaArchivo").value = "";
  b26e("entregaArchivoActual").innerHTML = propia?.archivo_path ? `Archivo actual: ${b26eFileLink(propia, "Ver archivo")}` : "Sin archivo subido todavía.";
  b26e("msgEntrega").textContent = "";
  b26e("modalEntrega").classList.add("open");
  b26e("modalEntrega").setAttribute("aria-hidden", "false");
}
function cerrarModalEntrega(){ b26e("modalEntrega").classList.remove("open"); b26e("modalEntrega").setAttribute("aria-hidden", "true"); }

async function guardarEntrega(ev){
  ev.preventDefault();
  b26e("msgEntrega").textContent = "Enviando entrega...";
  const file = b26e("entregaArchivo")?.files?.[0] || null;
  const validation = b26eValidateFile(file);
  if(validation){ b26e("msgEntrega").textContent = validation; return; }
  const payload = {
    actividad_id: b26e("entregaActividadId").value,
    alumno_id: b26ePerfil.id,
    texto_entrega: b26e("entregaTexto").value.trim(),
    archivo_url: b26e("entregaArchivoUrl").value.trim() || null,
    estado: "entregada",
    entregado_en: new Date().toISOString()
  };
  const { data, error } = await supabaseClient.from("entregas_actividades").upsert(payload, { onConflict: "actividad_id,alumno_id" }).select("id").single();
  if(error){ b26e("msgEntrega").textContent = "Error: " + error.message; return; }
  if(file){
    try{
      b26e("msgEntrega").textContent = "Entrega guardada. Subiendo archivo...";
      const meta = await b26eUploadFile(file, "entregas", data.id);
      const upd = await supabaseClient.from("entregas_actividades").update(meta).eq("id", data.id);
      if(upd.error) throw upd.error;
    }catch(err){
      b26e("msgEntrega").textContent = "La entrega se guardó, pero no se pudo subir el archivo: " + err.message;
      await b26eLoad();
      return;
    }
  }
  b26e("msgEntrega").textContent = "Entrega enviada correctamente.";
  await b26eLoad();
  setTimeout(cerrarModalEntrega, 700);
}

function abrirModalRevision(entregaId){
  const entrega = b26eEntregas.find(e=>e.id === entregaId);
  b26e("revisionEntregaId").value = entregaId;
  b26e("modalRevisionTitulo").textContent = entrega?.actividades?.titulo || "Entrega";
  b26e("revisionCalificacion").value = entrega?.calificacion || "";
  b26e("revisionEstado").value = entrega?.estado === "devuelta" ? "devuelta" : "revisada";
  b26e("revisionDevolucion").value = entrega?.devolucion || "";
  b26e("msgRevision").textContent = "";
  b26e("modalRevision").classList.add("open");
  b26e("modalRevision").setAttribute("aria-hidden", "false");
}
function cerrarModalRevision(){ b26e("modalRevision").classList.remove("open"); b26e("modalRevision").setAttribute("aria-hidden", "true"); }

async function guardarRevision(ev){
  ev.preventDefault();
  b26e("msgRevision").textContent = "Guardando revisión...";
  const payload = {
    estado: b26e("revisionEstado").value,
    calificacion: b26e("revisionCalificacion").value ? Number(b26e("revisionCalificacion").value) : null,
    devolucion: b26e("revisionDevolucion").value.trim() || null,
    revisado_por: b26ePerfil.id,
    revisado_en: new Date().toISOString()
  };
  const { error } = await supabaseClient.from("entregas_actividades").update(payload).eq("id", b26e("revisionEntregaId").value);
  if(error){ b26e("msgRevision").textContent = "Error: " + error.message; return; }
  b26e("msgRevision").textContent = "Revisión guardada correctamente.";
  await b26eLoad();
  setTimeout(cerrarModalRevision, 700);
}

function b26eSetupError(error){
  const msg = `No se pudo cargar el Bloque 26. Verificá que hayas ejecutado docs/sql/ada_bloque_26b_archivos_actividades_entregas.sql. Detalle: ${error.message}`;
  ["listaEntregas","tablaRevision"].forEach(id=>{ if(b26e(id)) b26e(id).innerHTML = `<p class="form-message is-error">${b26eEscape(msg)}</p>`; });
}

async function iniciarBloque26Entregas(){
  b26eTabs();
  b26eCtx = await obtenerSesionPerfil();
  if(!b26eCtx) return;
  b26ePerfil = b26eCtx.perfil;
  b26eRol = b26ePerfil.rol;
  b26eApplyRole();
  try{ await b26eLoad(); }catch(error){ console.error(error); b26eSetupError(error); }
}

b26e("btnCerrarModalEntrega")?.addEventListener("click", cerrarModalEntrega);
b26e("btnCerrarModalRevision")?.addEventListener("click", cerrarModalRevision);
b26e("formEntrega")?.addEventListener("submit", guardarEntrega);
b26e("formRevision")?.addEventListener("submit", guardarRevision);
b26e("filtroRevisionActividad")?.addEventListener("change", renderRevision);
b26e("filtroRevisionEstado")?.addEventListener("change", renderRevision);
document.addEventListener("keydown", (e)=>{ if(e.key === "Escape"){ cerrarModalEntrega(); cerrarModalRevision(); }});

iniciarBloque26Entregas();
