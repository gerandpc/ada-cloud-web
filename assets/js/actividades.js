const b26a = (id) => document.getElementById(id);
let b26aCtx = null;
let b26aPerfil = null;
let b26aRol = null;
let b26aCursos = [];
let b26aMaterias = [];
let b26aActividades = [];
let b26aEntregas = [];
let b26aEditingId = null;

const B26_MANAGE_ROLES = ["docente"];
const B26_STORAGE_BUCKET = "ada-actividades";
const B26_MAX_FILE_SIZE = 10 * 1024 * 1024;
const B26_ALLOWED_EXT = ["pdf", "doc", "docx", "jpg", "jpeg", "png", "webp"];

function b26aCanManage(){ return B26_MANAGE_ROLES.includes(b26aRol); }
function b26aToday(){ return new Date().toISOString().slice(0,10); }
function b26aEscape(v){ return String(v ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
function b26aOption(items, placeholder, label=(x)=>x.nombre || x.titulo || x.id){ return `<option value="">${placeholder}</option>` + (items||[]).map(i=>`<option value="${i.id}">${b26aEscape(label(i))}</option>`).join(""); }
function b26aPill(text, cls="info"){ return `<span class="b26-pill ${cls}">${b26aEscape(text)}</span>`; }
function b26aEstadoClase(estado){ if(estado==="publicada") return "ok"; if(estado==="borrador") return "warn"; if(estado==="cerrada") return "danger"; return "info"; }
function b26aVencida(a){ return a.fecha_entrega && a.fecha_entrega < b26aToday() && a.estado !== "cerrada"; }
function b26aFileExt(name){ return String(name || "").split(".").pop().toLowerCase(); }
function b26aSafeName(name){ return String(name || "archivo").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "archivo"; }
function b26aValidateFile(file){
  if(!file) return null;
  if(file.size > B26_MAX_FILE_SIZE) return "El archivo supera los 10 MB.";
  const ext = b26aFileExt(file.name);
  if(!B26_ALLOWED_EXT.includes(ext)) return "Formato no permitido. Usá PDF, Word o imagen.";
  return null;
}
async function b26aSignedUrl(path){
  if(!path) return "";
  const { data, error } = await supabaseClient.storage.from(B26_STORAGE_BUCKET).createSignedUrl(path, 60 * 60);
  if(error){ console.warn("No se pudo generar enlace firmado", error); return ""; }
  return data?.signedUrl || "";
}
async function b26aAttachSignedUrls(){
  await Promise.all((b26aActividades || []).map(async a => { if(a.archivo_path) a.archivo_signed_url = await b26aSignedUrl(a.archivo_path); }));
  await Promise.all((b26aEntregas || []).map(async e => { if(e.archivo_path) e.archivo_signed_url = await b26aSignedUrl(e.archivo_path); }));
}
async function b26aUploadFile(file, folder, ownerId){
  if(!file) return null;
  const validation = b26aValidateFile(file);
  if(validation) throw new Error(validation);
  const safe = b26aSafeName(file.name);
  const path = `${folder}/${ownerId}/${Date.now()}_${safe}`;
  const { error } = await supabaseClient.storage.from(B26_STORAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || "application/octet-stream" });
  if(error) throw error;
  return { archivo_path: path, archivo_nombre: file.name, archivo_tipo: file.type || null, archivo_tamano: file.size };
}
function b26aFileLink(item, label="Ver archivo"){
  if(item?.archivo_signed_url) return `<a class="b26-file-link" href="${b26aEscape(item.archivo_signed_url)}" target="_blank" rel="noopener">📎 ${b26aEscape(item.archivo_nombre || label)}</a>`;
  if(item?.archivo_url) return `<a class="b26-file-link" href="${b26aEscape(item.archivo_url)}" target="_blank" rel="noopener">🔗 ${b26aEscape(item.archivo_nombre || label)}</a>`;
  return "";
}

function b26aTabs(){
  document.querySelectorAll(".b26-tab").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll(".b26-tab").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".b26-section").forEach(s=>s.classList.remove("active"));
    btn.classList.add("active");
    b26a(`tab-${btn.dataset.tab}`)?.classList.add("active");
  }));
}

