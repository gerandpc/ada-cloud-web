const b27 = (id) => document.getElementById(id);
let b27Ctx = null;
let b27Perfil = null;
let b27Rol = null;
let b27Cursos = [];
let b27Materias = [];
let b27Programas = [];
let b27Recursos = [];
let b27EditId = null;

const B27_MANAGE_ROLES = ["docente"];
const B27_APPROVE_ROLES = ["admin", "directivo"];
const B27_READ_ROLES = ["admin", "directivo", "docente", "alumno", "familia"];
const B27_STORAGE_BUCKET = "ada-programas";
const B27_MAX_FILE_SIZE = 15 * 1024 * 1024;
const B27_ALLOWED_EXT = ["pdf", "doc", "docx", "jpg", "jpeg", "png", "webp"];

function b27CanManage(){ return B27_MANAGE_ROLES.includes(b27Rol); }
function b27CanApprove(){ return B27_APPROVE_ROLES.includes(b27Rol); }
function b27CanRead(){ return B27_READ_ROLES.includes(b27Rol); }
function b27Year(){ return new Date().getFullYear(); }
function b27Escape(v){ return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function b27Option(items, placeholder, label=(x)=>x.nombre || x.titulo || x.id){ return `<option value="">${b27Escape(placeholder)}</option>` + (items||[]).map(i=>`<option value="${b27Escape(i.id)}">${b27Escape(label(i))}</option>`).join(""); }
function b27Pill(text, cls="info"){ return `<span class="b27-pill ${cls}">${b27Escape(text)}</span>`; }
function b27EstadoTexto(estado){ return ({borrador:"Borrador",pendiente:"En revisión",aprobado:"Aprobado",observado:"Observado"})[estado] || estado || "Borrador"; }
function b27EstadoClase(estado){ if(estado==="aprobado") return "ok"; if(estado==="pendiente") return "warn"; if(estado==="observado") return "danger"; return "info"; }
function b27FileExt(name){ return String(name || "").split(".").pop().toLowerCase(); }
function b27SafeName(name){ return String(name || "archivo").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "archivo"; }
function b27ValidateFile(file){ if(!file) return null; if(file.size > B27_MAX_FILE_SIZE) return "El archivo supera los 15 MB."; const ext=b27FileExt(file.name); if(!B27_ALLOWED_EXT.includes(ext)) return "Formato no permitido. Usá PDF, Word o imagen."; return null; }
function b27ProgramaLabel(p){ const curso = p.cursos?.nombre ? ` · ${p.cursos.nombre}` : ""; const mat = p.materias?.nombre ? ` · ${p.materias.nombre}` : ""; return `${p.titulo || "Programa"}${mat}${curso}`; }
function b27IsOwner(p){ return !!p && b27Rol === "docente" && p.creado_por === b27Perfil?.id; }
function b27IsEditable(p){ return b27IsOwner(p) && ["borrador", "observado"].includes(p.estado || "borrador"); }
function b27VersionNumber(v){ const n = Number.parseFloat(String(v || "1.0").replace(",", ".")); return Number.isFinite(n) ? n : 1; }
function b27NextVersion(v){ return (Math.floor(b27VersionNumber(v)) + 1).toFixed(1); }
function b27Msg(id, text, ok=true){ const el=b27(id); if(!el) return; el.textContent=text; el.className=`form-message ${ok ? "ok" : "error"}`; }
function b27SetText(id, text){ const el=b27(id); if(el) el.textContent=text; }
function b27SelectTab(tab){ document.querySelectorAll(".b27-tab").forEach(b=>b.classList.toggle("active", b.dataset.tab===tab)); document.querySelectorAll(".b27-section").forEach(s=>s.classList.remove("active")); b27(`tab-${tab}`)?.classList.add("active"); }

async function b27SignedUrl(path){ if(!path) return ""; const { data, error } = await supabaseClient.storage.from(B27_STORAGE_BUCKET).createSignedUrl(path, 60*60); if(error){ console.warn("No se pudo generar enlace firmado", error); return ""; } return data?.signedUrl || ""; }
async function b27AttachSignedUrls(){ await Promise.all((b27Programas||[]).map(async p=>{ if(p.archivo_path) p.archivo_signed_url = await b27SignedUrl(p.archivo_path); })); await Promise.all((b27Recursos||[]).map(async r=>{ if(r.archivo_path) r.archivo_signed_url = await b27SignedUrl(r.archivo_path); })); }
async function b27UploadFile(file, folder, ownerId){ if(!file) return null; const validation=b27ValidateFile(file); if(validation) throw new Error(validation); const safe=b27SafeName(file.name); const path=`${folder}/${ownerId}/${Date.now()}_${safe}`; const { error } = await supabaseClient.storage.from(B27_STORAGE_BUCKET).upload(path, file, { cacheControl:"3600", upsert:false, contentType:file.type || "application/octet-stream" }); if(error) throw error; return { archivo_path:path, archivo_nombre:file.name, archivo_tipo:file.type || null, archivo_tamano:file.size }; }
function b27FileLink(item, label="Ver archivo"){ if(item?.archivo_signed_url) return `<a class="b27-file-link" href="${b27Escape(item.archivo_signed_url)}" target="_blank" rel="noopener">📎 ${b27Escape(item.archivo_nombre || label)}</a>`; if(item?.url_externa) return `<a class="b27-file-link" href="${b27Escape(item.url_externa)}" target="_blank" rel="noopener">🔗 Abrir enlace</a>`; return ""; }

function b27Tabs(){ document.querySelectorAll(".b27-tab").forEach(btn=>btn.addEventListener("click",()=>b27SelectTab(btn.dataset.tab))); }
function b27ApplyRole(){
  if(!b27CanRead()) throw new Error("Tu perfil no tiene acceso al módulo de programas.");
  document.querySelectorAll("[data-b27-manage]").forEach(el=>{ el.hidden = !b27CanManage(); });
  document.querySelectorAll("[data-b27-approve]").forEach(el=>{ el.hidden = !b27CanApprove(); });
  const estado=b27("programaEstado");
  if(estado && b27Rol === "docente") estado.innerHTML='<option value="borrador">Guardar como borrador</option><option value="pendiente">Guardar y enviar a revisión</option>';
  const roleMessage = b27("roleProgramasMessage");
  if(roleMessage){
    roleMessage.textContent = b27Rol === "docente" ? "Ves y gestionás únicamente tus programas. Los aprobados quedan bloqueados y requieren una nueva versión." : b27CanApprove() ? "Podés revisar programas enviados por docentes, aprobarlos u observarlos." : "Solo se muestran programas aprobados y publicados para consulta.";
  }
}

async function b27LoadBase(){
  const [cursosRes, materiasRes] = await Promise.all([
    supabaseClient.from("cursos").select("id,nombre").eq("activo", true).order("nombre", {ascending:true}),
    supabaseClient.from("materias").select("id,nombre,curso_id,cursos(id,nombre)").order("nombre", {ascending:true})
  ]);
  for(const r of [cursosRes,materiasRes]) if(r.error) throw r.error;
  b27Cursos = cursosRes.data || [];
  b27Materias = materiasRes.data || [];
  const materiaLabel = m => `${m.nombre || "Materia"}${m.cursos?.nombre ? " · " + m.cursos.nombre : ""}`;
  ["programaCurso","filtroCurso"].forEach(id=>{ if(b27(id)) b27(id).innerHTML=b27Option(b27Cursos,"Seleccionar curso"); });
  ["programaMateria","filtroMateria"].forEach(id=>{ if(b27(id)) b27(id).innerHTML=b27Option(b27Materias,"Seleccionar materia",materiaLabel); });
  if(b27("programaAnio")) b27("programaAnio").value=b27Year();
}

async function b27LoadAll(){
  let progQuery = supabaseClient.from("programas_materia").select("*, cursos(id,nombre), materias(id,nombre), creador:profiles!programas_materia_creado_por_fkey(id,nombre,apellido,email), aprobador:profiles!programas_materia_aprobado_por_fkey(id,nombre,apellido,email)").order("creado_en", {ascending:false}).limit(400);
  if(b27Rol === "docente") progQuery = progQuery.eq("creado_por", b27Perfil.id);
  if(["alumno","familia"].includes(b27Rol)) progQuery = progQuery.eq("estado", "aprobado");

  const [progRes, recRes] = await Promise.all([
    progQuery,
    supabaseClient.from("programa_recursos").select("*, programas_materia(id,titulo,materia_id,curso_id,estado,creado_por), creador:profiles!programa_recursos_creado_por_fkey(id,nombre,apellido,email)").order("creado_en", {ascending:false}).limit(700)
  ]);
  if(progRes.error) throw progRes.error;
  if(recRes.error) throw recRes.error;
  b27Programas = progRes.data || [];
  b27Recursos = recRes.data || [];

  const permitidos = new Set(b27Programas.map(p=>p.id));
  b27Recursos = b27Recursos.filter(r => permitidos.has(r.programa_id));
  await b27AttachSignedUrls();
  b27RenderProgramas(b27Programas);
  b27RenderRecursos();
  b27RenderFuentesIA();
  b27UpdateKpis();
}

function b27Historial(p){
  const versions = b27Programas.filter(x => x.id !== p.id && x.curso_id===p.curso_id && x.materia_id===p.materia_id && Number(x.anio_lectivo)===Number(p.anio_lectivo)).sort((a,b)=>b27VersionNumber(b.version)-b27VersionNumber(a.version));
  if(!versions.length) return "";
  return `<details class="b27-history"><summary>Historial (${versions.length} versión${versions.length===1?"":"es"})</summary><div>${versions.map(v=>`<span>${b27Escape(v.version || "1.0")} · ${b27Escape(b27EstadoTexto(v.estado))}</span>`).join("")}</div></details>`;
}

function b27RenderProgramas(rows){
  const cont=b27("listaProgramas");
  if(!cont) return;
  if(!rows.length){ cont.innerHTML=`<div class="b27-empty">No hay programas para mostrar.</div>`; return; }
  cont.innerHTML=rows.map(p=>{
    const recursos=b27Recursos.filter(r=>r.programa_id===p.id).length;
    const archivo=b27FileLink(p,"Ver programa adjunto");
    const canApprove=b27CanApprove() && p.estado === "pendiente";
    const canEdit=b27IsEditable(p);
    const canSend=b27IsOwner(p) && ["borrador","observado"].includes(p.estado || "borrador");
    const canVersion=b27IsOwner(p) && p.estado === "aprobado";
    const ai = p.habilitado_ia ? b27Pill("Fuente IA", "ai") : b27Pill("No IA", "info");
    const creador = [p.creador?.apellido,p.creador?.nombre].filter(Boolean).join(", ") || p.creador?.email || "";
    return `<article class="b27-card">
      <h3>${b27Escape(p.titulo || "Programa sin título")}</h3>
      <p>${b27Escape(p.contenidos || "Sin contenidos cargados.")}</p>
      <div class="b27-meta">${b27Pill(b27EstadoTexto(p.estado), b27EstadoClase(p.estado))}${b27Pill(p.anio_lectivo || "Año", "info")}${b27Pill("Versión " + (p.version || "1.0"), "info")}${ai}${b27Pill(`${recursos} recursos`, "info")}</div>
      <div class="b27-meta">${p.cursos?.nombre ? b27Pill(p.cursos.nombre,"info") : ""}${p.materias?.nombre ? b27Pill(p.materias.nombre,"info") : ""}${creador && b27CanApprove() ? b27Pill(creador,"info") : ""}</div>
      ${archivo ? `<div>${archivo}</div>` : ""}
      ${p.observaciones ? `<div class="b27-observation"><strong>Observación de revisión:</strong> ${b27Escape(p.observaciones)}</div>` : ""}
      ${b27Historial(p)}
      ${(canEdit||canSend||canVersion) ? `<div class="b27-card-actions">${canEdit ? `<button class="btn-secondary" type="button" onclick="b27OpenEditor('${p.id}')">Editar</button>` : ""}${canSend ? `<button class="btn-primary" type="button" onclick="b27EnviarRevision('${p.id}')">Enviar a revisión</button>` : ""}${canVersion ? `<button class="btn-secondary" type="button" onclick="b27NuevaVersion('${p.id}')">Crear nueva versión</button>` : ""}</div>` : ""}
      ${canApprove ? `<div class="b27-card-actions"><button class="btn-secondary" type="button" onclick="b27ToggleApprove('${p.id}')">Revisar programa</button></div><div class="b27-approve-box" id="approve-${p.id}"><label>Observación para el docente</label><textarea id="obs-${p.id}" placeholder="Es obligatoria para observar el programa."></textarea><div class="b27-card-actions"><button class="btn-primary" type="button" onclick="b27CambiarEstado('${p.id}','aprobado')">Aprobar y publicar</button><button class="btn-secondary" type="button" onclick="b27CambiarEstado('${p.id}','observado')">Devolver con observaciones</button></div></div>` : ""}
    </article>`;
  }).join("");
}

function b27RenderRecursos(){
  const cont=b27("listaRecursos");
  const sel=b27("recursoPrograma");
  const programasEditables = b27Programas.filter(b27IsEditable);
  if(sel) sel.innerHTML=b27Option(programasEditables,"Seleccionar programa editable", b27ProgramaLabel);
  if(!cont) return;
  if(!b27Recursos.length){ cont.innerHTML=`<div class="b27-empty">Todavía no hay recursos cargados.</div>`; return; }
  cont.innerHTML=b27Recursos.map(r=>{ const p=b27Programas.find(x=>x.id===r.programa_id); const archivo=b27FileLink(r,"Ver recurso"); return `<article class="b27-card"><h3>${b27Escape(r.titulo)}</h3><p>${b27Escape(r.descripcion || "Sin descripción.")}</p><div class="b27-meta">${b27Pill(r.tipo || "Recurso","info")}${r.habilitado_ia ? b27Pill("Fuente IA","ai") : ""}${p ? b27Pill(p.titulo,"info") : ""}</div>${r.autor_fuente ? `<p><strong>Fuente:</strong> ${b27Escape(r.autor_fuente)}</p>` : ""}${archivo ? `<div>${archivo}</div>` : ""}</article>`; }).join("");
}
function b27RenderFuentesIA(){ const cont=b27("listaFuentesIa"); if(!cont) return; const programas=b27Programas.filter(p=>p.estado==="aprobado" && p.habilitado_ia); const recursos=b27Recursos.filter(r=>r.habilitado_ia && programas.some(p=>p.id===r.programa_id)); if(!programas.length && !recursos.length){ cont.innerHTML=`<div class="b27-empty">Aún no hay fuentes aprobadas para ADA IA.</div>`; return; } cont.innerHTML=[...programas.map(p=>`<article class="b27-card"><h3>📘 ${b27Escape(p.titulo)}</h3><p>${b27Escape(p.contenidos || "Programa aprobado")}</p><div class="b27-meta">${b27Pill("Programa aprobado","ok")}${b27Pill("Fuente IA","ai")}${p.materias?.nombre ? b27Pill(p.materias.nombre,"info") : ""}</div>${b27FileLink(p,"Ver programa")}</article>`),...recursos.map(r=>`<article class="b27-card"><h3>📎 ${b27Escape(r.titulo)}</h3><p>${b27Escape(r.descripcion || "Recurso habilitado")}</p><div class="b27-meta">${b27Pill(r.tipo || "Recurso","info")}${b27Pill("Fuente IA","ai")}</div>${b27FileLink(r,"Ver recurso")}</article>`)].join(""); }
function b27UpdateKpis(){ b27SetText("kpiProgramas",b27Programas.length); b27SetText("kpiAprobados",b27Programas.filter(p=>p.estado==="aprobado").length); b27SetText("kpiPendientes",b27Programas.filter(p=>p.estado==="pendiente").length); b27SetText("kpiRecursos",b27Recursos.length); }
function b27Filtrar(){ const curso=b27("filtroCurso")?.value || ""; const materia=b27("filtroMateria")?.value || ""; const estado=b27("filtroEstado")?.value || ""; const rows=b27Programas.filter(p=>(!curso || p.curso_id===curso) && (!materia || p.materia_id===materia) && (!estado || p.estado===estado)); b27RenderProgramas(rows); }
function b27ToggleApprove(id){ b27(`approve-${id}`)?.classList.toggle("open"); }

async function b27CambiarEstado(id, estado){
  try{
    if(!b27CanApprove()) throw new Error("No tenés permiso para revisar programas.");
    const p=b27Programas.find(x=>x.id===id);
    if(!p || p.estado!=="pendiente") throw new Error("El programa ya no está pendiente de revisión.");
    const obs=(b27(`obs-${id}`)?.value || "").trim();
    if(estado==="observado" && !obs) throw new Error("Escribí una observación antes de devolver el programa.");
    const patch={ estado, observaciones: obs || null, aprobado_por: estado==="aprobado" ? b27Perfil.id : null, aprobado_en: estado==="aprobado" ? new Date().toISOString() : null };
    const { error } = await supabaseClient.from("programas_materia").update(patch).eq("id", id).eq("estado","pendiente");
    if(error) throw error;
    await b27LoadAll();
  }catch(err){ alert("No se pudo actualizar el programa: " + (err.message || err)); }
}

async function b27EnviarRevision(id){
  try{
    const p=b27Programas.find(x=>x.id===id);
    if(!b27IsEditable(p)) throw new Error("Solo podés enviar tus programas en borrador u observados.");
    if(!confirm("¿Enviar este programa a revisión? Mientras esté pendiente no podrás editarlo.")) return;
    const { error } = await supabaseClient.from("programas_materia").update({estado:"pendiente",observaciones:null,aprobado_por:null,aprobado_en:null}).eq("id",id).eq("creado_por",b27Perfil.id);
    if(error) throw error;
    await b27LoadAll();
  }catch(err){ alert("No se pudo enviar el programa: " + (err.message || err)); }
}

function b27ResetForm(){
  b27EditId=null;
  b27("formPrograma")?.reset();
  if(b27("programaAnio")) b27("programaAnio").value=b27Year();
  if(b27("programaVersion")) b27("programaVersion").value="1.0";
  if(b27("programaIa")) b27("programaIa").checked=true;
  b27SetText("programaFormTitle","Nuevo programa");
  b27SetText("programaSubmitText","Guardar programa");
  b27("btnCancelarEdicion")?.classList.add("is-hidden");
  b27Msg("msgPrograma","",true);
}
function b27FillForm(p, isNewVersion=false){
  b27EditId = isNewVersion ? null : p.id;
  b27("programaCurso").value=p.curso_id || "";
  b27("programaMateria").value=p.materia_id || "";
  b27("programaAnio").value=p.anio_lectivo || b27Year();
  b27("programaVersion").value=isNewVersion ? b27NextVersion(p.version) : (p.version || "1.0");
  b27("programaTitulo").value=p.titulo || "";
  b27("programaFundamentacion").value=p.fundamentacion || "";
  b27("programaObjetivos").value=p.objetivos || "";
  b27("programaContenidos").value=p.contenidos || "";
  b27("programaEvaluacion").value=p.metodologia_evaluacion || "";
  b27("programaEstado").value="borrador";
  b27("programaIa").checked=!!p.habilitado_ia;
  b27SetText("programaFormTitle",isNewVersion ? "Nueva versión del programa" : "Editar programa");
  b27SetText("programaSubmitText",isNewVersion ? "Crear nueva versión" : "Guardar cambios");
  b27("btnCancelarEdicion")?.classList.remove("is-hidden");
  b27SelectTab("nuevo");
  window.scrollTo({top:0,behavior:"smooth"});
}
function b27OpenEditor(id){ const p=b27Programas.find(x=>x.id===id); if(!b27IsEditable(p)){ alert("Este programa no puede editarse en su estado actual."); return; } b27FillForm(p,false); }
function b27NuevaVersion(id){ const p=b27Programas.find(x=>x.id===id); if(!p || !b27IsOwner(p) || p.estado!=="aprobado"){ alert("Solo podés crear una nueva versión de tus programas aprobados."); return; } b27FillForm(p,true); }

async function b27SubmitPrograma(ev){
  ev.preventDefault();
  if(!b27CanManage()) return;
  b27Msg("msgPrograma",b27EditId ? "Guardando cambios..." : "Guardando programa...",true);
  try{
    const current=b27EditId ? b27Programas.find(p=>p.id===b27EditId) : null;
    if(current && !b27IsEditable(current)) throw new Error("El programa ya no está disponible para edición.");
    const file=b27("programaArchivo")?.files?.[0] || null;
    const upload=file ? await b27UploadFile(file,"programas", b27Perfil.id) : {};
    const payload={
      curso_id:b27("programaCurso").value,
      materia_id:b27("programaMateria").value,
      anio_lectivo:Number(b27("programaAnio").value),
      version:b27("programaVersion").value.trim(),
      titulo:b27("programaTitulo").value.trim(),
      fundamentacion:b27("programaFundamentacion").value.trim() || null,
      objetivos:b27("programaObjetivos").value.trim() || null,
      contenidos:b27("programaContenidos").value.trim(),
      metodologia_evaluacion:b27("programaEvaluacion").value.trim() || null,
      estado:b27("programaEstado").value,
      habilitado_ia:b27("programaIa").checked,
      observaciones:null,
      aprobado_por:null,
      aprobado_en:null,
      ...upload
    };
    if(!payload.curso_id || !payload.materia_id || !payload.titulo || !payload.contenidos) throw new Error("Completá curso, materia, título y contenidos.");
    let res;
    if(b27EditId) res = await supabaseClient.from("programas_materia").update(payload).eq("id",b27EditId).eq("creado_por",b27Perfil.id).in("estado",["borrador","observado"]);
    else res = await supabaseClient.from("programas_materia").insert({...payload,creado_por:b27Perfil.id});
    if(res.error) throw res.error;
    const sent = payload.estado === "pendiente";
    b27ResetForm();
    b27Msg("msgPrograma",sent ? "Programa guardado y enviado a revisión." : (b27EditId ? "Cambios guardados." : "Programa guardado como borrador."),true);
    await b27LoadAll();
    b27SelectTab("listado");
  }catch(err){ b27Msg("msgPrograma", err.message || "No se pudo guardar el programa.", false); }
}

async function b27SubmitRecurso(ev){
  ev.preventDefault();
  if(!b27CanManage()) return;
  b27Msg("msgRecurso","Guardando recurso...",true);
  try{
    const programa=b27Programas.find(p=>p.id===b27("recursoPrograma").value);
    if(!b27IsEditable(programa)) throw new Error("Solo podés agregar recursos a programas en borrador u observados.");
    const file=b27("recursoArchivo")?.files?.[0] || null;
    const upload=file ? await b27UploadFile(file,"recursos", b27Perfil.id) : {};
    const payload={ programa_id:programa.id, tipo:b27("recursoTipo").value, autor_fuente:b27("recursoAutor").value.trim() || null, titulo:b27("recursoTitulo").value.trim(), descripcion:b27("recursoDescripcion").value.trim() || null, url_externa:b27("recursoUrl").value.trim() || null, habilitado_ia:b27("recursoIa").checked, creado_por:b27Perfil.id, ...upload };
    const { error } = await supabaseClient.from("programa_recursos").insert(payload);
    if(error) throw error;
    ev.target.reset(); b27("recursoIa").checked=true;
    b27Msg("msgRecurso","Recurso guardado correctamente.",true);
    await b27LoadAll();
  }catch(err){ b27Msg("msgRecurso", err.message || "No se pudo guardar el recurso.", false); }
}

async function b27ObtenerContextoSeguro(){ if(window.adaReady){ const ctx=await window.adaReady; if(ctx) return ctx; } if(typeof window.obtenerSesionPerfil==="function"){ const ctx=await window.obtenerSesionPerfil(); if(ctx) return ctx; } if(typeof window.adaRequirePageAccess==="function"){ const ctx=await window.adaRequirePageAccess(); if(ctx) return ctx; } throw new Error("No se pudo validar la sesión del usuario."); }

document.addEventListener("DOMContentLoaded", async ()=>{
  try{
    b27Ctx = await b27ObtenerContextoSeguro();
    b27Perfil = b27Ctx?.perfil || b27Ctx?.profile || b27Ctx?.usuario || null;
    b27Rol = b27Ctx?.rol || b27Perfil?.rol || null;
    if(!b27Perfil) throw new Error("No se encontró el perfil del usuario autenticado.");
    b27Tabs(); b27ApplyRole(); await b27LoadBase(); await b27LoadAll();
    b27("btnFiltrar")?.addEventListener("click", b27Filtrar);
    b27("btnLimpiar")?.addEventListener("click", ()=>{ ["filtroCurso","filtroMateria","filtroEstado"].forEach(id=>{ if(b27(id)) b27(id).value=""; }); b27RenderProgramas(b27Programas); });
    b27("formPrograma")?.addEventListener("submit", b27SubmitPrograma);
    b27("formRecurso")?.addEventListener("submit", b27SubmitRecurso);
    b27("btnCancelarEdicion")?.addEventListener("click", ()=>{ b27ResetForm(); b27SelectTab("listado"); });
  }catch(err){ console.error(err); const view=document.querySelector(".module-view"); if(view) view.innerHTML=`<section class="panel-card"><h1>No se pudo cargar Programas</h1><p>${b27Escape(err.message || err)}</p></section>`; }
});

window.b27ToggleApprove=b27ToggleApprove;
window.b27CambiarEstado=b27CambiarEstado;
window.b27EnviarRevision=b27EnviarRevision;
window.b27OpenEditor=b27OpenEditor;
window.b27NuevaVersion=b27NuevaVersion;
