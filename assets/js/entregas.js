const b26e = (id) => document.getElementById(id);
let b26eCtx = null;
let b26ePerfil = null;
let b26eRol = null;
let b26eActividades = [];
let b26eEntregas = [];
let b26eAlumnos = [];

const B26_REVIEW_ROLES = ["admin", "directivo", "docente"];
function b26eCanReview(){ return B26_REVIEW_ROLES.includes(b26eRol); }
function b26eCanSubmit(){ return b26eRol === "alumno"; }
function b26eEscape(v){ return String(v ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
function b26ePill(text, cls="info"){ return `<span class="b26-pill ${cls}">${b26eEscape(text)}</span>`; }
function b26eEstadoClase(estado){ if(estado==="revisada") return "ok"; if(estado==="devuelta") return "warn"; if(estado==="pendiente") return "warn"; if(estado==="entregada") return "info"; return "info"; }
function b26eToday(){ return new Date().toISOString().slice(0,10); }
function b26eVencida(a){ return a.fecha_entrega && a.fecha_entrega < b26eToday() && a.estado !== "cerrada"; }

function b26eTabs(){
  document.querySelectorAll(".b26-tab").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll(".b26-tab").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".b26-section").forEach(s=>s.classList.remove("active"));
    btn.classList.add("active");
    b26e(`tab-${btn.dataset.tab}`)?.classList.add("active");
  }));
}

function b26eApplyRole(){
  const review = b26eCanReview();
  document.querySelectorAll("[data-b26-review]").forEach(el=>{ el.style.display = review ? "" : "none"; });
}

async function b26eLoad(){
  const [actRes, entRes, alumRes] = await Promise.all([
    supabaseClient.from("actividades").select("*, cursos(id,nombre), materias(id,nombre)").in("estado", ["publicada", "cerrada"]).order("fecha_entrega", {ascending:false}).limit(300),
    supabaseClient.from("entregas_actividades").select("*, actividades(id,titulo,materia_id,curso_id), alumno:profiles!entregas_actividades_alumno_id_fkey(id,nombre,apellido,email)").order("entregado_en", {ascending:false}).limit(500),
    supabaseClient.from("profiles").select("id,nombre,apellido,email,rol,activo").eq("rol", "alumno").eq("activo", true).order("apellido", {ascending:true})
  ]);
  for(const r of [actRes, entRes, alumRes]) if(r.error) throw r.error;
  b26eActividades = actRes.data || [];
  b26eEntregas = entRes.data || [];
  b26eAlumnos = alumRes.data || [];
  if(b26eRol === "alumno") b26eEntregas = b26eEntregas.filter(e=>e.alumno_id === b26ePerfil.id);
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
    const boton = b26eCanSubmit() && a.estado === "publicada" ? `<button class="btn-primary" type="button" data-abrir-entrega="${a.id}">${propia ? "Actualizar entrega" : "Realizar entrega"}</button>` : "";
    const archivo = propia?.archivo_url ? `<a href="${b26eEscape(propia.archivo_url)}" target="_blank" rel="noopener">Ver archivo/link</a>` : "";
    return `<article class="b26-card ${vencida && !propia ? "b26-highlight" : ""}">
      <h3>${b26eEscape(a.titulo)}</h3>
      <p>${b26eEscape(a.descripcion || "Sin consigna cargada.")}</p>
      <div class="b26-meta">
        ${b26ePill(a.materias?.nombre || "Materia", "info")}
        ${b26ePill(a.cursos?.nombre || "Curso", "info")}
        ${b26ePill("Fecha límite: " + (a.fecha_entrega || "sin fecha"), vencida ? "warn" : "ok")}
        ${b26ePill(estado, b26eEstadoClase(estado))}
      </div>
      ${propia?.texto_entrega ? `<div class="b26-note"><strong>Entrega:</strong> ${b26eEscape(propia.texto_entrega)} ${archivo ? " · " + archivo : ""}</div>` : ""}
      ${propia?.devolucion ? `<div class="b26-note"><strong>Devolución:</strong> ${b26eEscape(propia.devolucion)} ${propia.calificacion ? " · Nota: " + b26eEscape(propia.calificacion) : ""}</div>` : ""}
      <div class="b26-actions">${boton}</div>
    </article>`;
  }).join("");

  cont.querySelectorAll("[data-abrir-entrega]").forEach(btn=>btn.addEventListener("click",()=>abrirModalEntrega(btn.dataset.abrirEntrega)));
}

function renderRevision(){
  const el = b26e("tablaRevision");
  if(!el) return;
  if(!b26eCanReview()){ el.innerHTML = `<p class="helper-text">La revisión está disponible para docentes y equipos de gestión.</p>`; return; }
  if(!b26eEntregas.length){ el.innerHTML = `<p class="helper-text">Todavía no hay entregas para revisar.</p>`; return; }
  const rows = b26eEntregas.map(e=>`<tr><td>${b26eEscape(e.actividades?.titulo || "-")}</td><td>${b26eEscape((e.alumno?.apellido || "") + ", " + (e.alumno?.nombre || ""))}</td><td>${b26ePill(e.estado || "entregada", b26eEstadoClase(e.estado))}</td><td>${e.calificacion ?? "-"}</td><td>${e.entregado_en ? new Date(e.entregado_en).toLocaleString("es-AR") : "-"}</td><td><button class="btn-secondary" type="button" data-revisar="${e.id}">Revisar</button></td></tr>`).join("");
  el.innerHTML = `<table class="ada-table"><thead><tr><th>Actividad</th><th>Alumno</th><th>Estado</th><th>Nota</th><th>Fecha</th><th>Acción</th></tr></thead><tbody>${rows}</tbody></table>`;
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
  b26e("entregaActividadId").value = actividadId;
  b26e("modalEntregaTitulo").textContent = act?.titulo || "Actividad";
  b26e("entregaTexto").value = propia?.texto_entrega || "";
  b26e("entregaArchivoUrl").value = propia?.archivo_url || "";
  b26e("msgEntrega").textContent = "";
  b26e("modalEntrega").classList.add("open");
  b26e("modalEntrega").setAttribute("aria-hidden", "false");
}
function cerrarModalEntrega(){ b26e("modalEntrega").classList.remove("open"); b26e("modalEntrega").setAttribute("aria-hidden", "true"); }

async function guardarEntrega(ev){
  ev.preventDefault();
  b26e("msgEntrega").textContent = "Enviando entrega...";
  const payload = {
    actividad_id: b26e("entregaActividadId").value,
    alumno_id: b26ePerfil.id,
    texto_entrega: b26e("entregaTexto").value.trim(),
    archivo_url: b26e("entregaArchivoUrl").value.trim() || null,
    estado: "entregada",
    entregado_en: new Date().toISOString()
  };
  const { error } = await supabaseClient.from("entregas_actividades").upsert(payload, { onConflict: "actividad_id,alumno_id" });
  if(error){ b26e("msgEntrega").textContent = "Error: " + error.message; return; }
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
  const msg = `No se pudo cargar el Bloque 26. Verificá que hayas ejecutado docs/sql/ada_bloque_26_actividades_entregas.sql. Detalle: ${error.message}`;
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
document.addEventListener("keydown", (e)=>{ if(e.key === "Escape"){ cerrarModalEntrega(); cerrarModalRevision(); }});

iniciarBloque26Entregas();