function b26aApplyRole(){
  const can = b26aCanManage();
  document.querySelectorAll("[data-b26-manage]").forEach(el=>{ el.style.display = can ? "" : "none"; });
  document.querySelectorAll("[data-b26-followup]").forEach(el=>{ el.style.display = ["admin","directivo","secretaria","docente"].includes(b26aRol) ? "" : "none"; });
}

async function b26aLoadBase(){
  const [cursosRes, materiasRes] = await Promise.all([
    supabaseClient.from("cursos").select("id,nombre").eq("activo", true).order("nombre", {ascending:true}),
    supabaseClient.from("materias").select("id,nombre,curso_id,cursos(id,nombre)").order("nombre", {ascending:true})
  ]);
  for(const r of [cursosRes,materiasRes]) if(r.error) throw r.error;
  b26aCursos = cursosRes.data || [];
  b26aMaterias = materiasRes.data || [];
  const materiaLabel = m => `${m.nombre || "Materia"}${m.cursos?.nombre ? " · " + m.cursos.nombre : ""}`;
  ["actividadCurso","filtroCurso"].forEach(id=>{ if(b26a(id)) b26a(id).innerHTML = b26aOption(b26aCursos,"Seleccionar curso"); });
  if(b26a("filtroMateria")) b26a("filtroMateria").innerHTML = b26aOption(b26aMaterias,"Seleccionar materia",materiaLabel);
  b26aSyncMateriaOptions();
  if(b26a("actividadPublicacion")) b26a("actividadPublicacion").value = b26aToday();
  if(b26a("actividadEntrega")) b26a("actividadEntrega").value = b26aToday();
}

function b26aSyncMateriaOptions(selectedId=""){
  const cursoId = b26a("actividadCurso")?.value || "";
  const materias = cursoId ? b26aMaterias.filter(m => String(m.curso_id || m.cursos?.id || "") === String(cursoId)) : [];
  if(b26a("actividadMateria")){
    b26a("actividadMateria").innerHTML = b26aOption(materias, cursoId ? "Seleccionar materia" : "Primero seleccioná un curso", m=>m.nombre || "Materia");
    if(selectedId && materias.some(m=>String(m.id)===String(selectedId))) b26a("actividadMateria").value = selectedId;
  }
}
function b26aOpenForm(){
  document.querySelectorAll(".b26-tab").forEach(b=>b.classList.toggle("active", b.dataset.tab === "nueva"));
  document.querySelectorAll(".b26-section").forEach(sec=>sec.classList.toggle("active", sec.id === "tab-nueva"));
  b26a("actividadTitulo")?.focus();
}
function b26aResetForm(){
  b26aEditingId = null;
  const form = b26a("formActividad");
  form?.reset();
  if(b26a("actividadId")) b26a("actividadId").value = "";
  if(b26a("tituloFormActividad")) b26a("tituloFormActividad").textContent = "Nueva actividad";
  if(b26a("btnGuardarActividad")) b26a("btnGuardarActividad").textContent = "Guardar actividad";
  if(b26a("btnCancelarEdicion")) b26a("btnCancelarEdicion").style.display = "none";
  if(b26a("actividadPublicacion")) b26a("actividadPublicacion").value = b26aToday();
  if(b26a("actividadEntrega")) b26a("actividadEntrega").value = b26aToday();
  b26aSyncMateriaOptions();
}
function b26aEditarActividad(id){
  const a = b26aActividades.find(x=>String(x.id)===String(id));
  if(!a || !b26aCanManage()) return;
  b26aEditingId = a.id;
  b26a("actividadId").value = a.id;
  b26a("actividadCurso").value = a.curso_id || "";
  b26aSyncMateriaOptions(a.materia_id || "");
  b26a("actividadTitulo").value = a.titulo || "";
  b26a("actividadTipo").value = a.tipo || "Otro";
  b26a("actividadDescripcion").value = a.descripcion || "";
  b26a("actividadPublicacion").value = a.fecha_publicacion || b26aToday();
  b26a("actividadEntrega").value = a.fecha_entrega || b26aToday();
  b26a("actividadPuntaje").value = a.puntaje_maximo || 100;
  b26a("actividadEstado").value = a.estado || "borrador";
  b26a("tituloFormActividad").textContent = "Editar actividad";
  b26a("btnGuardarActividad").textContent = "Guardar cambios";
  b26a("btnCancelarEdicion").style.display = "inline-flex";
  b26a("msgActividad").textContent = "";
  b26aOpenForm();
}
async function b26aCambiarEstado(id, estado){
  if(!b26aCanManage()) return;
  const { error } = await supabaseClient.from("actividades").update({estado}).eq("id", id).eq("docente_id", b26aPerfil.id);
  if(error){ alert("No se pudo cambiar el estado: " + error.message); return; }
  await b26aLoadActividades();
}
async function b26aEliminarActividad(id){
  if(!b26aCanManage()) return;
  const actividad = b26aActividades.find(a=>String(a.id)===String(id));
  const entregas = b26aEntregas.filter(e=>String(e.actividad_id)===String(id)).length;
  if(entregas){ alert("No se puede eliminar una actividad que ya tiene entregas. Cerrala para conservar el historial."); return; }
  if(!confirm(`¿Eliminar definitivamente “${actividad?.titulo || "esta actividad"}”?`)) return;
  const { error } = await supabaseClient.from("actividades").delete().eq("id", id).eq("docente_id", b26aPerfil.id);
  if(error){ alert("No se pudo eliminar: " + error.message); return; }
  await b26aLoadActividades();
}

