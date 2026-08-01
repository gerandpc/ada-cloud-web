const bb = (id) => document.getElementById(id);
let bbContexto = null, bbPerfil = null, bbRol = null;
let bbPeriodos = [], bbCursos = [], bbAlumnos = [], bbBoletines = [];
const BB_CAN_MANAGE = ["admin", "directivo", "secretaria"];

function bbEscape(v){ return String(v ?? "").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
function bbOption(items, placeholder, getLabel = (x) => x.nombre || x.email || x.id) {
  return `<option value="">${bbEscape(placeholder)}</option>` + (items || []).map(item => `<option value="${bbEscape(item.id)}">${bbEscape(getLabel(item))}</option>`).join("");
}
function bbTable(headers, rows) {
  if (!rows.length) return `<p class="helper-text">No hay datos para mostrar.</p>`;
  return `<table class="ada-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}
function bbInitTabs(){ document.querySelectorAll(".b25-tab").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".b25-tab").forEach(b=>b.classList.remove("active"));document.querySelectorAll(".b25-section").forEach(s=>s.classList.remove("active"));btn.classList.add("active");bb(`tab-${btn.dataset.tab}`)?.classList.add("active");})); }
function bbApplyRoleMode(){ document.querySelectorAll("[data-b25-boletin-manage]").forEach(el => el.style.display = BB_CAN_MANAGE.includes(bbRol) ? "" : "none"); }
function bbSetupError(error){ ["vistaPreviaBoletin","tablaBoletines"].forEach(id=>{const el=bb(id); if(el) el.innerHTML = `<p class="form-message is-error">No se pudo cargar Boletines. Ejecutá docs/sql/ada_bloque_25_calificaciones_boletines.sql. Detalle: ${error.message}</p>`;}); }

async function bbLoadBase(){
  const [periodosRes, cursosRes, alumnosRes] = await Promise.all([
    supabaseClient.from("periodos_academicos").select("*").eq("activo", true).order("orden", {ascending:true}),
    supabaseClient.from("cursos").select("id,nombre").eq("activo", true).order("nombre", {ascending:true}),
    supabaseClient.from("profiles").select("id,nombre,apellido,email,rol,activo").eq("rol", "alumno").eq("activo", true).order("apellido", {ascending:true})
  ]);
  for (const r of [periodosRes, cursosRes, alumnosRes]) if (r.error) throw r.error;
  bbPeriodos = periodosRes.data || []; bbCursos = cursosRes.data || []; bbAlumnos = alumnosRes.data || [];
  if (bbRol === "alumno") bbAlumnos = bbAlumnos.filter(a=>a.id===bbPerfil.id);
  if (bbRol === "familia") {
    const vinc = await supabaseClient.from("v_familia_hijos").select("alumno_id").eq("familia_id", bbPerfil.id);
    if(vinc.error) throw vinc.error;
    const ids = new Set((vinc.data || []).map(x=>x.alumno_id));
    bbAlumnos = bbAlumnos.filter(a=>ids.has(a.id));
  }
  const alumnoLabel = a => `${a.apellido || ""}, ${a.nombre || ""} · ${a.email || ""}`;
  ["boletinAlumno","filtroBoletinAlumno"].forEach(id=>bb(id).innerHTML = bbOption(bbAlumnos, "Seleccionar alumno", alumnoLabel));
  ["boletinCurso"].forEach(id=>bb(id).innerHTML = bbOption(bbCursos, "Seleccionar curso"));
  ["boletinPeriodo","filtroBoletinPeriodo"].forEach(id=>bb(id).innerHTML = bbOption(bbPeriodos, "Seleccionar período"));
}

async function bbLoadBoletines(){
  let query = supabaseClient
    .from("boletines")
    .select("*, alumno:profiles!boletines_alumno_id_fkey(id,nombre,apellido,email), cursos(id,nombre), periodos_academicos(id,nombre)")
    .order("emitido_en", {ascending:false})
    .limit(200);
  if (bbRol === "alumno") query = query.eq("alumno_id", bbPerfil.id).eq("estado", "emitido");
  if (bbRol === "familia") {
    const ids = bbAlumnos.map(a=>a.id);
    if(!ids.length){ bbBoletines=[]; renderBoletines([]); return; }
    query = query.in("alumno_id", ids).eq("estado", "emitido");
  }
  const res = await query; if (res.error) throw res.error;
  bbBoletines = res.data || []; renderBoletines(bbBoletines);
}
function renderBoletines(rows){
  bb("tablaBoletines").innerHTML = bbTable(["Alumno","Curso","Período","Promedio","Estado","Emitido"], rows.map(b=>`<tr><td>${bbEscape(b.alumno?.apellido || "")}, ${bbEscape(b.alumno?.nombre || "")}</td><td>${bbEscape(b.cursos?.nombre || "-")}</td><td>${bbEscape(b.periodos_academicos?.nombre || "-")}</td><td><span class="b25-pill ${Number(b.promedio_general)>=7 ? "ok" : "warn"}">${b.promedio_general ?? "-"}</span></td><td>${bbEscape(b.estado || "borrador")}</td><td>${b.emitido_en ? new Date(b.emitido_en).toLocaleDateString() : "-"}</td></tr>`));
}
async function generarBoletin(e){
  e.preventDefault();
  const alumnoId = bb("boletinAlumno").value;
  const periodoId = bb("boletinPeriodo").value;
  const cursoId = bb("boletinCurso").value || null;
  bb("msgBoletin").textContent = "Calculando calificaciones...";
  const cal = await supabaseClient.from("calificaciones").select("nota,estado,materia_id,materias(id,nombre)").eq("alumno_id", alumnoId).eq("periodo_id", periodoId);
  if (cal.error) { bb("msgBoletin").textContent = "Error: " + cal.error.message; return; }
  const notas = (cal.data || []).map(c=>Number(c.nota)).filter(n=>Number.isFinite(n));
  const promedio = notas.length ? Number((notas.reduce((a,b)=>a+b,0)/notas.length).toFixed(2)) : null;
  const payload = { alumno_id: alumnoId, curso_id: cursoId, periodo_id: periodoId, promedio_general: promedio, estado: "emitido", observacion_general: bb("boletinObservacion").value.trim() || null, emitido_por: bbPerfil.id };
  const { data, error } = await supabaseClient.from("boletines").insert(payload).select().single();
  if (error) { bb("msgBoletin").textContent = "Error: " + error.message; return; }
  const detalle = (cal.data || []).map(c => ({ boletin_id: data.id, materia_id: c.materia_id, promedio_materia: Number.isFinite(Number(c.nota)) ? Number(c.nota) : null, estado: c.estado || "calificado" }));
  if (detalle.length) await supabaseClient.from("boletin_detalles").insert(detalle);
  bb("msgBoletin").textContent = "Boletín generado correctamente.";
  bb("vistaPreviaBoletin").innerHTML = bbTable(["Materia","Nota/Promedio","Estado"], (cal.data || []).map(c=>`<tr><td>${c.materias?.nombre || "-"}</td><td>${c.nota ?? "-"}</td><td>${c.estado || "-"}</td></tr>`));
  e.target.reset(); await bbLoadBoletines();
}
function filtrarBoletines(){ const a=bb("filtroBoletinAlumno").value, p=bb("filtroBoletinPeriodo").value; renderBoletines(bbBoletines.filter(b=>(!a||b.alumno_id===a)&&(!p||b.periodo_id===p))); }
async function iniciarBoletines(){
  bbInitTabs(); bbContexto = await obtenerSesionPerfil(); if(!bbContexto) return; bbPerfil=bbContexto.perfil; bbRol=bbPerfil.rol; bbApplyRoleMode();
  try { await bbLoadBase(); await bbLoadBoletines(); } catch(error){ console.error(error); bbSetupError(error); }
}
bb("formBoletin")?.addEventListener("submit", generarBoletin);
bb("btnBuscarBoletines")?.addEventListener("click", filtrarBoletines);
bb("btnLimpiarBoletines")?.addEventListener("click", ()=>{bb("filtroBoletinAlumno").value="";bb("filtroBoletinPeriodo").value="";renderBoletines(bbBoletines);});
iniciarBoletines();
