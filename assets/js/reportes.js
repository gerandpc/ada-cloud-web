
const qs=(id)=>document.getElementById(id);
let cursos=[],alumnos=[],lastData={asistencia:[],seguimiento:[],usuarios:[],documentos:[],estructura:[]};

function option(items,placeholder="Todos",labelFn=x=>x.nombre){return `<option value="">${placeholder}</option>`+items.map(i=>`<option value="${i.id}">${labelFn(i)}</option>`).join("")}
function configurarTabs(){document.querySelectorAll(".report-tab").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".report-tab").forEach(b=>b.classList.remove("active"));document.querySelectorAll(".report-section").forEach(s=>s.classList.remove("active"));btn.classList.add("active");qs("tab-"+btn.dataset.tab).classList.add("active")}))}
function badge(text,cls=""){return `<span class="badge ${cls}">${text||"-"}</span>`}
function tabla(headers,rows){if(!rows.length)return"<p class='helper-text'>No hay datos para mostrar.</p>";return `<table class="ada-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`}

async function cargarBase(){
  await obtenerSesionPerfil();
  const [usuariosRes,cursosRes,materiasRes,docsRes,alumnosRes]=await Promise.all([
    supabaseClient.from("profiles").select("id",{count:"exact",head:true}),
    supabaseClient.from("cursos").select("id,nombre",{count:"exact"}).order("nombre"),
    supabaseClient.from("materias").select("id",{count:"exact",head:true}),
    supabaseClient.from("documentos").select("id",{count:"exact",head:true}),
    supabaseClient.from("profiles").select("id,nombre,apellido,email").eq("rol","alumno").order("apellido")
  ]);
  qs("statUsuarios").textContent=usuariosRes.count||0;qs("statCursos").textContent=cursosRes.count||0;qs("statMaterias").textContent=materiasRes.count||0;qs("statDocumentos").textContent=docsRes.count||0;
  cursos=cursosRes.data||[];alumnos=alumnosRes.data||[];
  qs("filtroAsistenciaCurso").innerHTML=option(cursos);qs("filtroSeguimientoCurso").innerHTML=option(cursos);
  const alumnoOpts=option(alumnos,"Todos",a=>`${a.apellido||""}, ${a.nombre||""}`);
  qs("filtroAsistenciaAlumno").innerHTML=alumnoOpts;qs("filtroSeguimientoAlumno").innerHTML=alumnoOpts;
}

async function reporteAsistencia(){
  let {data,error}=await supabaseClient.from("v_reporte_asistencia_detalle").select("*").order("fecha",{ascending:false});
  if(error){qs("tablaAsistencia").innerHTML=`<p class="form-message">Error: ${error.message}</p>`;console.error(error);return}
  const curso=qs("filtroAsistenciaCurso").value,alumno=qs("filtroAsistenciaAlumno").value,desde=qs("filtroAsistenciaDesde").value,hasta=qs("filtroAsistenciaHasta").value;
  data=data||[];if(curso)data=data.filter(r=>r.curso_id===curso);if(alumno)data=data.filter(r=>r.alumno_id===alumno);if(desde)data=data.filter(r=>r.fecha>=desde);if(hasta)data=data.filter(r=>r.fecha<=hasta);
  lastData.asistencia=data;
  const total=data.length,ausentes=data.filter(r=>r.computa_inasistencia).length,presentes=data.filter(r=>r.estado_codigo==="presente").length,tarde=data.filter(r=>r.estado_codigo==="tarde").length;
  qs("resumenAsistencia").innerHTML=`<strong>Resumen</strong><br>Total registros: ${total} · Presentes: ${presentes} · Tardes: ${tarde} · Ausencias computables: ${ausentes}`;
  qs("tablaAsistencia").innerHTML=tabla(["Fecha","Alumno","Curso","Materia","Estado","Observación"],data.map(r=>`<tr><td>${r.fecha||"-"}</td><td>${r.alumno_apellido||""}, ${r.alumno_nombre||""}</td><td>${r.curso||"-"}</td><td>${r.materia||"-"}</td><td>${badge(r.estado,r.computa_inasistencia?"badge-red":"badge-green")}</td><td>${r.observacion||"-"}</td></tr>`));
}

async function reporteSeguimiento(){
  let {data,error}=await supabaseClient.from("v_reporte_seguimiento_detalle").select("*").order("creado_en",{ascending:false});
  if(error){qs("tablaSeguimiento").innerHTML=`<p class="form-message">Error: ${error.message}</p>`;console.error(error);return}
  const curso=qs("filtroSeguimientoCurso").value,alumno=qs("filtroSeguimientoAlumno").value,prioridad=qs("filtroSeguimientoPrioridad").value,tipo=qs("filtroSeguimientoTipo").value.trim().toLowerCase();
  data=data||[];if(curso)data=data.filter(r=>r.curso_id===curso);if(alumno)data=data.filter(r=>r.alumno_id===alumno);if(prioridad)data=data.filter(r=>r.prioridad===prioridad);if(tipo)data=data.filter(r=>String(r.tipo||"").toLowerCase().includes(tipo));
  lastData.seguimiento=data;
  qs("tablaSeguimiento").innerHTML=tabla(["Fecha","Alumno","Curso","Tipo","Prioridad","Visible familia","Descripción"],data.map(r=>`<tr><td>${r.creado_en?new Date(r.creado_en).toLocaleDateString("es-AR"):"-"}</td><td>${r.alumno_apellido||""}, ${r.alumno_nombre||""}</td><td>${r.curso||"-"}</td><td>${badge(r.tipo,"badge-blue")}</td><td>${badge(r.prioridad,r.prioridad==="alta"?"badge-red":r.prioridad==="media"?"badge-yellow":"badge-green")}</td><td>${r.visible_familia?"Sí":"No"}</td><td>${r.descripcion||"-"}</td></tr>`));
}