async function b26aLoadActividades(){
  let query = supabaseClient
    .from("actividades")
    .select("*, cursos(id,nombre), materias(id,nombre), creador:profiles!actividades_creado_por_fkey(id,nombre,apellido,email)")
    .order("fecha_entrega", {ascending:false})
    .limit(300);

  if(b26aRol === "docente"){
    query = query.eq("docente_id", b26aPerfil.id);
  }

  if(b26aRol === "alumno"){
    const { data: inscripciones, error: inscripcionesError } = await supabaseClient
      .from("alumno_cursos")
      .select("curso_id")
      .eq("alumno_id", b26aPerfil.id)
      .eq("activo", true);

    if(inscripcionesError) throw inscripcionesError;

    const cursoIds = [...new Set((inscripciones || []).map(i => i.curso_id).filter(Boolean))];
    if(!cursoIds.length){
      b26aActividades = [];
      b26aEntregas = [];
      b26aRenderActividades([]);
      b26aUpdateKpis();
      return;
    }

    query = query.eq("estado", "publicada").in("curso_id", cursoIds);
  }

  const res = await query;
  if(res.error) throw res.error;

  b26aActividades = res.data || [];
  await b26aLoadEntregas();
  await b26aAttachSignedUrls();
  b26aRenderActividades(b26aActividades);
  b26aUpdateKpis();
}

async function b26aLoadEntregas(){
  const res = await supabaseClient
    .from("entregas_actividades")
    .select("*, actividades(id,titulo), alumno:profiles!entregas_actividades_alumno_id_fkey(id,nombre,apellido,email)")
    .order("entregado_en", {ascending:false})
    .limit(500);
  if(res.error) throw res.error;
  b26aEntregas = res.data || [];
  if(b26aRol === "docente"){
    const ids = new Set(b26aActividades.map(a=>a.id));
    b26aEntregas = b26aEntregas.filter(e=>ids.has(e.actividad_id));
  } else if(!["admin","directivo","secretaria"].includes(b26aRol)){
    b26aEntregas = [];
  }
}

