const b27 = (id) => document.getElementById(id);
let b27Ctx = null;
let b27Perfil = null;
let b27Rol = null;
let b27Cursos = [];
let b27Materias = [];
let b27Programas = [];
let b27Recursos = [];

const B27_MANAGE_ROLES = ["docente"];
const B27_APPROVE_ROLES = ["admin", "directivo"];
const B27_STORAGE_BUCKET = "ada-programas";
const B27_MAX_FILE_SIZE = 15 * 1024 * 1024;
const B27_ALLOWED_EXT = ["pdf", "doc", "docx", "jpg", "jpeg", "png", "webp"];

function b27CanManage(){ return B27_MANAGE_ROLES.includes(b27Rol); }
function b27CanApprove(){ return B27_APPROVE_ROLES.includes(b27Rol); }
function b27Year(){ return new Date().getFullYear(); }
function b27Escape(v){ return String(v ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
function b27Option(items, placeholder, label=(x)=>x.nombre || x.titulo || x.id){ return `<option value="">${placeholder}</option>` + (items||[]).map(i=>`<option value="${i.id}">${b27Escape(label(i))}</option>`).join(""); }
function b27Pill(text, cls="info"){ return `<span class="b27-pill ${cls}">${b27Escape(text)}</span>`; }
function b27EstadoClase(estado){ if(estado==="aprobado") return "ok"; if(estado==="pendiente") return "warn"; if(estado==="observado") return "danger"; return "info"; }
function b27FileExt(name){ return String(name || "").split(".").pop().toLowerCase(); }
function b27SafeName(name){ return String(name || "archivo").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "archivo"; }
function b27ValidateFile(file){ if(!file) return null; if(file.size > B27_MAX_FILE_SIZE) return "El archivo supera los 15 MB."; const ext=b27FileExt(file.name); if(!B27_ALLOWED_EXT.includes(ext)) return "Formato no permitido. Usá PDF, Word o imagen."; return null; }
function b27ProgramaLabel(p){ const curso = p.cursos?.nombre ? ` · ${p.cursos.nombre}` : ""; const mat = p.materias?.nombre ? ` · ${p.materias.nombre}` : ""; return `${p.titulo || "Programa"}${mat}${curso}`; }
async function b27SignedUrl(path){ if(!path) return ""; const { data, error } = await supabaseClient.storage.from(B27_STORAGE_BUCKET).createSignedUrl(path, 60*60); if(error){ console.warn("No se pudo generar enlace firmado", error); return ""; } return data?.signedUrl || ""; }
async function b27AttachSignedUrls(){ await Promise.all((b27Programas||[]).map(async p=>{ if(p.archivo_path) p.archivo_signed_url = await b27SignedUrl(p.archivo_path); })); await Promise.all((b27Recursos||[]).map(async r=>{ if(r.archivo_path) r.archivo_signed_url = await b27SignedUrl(r.archivo_path); })); }
async function b27UploadFile(file, folder, ownerId){ if(!file) return null; const validation=b27ValidateFile(file); if(validation) throw new Error(validation); const safe=b27SafeName(file.name); const path=`${folder}/${ownerId}/${Date.now()}_${safe}`; const { error } = await supabaseClient.storage.from(B27_STORAGE_BUCKET).upload(path, file, { cacheControl:"3600", upsert:false, contentType:file.type || "application/octet-stream" }); if(error) throw error; return { archivo_path:path, archivo_nombre:file.name, archivo_tipo:file.type || null, archivo_tamano:file.size }; }
function b27FileLink(item, label="Ver archivo"){ if(item?.archivo_signed_url) return `<a class="b27-file-link" href="${b27Escape(item.archivo_signed_url)}" target="_blank" rel="noopener">📎 ${b27Escape(item.archivo_nombre || label)}</a>`; if(item?.url_externa) return `<a class="b27-file-link" href="${b27Escape(item.url_externa)}" target="_blank" rel="noopener">🔗 ${b27Escape(item.url_externa)}</a>`; return ""; }
function b27Msg(id, text, ok=true){ const el=b27(id); if(!el) return; el.textContent=text; el.className=`form-message ${ok ? "ok" : "error"}`; }

function b27Tabs(){ document.querySelectorAll(".b27-tab").forEach(btn=>btn.addEventListener("click",()=>{ document.querySelectorAll(".b27-tab").forEach(b=>b.classList.remove("active")); document.querySelectorAll(".b27-section").forEach(s=>s.classList.remove("active")); btn.classList.add("active"); b27(`tab-${btn.dataset.tab}`)?.classList.add("active"); })); }
function b27ApplyRole(){
  const canManage=b27CanManage();
  document.querySelectorAll("[data-b27-manage]").forEach(el=>{ el.style.display = canManage ? "" : "none"; });
  const estado=b27("programaEstado");
  if(estado && b27Rol === "docente"){
    estado.innerHTML='<option value="borrador">Borrador</option><option value="pendiente">Enviar a aprobación</option>';
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
  const [progRes, recRes] = await Promise.all([
    supabaseClient.from("programas_materia").select("*, cursos(id,nombre), materias(id,nombre), creador:profiles!programas_materia_creado_por_fkey(id,nombre,apellido,email), aprobador:profiles!programas_materia_aprobado_por_fkey(id,nombre,apellido,email)").order("creado_en", {ascending:false}).limit(400),
    supabaseClient.from("programa_recursos").select("*, programas_materia(id,titulo,materia_id,curso_id), creador:profiles!programa_recursos_creado_por_fkey(id,nombre,apellido,email)").order("creado_en", {ascending:false}).limit(700)
  ]);
  if(progRes.error) throw progRes.error;
  if(recRes.error) throw recRes.error;
  b27Programas = progRes.data || [];
  b27Recursos = recRes.data || [];
  if(b27Rol === "docente"){
    b27Programas = b27Programas.filter(p => p.creado_por === b27Perfil.id);
  } else if(["alumno","familia"].includes(b27Rol)){
    b27Programas = b27Programas.filter(p => p.estado === "aprobado");
  }
  const permitidos = new Set(b27Programas.map(p=>p.id));
  b27Recursos = b27Recursos.filter(r => permitidos.has(r.programa_id));
  await b27AttachSignedUrls();
  b27RenderProgramas(b27Programas);
  b27RenderRecursos();
  b27RenderFuentesIA();
  b27UpdateKpis();
}

function b27RenderProgramas(rows){
  const cont=b27("listaProgramas");
  if(!cont) return;
  if(!rows.length){ cont.innerHTML=`<div class="b27-empty">No hay programas para mostrar.</div>`; return; }
  cont.innerHTML=rows.map(p=>{
    const recursos=b27Recursos.filter(r=>r.programa_id===p.id).length;
    const archivo=b27FileLink(p,"Ver programa adjunto");
    const canApprove=b27CanApprove() && p.estado !== "aprobado";
    const ai = p.habilitado_ia ? b27Pill("Fuente IA", "ai") : b27Pill("No IA", "info");
    return `<article class="b27-card">
      <h3>${b27Escape(p.titulo)}</h3>
      <p>${b27Escape(p.contenidos || "Sin contenidos cargados.")}</p>
      <div class="b27-meta">
        ${b27Pill(p.estado || "borrador", b27EstadoClase(p.estado))}
        ${b27Pill(p.anio_lectivo || "Año", "info")}
        ${b27Pill("Versión " + (p.version || "1.0"), "info")}
        ${ai}
        ${b27Pill(`${recursos} recursos`, "info")}
      </div>
      <div class="b27-meta">
        ${p.cursos?.nombre ? b27Pill(p.cursos.nombre,"info") : ""}
        ${p.materias?.nombre ? b27Pill(p.materias.nombre,"info") : ""}
      </div>
      ${archivo ? `<div>${archivo}</div>` : ""}
      ${p.observaciones ? `<p><strong>Observaciones:</strong> ${b27Escape(p.observaciones)}</p>` : ""}
      ${canApprove ? `<div class="b27-card-actions"><button class="btn-secondary" type="button" onclick="b27ToggleApprove('${p.id}')">Revisar / aprobar</button></div><div class="b27-approve-box" id="approve-${p.id}"><label>Observación</label><textarea id="obs-${p.id}" placeholder="Comentario para el docente..."></textarea><div class="b27-card-actions"><button class="btn-primary" type="button" onclick="b27CambiarEstado('${p.id}','aprobado')">Aprobar</button><button class="btn-secondary" type="button" onclick="b27CambiarEstado('${p.id}','observado')">Observar</button></div></div>` : ""}
    </article>`;
  }).join("");
}
function b27RenderRecursos(){
  const cont=b27("listaRecursos");
  const sel=b27("recursoPrograma");
  if(sel) sel.innerHTML=b27Option(b27Programas,"Seleccionar programa", b27ProgramaLabel);
  if(!cont) return;
  if(!b27Recursos.length){ cont.innerHTML=`<div class="b27-empty">Todavía no hay recursos cargados.</div>`; return; }
  cont.innerHTML=b27Recursos.map(r=>{
    const p=b27Programas.find(x=>x.id===r.programa_id);
    const archivo=b27FileLink(r,"Ver recurso");
    return `<article class="b27-card"><h3>${b27Escape(r.titulo)}</h3><p>${b27Escape(r.descripcion || "Sin descripción.")}</p><div class="b27-meta">${b27Pill(r.tipo || "Recurso","info")}${r.habilitado_ia ? b27Pill("Fuente IA","ai") : ""}${p ? b27Pill(p.titulo,"info") : ""}</div>${r.autor_fuente ? `<p><strong>Fuente:</strong> ${b27Escape(r.autor_fuente)}</p>` : ""}${archivo ? `<div>${archivo}</div>` : ""}</article>`;
  }).join("");
}
function b27RenderFuentesIA(){
  const cont=b27("listaFuentesIa");
  if(!cont) return;
  const programas=b27Programas.filter(p=>p.estado==="aprobado" && p.habilitado_ia);
  const recursos=b27Recursos.filter(r=>r.habilitado_ia);
  if(!programas.length && !recursos.length){ cont.innerHTML=`<div class="b27-empty">Aún no hay fuentes aprobadas para ADA IA.</div>`; return; }
  cont.innerHTML=[...programas.map(p=>`<article class="b27-card"><h3>📘 ${b27Escape(p.titulo)}</h3><p>${b27Escape(p.contenidos || "Programa aprobado")}</p><div class="b27-meta">${b27Pill("Programa aprobado","ok")}${b27Pill("Fuente IA","ai")}${p.materias?.nombre ? b27Pill(p.materias.nombre,"info") : ""}</div>${b27FileLink(p,"Ver programa")}</article>`),...recursos.map(r=>`<article class="b27-card"><h3>📎 ${b27Escape(r.titulo)}</h3><p>${b27Escape(r.descripcion || "Recurso habilitado")}</p><div class="b27-meta">${b27Pill(r.tipo || "Recurso","info")}${b27Pill("Fuente IA","ai")}</div>${b27FileLink(r,"Ver recurso")}</article>`)].join("");
}
function b27UpdateKpis(){
  if(b27("kpiProgramas")) b27("kpiProgramas").textContent=b27Programas.length;
  if(b27("kpiAprobados")) b27("kpiAprobados").textContent=b27Programas.filter(p=>p.estado==="aprobado").length;
  if(b27("kpiPendientes")) b27("kpiPendientes").textContent=b27Programas.filter(p=>p.estado==="pendiente").length;
  if(b27("kpiRecursos")) b27("kpiRecursos").textContent=b27Recursos.length;
}
function b27Filtrar(){
  const curso=b27("filtroCurso")?.value || "";
  const materia=b27("filtroMateria")?.value || "";
  const estado=b27("filtroEstado")?.value || "";
  const rows=b27Programas.filter(p=>(!curso || p.curso_id===curso) && (!materia || p.materia_id===materia) && (!estado || p.estado===estado));
  b27RenderProgramas(rows);
}
function b27ToggleApprove(id){ b27(`approve-${id}`)?.classList.toggle("open"); }
async function b27CambiarEstado(id, estado){
  try{
    const obs=b27(`obs-${id}`)?.value || null;
    const patch={ estado, observaciones: obs, aprobado_por: estado==="aprobado" ? b27Perfil.id : null, aprobado_en: estado==="aprobado" ? new Date().toISOString() : null };
    const { error } = await supabaseClient.from("programas_materia").update(patch).eq("id", id);
    if(error) throw error;
    await b27LoadAll();
  }catch(err){ alert("No se pudo actualizar el programa: " + (err.message || err)); }
}

async function b27SubmitPrograma(ev){
  ev.preventDefault();
  if(!b27CanManage()) return;
  b27Msg("msgPrograma","Guardando programa...",true);
  try{
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
      creado_por:b27Perfil.id,
      ...upload
    };
    const { error } = await supabaseClient.from("programas_materia").insert(payload);
    if(error) throw error;
    ev.target.reset();
    b27("programaAnio").value=b27Year(); b27("programaVersion").value="1.0"; b27("programaIa").checked=true;
    b27Msg("msgPrograma","Programa guardado correctamente.",true);
    await b27LoadAll();
  }catch(err){ b27Msg("msgPrograma", err.message || "No se pudo guardar el programa.", false); }
}
async function b27SubmitRecurso(ev){
  ev.preventDefault();
  if(!b27CanManage()) return;
  b27Msg("msgRecurso","Guardando recurso...",true);
  try{
    const file=b27("recursoArchivo")?.files?.[0] || null;
    const upload=file ? await b27UploadFile(file,"recursos", b27Perfil.id) : {};
    const payload={
      programa_id:b27("recursoPrograma").value,
      tipo:b27("recursoTipo").value,
      autor_fuente:b27("recursoAutor").value.trim() || null,
      titulo:b27("recursoTitulo").value.trim(),
      descripcion:b27("recursoDescripcion").value.trim() || null,
      url_externa:b27("recursoUrl").value.trim() || null,
      habilitado_ia:b27("recursoIa").checked,
      creado_por:b27Perfil.id,
      ...upload
    };
    const { error } = await supabaseClient.from("programa_recursos").insert(payload);
    if(error) throw error;
    ev.target.reset(); b27("recursoIa").checked=true;
    b27Msg("msgRecurso","Recurso guardado correctamente.",true);
    await b27LoadAll();
  }catch(err){ b27Msg("msgRecurso", err.message || "No se pudo guardar el recurso.", false); }
}

async function b27ObtenerContextoSeguro(){
  // Compatibilidad con la base de seguridad ADA: algunas páginas usan adaReady y otras obtenerSesionPerfil/adaRequirePageAccess.
  if (window.adaReady) {
    const ctx = await window.adaReady;
    if (ctx) return ctx;
  }
  if (typeof window.obtenerSesionPerfil === "function") {
    const ctx = await window.obtenerSesionPerfil();
    if (ctx) return ctx;
  }
  if (typeof window.adaRequirePageAccess === "function") {
    const ctx = await window.adaRequirePageAccess();
    if (ctx) return ctx;
  }
  throw new Error("No se pudo validar la sesión del usuario.");
}

document.addEventListener("DOMContentLoaded", async ()=>{
  try{
    b27Ctx = await b27ObtenerContextoSeguro();
    b27Perfil = b27Ctx?.perfil || b27Ctx?.profile || b27Ctx?.usuario || null;
    b27Rol = b27Ctx?.rol || b27Perfil?.rol || null;

    if(!b27Perfil){
      throw new Error("No se encontró el perfil del usuario autenticado.");
    }

    b27Tabs();
    b27ApplyRole();
    await b27LoadBase();
    await b27LoadAll();
    b27("btnFiltrar")?.addEventListener("click", b27Filtrar);
    b27("btnLimpiar")?.addEventListener("click", ()=>{ ["filtroCurso","filtroMateria","filtroEstado"].forEach(id=>{ if(b27(id)) b27(id).value=""; }); b27RenderProgramas(b27Programas); });
    b27("formPrograma")?.addEventListener("submit", b27SubmitPrograma);
    b27("formRecurso")?.addEventListener("submit", b27SubmitRecurso);
  }catch(err){ console.error(err); const view=document.querySelector(".module-view"); if(view) view.innerHTML=`<section class="panel-card"><h1>No se pudo cargar Programas</h1><p>${b27Escape(err.message || err)}</p></section>`; }
});