async function reporteUsuarios(){
  const {data,error}=await supabaseClient.from("profiles").select("nombre,apellido,email,rol,activo,creado_en").order("rol").order("apellido");
  if(error){qs("tablaUsuariosReporte").innerHTML=`<p class="form-message">Error: ${error.message}</p>`;console.error(error);return}
  lastData.usuarios=data||[];
  qs("tablaUsuariosReporte").innerHTML=tabla(["Usuario","Email","Rol","Estado","Creado"],lastData.usuarios.map(u=>`<tr><td>${u.apellido||""}, ${u.nombre||""}</td><td>${u.email||""}</td><td>${badge(u.rol,"badge-blue")}</td><td>${u.activo?badge("Activo","badge-green"):badge("Inactivo","badge-red")}</td><td>${u.creado_en?new Date(u.creado_en).toLocaleDateString("es-AR"):"-"}</td></tr>`));
}

async function reporteDocumentos(){
  const {data,error}=await supabaseClient.from("documentos").select("titulo,tipo_documento,puede_usarse_ia,puede_descargarse,visible_general,nombre_archivo_original,mime_type,tamanio_bytes,creado_en,activo").order("creado_en",{ascending:false});
  if(error){qs("tablaDocumentosReporte").innerHTML=`<p class="form-message">Error: ${error.message}</p>`;console.error(error);return}
  lastData.documentos=data||[];
  qs("tablaDocumentosReporte").innerHTML=tabla(["Documento","Tipo","IA","Descarga","General","Archivo","Estado"],lastData.documentos.map(d=>`<tr><td>${d.titulo||"-"}</td><td>${d.tipo_documento||"-"}</td><td>${d.puede_usarse_ia?"Sí":"No"}</td><td>${d.puede_descargarse?"Sí":"No"}</td><td>${d.visible_general?"Sí":"No"}</td><td>${d.nombre_archivo_original||"-"}<br><small>${d.mime_type||""} ${d.tamanio_bytes?Math.round(d.tamanio_bytes/1024)+" KB":""}</small></td><td>${d.activo?badge("Activo","badge-green"):badge("Inactivo","badge-red")}</td></tr>`));
}

async function reporteEstructura(){
  const {data,error}=await supabaseClient.from("materias").select("nombre,carga_horaria_semanal,tipo_materia,cursos(nombre,niveles(nombre),anios_grados(nombre),divisiones(nombre),modalidades(nombre))").order("nombre");
  if(error){qs("tablaEstructuraReporte").innerHTML=`<p class="form-message">Error: ${error.message}</p>`;console.error(error);return}
  lastData.estructura=(data||[]).map(m=>({curso:m.cursos?.nombre||"",nivel:m.cursos?.niveles?.nombre||"",anio:m.cursos?.anios_grados?.nombre||"",division:m.cursos?.divisiones?.nombre||"",modalidad:m.cursos?.modalidades?.nombre||"",materia:m.nombre,carga_horaria_semanal:m.carga_horaria_semanal,tipo_materia:m.tipo_materia}));
  qs("tablaEstructuraReporte").innerHTML=tabla(["Curso","Nivel","Año","División","Modalidad","Materia","Carga","Tipo"],lastData.estructura.map(r=>`<tr><td>${r.curso}</td><td>${r.nivel}</td><td>${r.anio}</td><td>${r.division}</td><td>${r.modalidad||"-"}</td><td>${r.materia}</td><td>${r.carga_horaria_semanal||"-"} hs</td><td>${r.tipo_materia||"-"}</td></tr>`));
}

function downloadCSV(filename,rows){if(!rows||!rows.length){alert("No hay datos para exportar.");return}const headers=Object.keys(rows[0]);const esc=v=>`"${String(v??"").replace(/"/g,'""')}"`;const csv=[headers.join(","),...rows.map(row=>headers.map(h=>esc(row[h])).join(","))].join("\\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url)}
function bindEvents(){
  qs("btnReporteAsistencia").addEventListener("click",reporteAsistencia);qs("btnExportAsistencia").addEventListener("click",()=>downloadCSV("reporte_asistencia.csv",lastData.asistencia));
  qs("btnReporteSeguimiento").addEventListener("click",reporteSeguimiento);qs("btnExportSeguimiento").addEventListener("click",()=>downloadCSV("reporte_seguimiento.csv",lastData.seguimiento));
  qs("btnReporteUsuarios").addEventListener("click",reporteUsuarios);qs("btnExportUsuarios").addEventListener("click",()=>downloadCSV("reporte_usuarios.csv",lastData.usuarios));
  qs("btnReporteDocumentos").addEventListener("click",reporteDocumentos);qs("btnExportDocumentos").addEventListener("click",()=>downloadCSV("reporte_documentos.csv",lastData.documentos));
  qs("btnReporteEstructura").addEventListener("click",reporteEstructura);qs("btnExportEstructura").addEventListener("click",()=>downloadCSV("reporte_estructura_academica.csv",lastData.estructura));
}
configurarTabs();bindEvents();cargarBase();