function b26aRenderActividades(rows){
  const cont = b26a("listaActividades");
  if(!rows.length){ cont.innerHTML = `<div class="b26-empty">No hay actividades para mostrar.</div>`; return; }
  cont.innerHTML = rows.map(a=>{
    const entregas = b26aEntregas.filter(e=>e.actividad_id === a.id).length;
    const vencida = b26aVencida(a);
    const archivo = b26aFileLink(a, "Ver consigna adjunta");
    return `<article class="b26-card ${vencida ? "b26-highlight" : ""}">
      <h3>${b26aEscape(a.titulo)}</h3>
      <p>${b26aEscape(a.descripcion || "Sin consigna cargada.")}</p>
      <div class="b26-meta">
        ${b26aPill(a.estado || "sin estado", b26aEstadoClase(a.estado))}
        ${b26aPill(a.materias?.nombre || "Materia", "info")}
        ${b26aPill(a.cursos?.nombre || "Curso", "info")}
        ${vencida ? b26aPill("Vencida", "warn") : b26aPill("Entrega: " + (a.fecha_entrega || "sin fecha"), "ok")}
        ${b26aPill(entregas + " entregas", "info")}
      </div>
      ${archivo ? `<div class="b26-attachment-row">${archivo}</div>` : ""}
      <p class="b26-status-line">Tipo: ${b26aEscape(a.tipo || "-")} · Puntaje: ${b26aEscape(a.puntaje_maximo || "-")} · Creada por: ${b26aEscape((a.creador?.nombre || "") + " " + (a.creador?.apellido || ""))}</p>
      ${b26aCanManage() ? `<div class="b26-actions">
        <button class="btn-secondary" type="button" data-edit-actividad="${b26aEscape(a.id)}">Editar</button>
        ${a.estado === "publicada" ? `<button class="btn-secondary" type="button" data-state-actividad="${b26aEscape(a.id)}" data-state="cerrada">Cerrar</button>` : `<button class="btn-secondary" type="button" data-state-actividad="${b26aEscape(a.id)}" data-state="publicada">Publicar</button>`}
        ${entregas === 0 ? `<button class="btn-secondary" type="button" data-delete-actividad="${b26aEscape(a.id)}">Eliminar</button>` : ""}
      </div>` : ""}
    </article>`;
  }).join("");
  cont.querySelectorAll("[data-edit-actividad]").forEach(btn=>btn.addEventListener("click",()=>b26aEditarActividad(btn.dataset.editActividad)));
  cont.querySelectorAll("[data-state-actividad]").forEach(btn=>btn.addEventListener("click",()=>b26aCambiarEstado(btn.dataset.stateActividad, btn.dataset.state)));
  cont.querySelectorAll("[data-delete-actividad]").forEach(btn=>btn.addEventListener("click",()=>b26aEliminarActividad(btn.dataset.deleteActividad)));
  if(b26aCanManage() || ["admin","directivo","secretaria"].includes(b26aRol)) b26aRenderSeguimiento();
}

