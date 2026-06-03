const b26a = (id) => document.getElementById(id);
let b26aCtx = null;
let b26aPerfil = null;
let b26aRol = null;
let b26aCursos = [];
let b26aMaterias = [];
let b26aActividades = [];
let b26aEntregas = [];

const B26_MANAGE_ROLES = ["admin", "directivo", "docente"];

function b26aCanManage(){ return B26_MANAGE_ROLES.includes(b26aRol); }
function b26aToday(){ return new Date().toISOString().slice(0,10); }
function b26aEscape(v){ return String(v ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
function b26aOption(items, placeholder, label=(x)=>x.nombre || x.titulo || x.id){ return `<option value="">${placeholder}</option>` + (items||[]).map(i=>`<option value="${i.id}">${b26aEscape(label(i))}</option>`).join(""); }
function b26aPill(text, cls="info"){ return `<span class="b26-pill ${cls}">${b26aEscape(text)}</span>`; }
function b26aEstadoClase(estado){ if(estado==="publicada") return "ok"; if(estado==="borrador") return "warn"; if(estado==="cerrada") return "danger"; return "info"; }
function b26aVencida(a){ return a.fecha_entrega && a.fecha_entrega < b26aToday() && a.estado !== "cerrada"; }

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
  ["actividadMateria","filtroMateria"].forEach(id=>{ if(b26a(id)) b26a(id).innerHTML = b26aOption(b26aMaterias,"Seleccionar materia",materiaLabel); });
  if(b26a("actividadPublicacion")) b26a("actividadPublicacion").value = b26aToday();
  if(b26a("actividadEntrega")) b26a("actividadEntrega").value = b26aToday();
}

async function b26aLoadActividades(){
  let query = supabaseClient
    .from("actividades")
    .select("*, cursos(id,nombre), materias(id,nombre), creador:profiles!actividades_creado_por_fkey(id,nombre,apellido,email)")
    .order("fecha_entrega", {ascending:false})
    .limit(300);
  const res = await query;
  if(res.error) throw res.error;
  b26aActividades = res.data || [];
  await b26aLoadEntregas();
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
}

function b26aRenderActividades(rows){
  const cont = b26a("listaActividades");
  if(!rows.length){ cont.innerHTML = `<div class="b26-empty">No hay actividades para mostrar.</div>`; return; }
  cont.innerHTML = rows.map(a=>{
    const entregas = b26aEntregas.filter(e=>e.actividad_id === a.id).length;
    const vencida = b26aVencida(a);
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
      <p class="b26-status-line">Tipo: ${b26aEscape(a.tipo || "-")} · Puntaje: ${b26aEscape(a.puntaje_maximo || "-")} · Creada por: ${b26aEscape((a.creador?.nombre || "") + " " + (a.creador?.apellido || ""))}</p>
    </article>`;
  }).join("");
  b26aRenderSeguimiento();
}

function b26aRenderSeguimiento(){
  const el = b26a("tablaSeguimiento");
  if(!el) return;
  if(!b26aEntregas.length){ el.innerHTML = `<p class="helper-text">Todavía no hay entregas registradas.</p>`; return; }
  const rows = b26aEntregas.map(e=>`<tr><td>${b26aEscape(e.actividades?.titulo || "-")}</td><td>${b26aEscape((e.alumno?.apellido || "") + ", " + (e.alumno?.nombre || ""))}</td><td>${b26aPill(e.estado || "pendiente", e.estado === "revisada" ? "ok" : e.estado === "devuelta" ? "warn" : "info")}</td><td>${e.calificacion ?? "-"}</td><td>${e.entregado_en ? new Date(e.entregado_en).toLocaleString("es-AR") : "-"}</td></tr>`).join("");
  el.innerHTML = `<table class="ada-table"><thead><tr><th>Actividad</th><th>Alumno</th><th>Estado</th><th>Nota</th><th>Fecha</th></tr></thead><tbody>${rows}</tbody></table>`;
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
  const { error } = await supabaseClient.from("actividades").insert(payload);
  if(error){ b26a("msgActividad").textContent = "Error: " + error.message; return; }
  b26a("msgActividad").textContent = "Actividad guardada correctamente.";
  ev.target.reset();
  b26a("actividadPublicacion").value = b26aToday();
  b26a("actividadEntrega").value = b26aToday();
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
  const msg = `No se pudo cargar el Bloque 26. Verificá que hayas ejecutado docs/sql/ada_bloque_26_actividades_entregas.sql. Detalle: ${error.message}`;
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
b26a("btnFiltrar")?.addEventListener("click", b26aFiltrar);
b26a("btnLimpiar")?.addEventListener("click", ()=>{ b26a("filtroCurso").value=""; b26a("filtroMateria").value=""; b26a("filtroEstado").value=""; b26aRenderActividades(b26aActividades); });

iniciarBloque26Actividades();