function b26aRenderSeguimiento(){
  const el = b26a("tablaSeguimiento");
  if(!el) return;
  if(!b26aEntregas.length){ el.innerHTML = `<p class="helper-text">Todavía no hay entregas registradas.</p>`; return; }
  const rows = b26aEntregas.map(e=>`<tr><td>${b26aEscape(e.actividades?.titulo || "-")}</td><td>${b26aEscape((e.alumno?.apellido || "") + ", " + (e.alumno?.nombre || ""))}</td><td>${b26aPill(e.estado || "pendiente", e.estado === "revisada" ? "ok" : e.estado === "devuelta" ? "warn" : "info")}</td><td>${e.calificacion ?? "-"}</td><td>${e.entregado_en ? new Date(e.entregado_en).toLocaleString("es-AR") : "-"}</td><td>${b26aFileLink(e, "Archivo") || "-"}</td></tr>`).join("");
  el.innerHTML = `<table class="ada-table"><thead><tr><th>Actividad</th><th>Alumno</th><th>Estado</th><th>Nota</th><th>Fecha</th><th>Archivo</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function b26aUpdateKpis(){
  b26a("kpiActividades").textContent = b26aActividades.length;
  b26a("kpiAbiertas").textContent = b26aActividades.filter(a=>a.estado === "publicada").length;
  b26a("kpiVencidas").textContent = b26aActividades.filter(b26aVencida).length;
  b26a("kpiEntregas").textContent = b26aEntregas.length;
}

async function b26aGuardarActividad(ev){
  ev.preventDefault();
  b26a("msgActividad").textContent = "Guardando actividad...";
  const file = b26a("actividadArchivo")?.files?.[0] || null;
  const validation = b26aValidateFile(file);
  if(validation){ b26a("msgActividad").textContent = validation; return; }
  const fechaPublicacion = b26a("actividadPublicacion").value;
  const fechaEntrega = b26a("actividadEntrega").value;
  if(fechaEntrega < fechaPublicacion){ b26a("msgActividad").textContent = "La fecha límite no puede ser anterior a la publicación."; return; }
  const payload = {
    curso_id: b26a("actividadCurso").value,
    materia_id: b26a("actividadMateria").value,
    titulo: b26a("actividadTitulo").value.trim(),
    tipo: b26a("actividadTipo").value,
    descripcion: b26a("actividadDescripcion").value.trim(),
    fecha_publicacion: b26a("actividadPublicacion").value,
    fecha_entrega: b26a("actividadEntrega").value,
    puntaje_maximo: Number(b26a("actividadPuntaje").value || 100),
    estado: b26a("actividadEstado").value,
    docente_id: b26aPerfil.id,
    creado_por: b26aPerfil.id
  };
  let data = null;
  let error = null;
  if(b26aEditingId){
    const res = await supabaseClient.from("actividades").update(payload).eq("id", b26aEditingId).eq("docente_id", b26aPerfil.id).select("id").single();
    data = res.data; error = res.error;
  }else{
    const res = await supabaseClient.from("actividades").insert(payload).select("id").single();
    data = res.data; error = res.error;
  }
  if(error){ b26a("msgActividad").textContent = "Error: " + error.message; return; }
  if(file){
    try{
      b26a("msgActividad").textContent = "Actividad guardada. Subiendo archivo...";
      const meta = await b26aUploadFile(file, "consignas", data.id);
      const upd = await supabaseClient.from("actividades").update(meta).eq("id", data.id);
      if(upd.error) throw upd.error;
    }catch(err){
      b26a("msgActividad").textContent = "La actividad se guardó, pero no se pudo subir el archivo: " + err.message;
      await b26aLoadActividades();
      return;
    }
  }
  b26a("msgActividad").textContent = b26aEditingId ? "Cambios guardados correctamente." : "Actividad guardada correctamente.";
  b26aResetForm();
  await b26aLoadActividades();
}

function b26aFiltrar(){
  const curso = b26a("filtroCurso").value;
  const materia = b26a("filtroMateria").value;
  const estado = b26a("filtroEstado").value;
  const rows = b26aActividades.filter(a=>(!curso || a.curso_id===curso)&&(!materia || a.materia_id===materia)&&(!estado || a.estado===estado));
  b26aRenderActividades(rows);
}

function b26aSetupError(error){
  const msg = `No se pudo cargar el Bloque 26. Verificá que hayas ejecutado docs/sql/ada_bloque_26b_archivos_actividades_entregas.sql. Detalle: ${error.message}`;
  ["listaActividades","tablaSeguimiento"].forEach(id=>{ if(b26a(id)) b26a(id).innerHTML = `<p class="form-message is-error">${b26aEscape(msg)}</p>`; });
}

async function iniciarBloque26Actividades(){
  b26aTabs();
  b26aCtx = await obtenerSesionPerfil();
  if(!b26aCtx) return;
  b26aPerfil = b26aCtx.perfil;
  b26aRol = b26aPerfil.rol;
  b26aApplyRole();
  try{ await b26aLoadBase(); await b26aLoadActividades(); }catch(error){ console.error(error); b26aSetupError(error); }
}

b26a("formActividad")?.addEventListener("submit", b26aGuardarActividad);
b26a("actividadCurso")?.addEventListener("change", ()=>b26aSyncMateriaOptions());
b26a("btnCancelarEdicion")?.addEventListener("click", b26aResetForm);
b26a("btnFiltrar")?.addEventListener("click", b26aFiltrar);
b26a("btnLimpiar")?.addEventListener("click", ()=>{ b26a("filtroCurso").value=""; b26a("filtroMateria").value=""; b26a("filtroEstado").value=""; b26aRenderActividades(b26aActividades); });

iniciarBloque26Actividades();
