(async()=>{
"use strict";
const ctx=await adaRequirePageAccess();
if(!ctx)return;
const PAGE_LIST=[
"dashboard.html","institucion.html","usuarios.html","directivos.html","docentes.html","preceptoria.html","alumnos.html","familias.html","cursos.html","materias.html","asignaciones.html","programas.html","planificaciones.html","actividades.html","entregas.html","asistencia.html","calificaciones.html","libro-calificaciones.html","boletines.html","cierres-academicos.html","boletines-actas.html","reportes.html","inteligencia-institucional.html","centro-informes.html","qa-academica.html"
];
const MODULE_TABLES=["profiles","cursos","materias","programas_materia","planificaciones_didacticas","actividades","entregas_actividades","asistencia_registros","calificaciones","boletines","cierres_academicos"];
const ROLE_SET=["admin","directivo","secretaria","docente","preceptor","familia","alumno"];
let results=[];
const add=(name,status,detail="",category="General")=>results.push({name,status,detail,category,time:new Date().toISOString()});
const ok=(name,detail,category)=>add(name,"ok",detail,category);
const warn=(name,detail,category)=>add(name,"warning",detail,category);
const fail=(name,detail,category)=>add(name,"error",detail,category);

async function fetchText(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return r.text();}
async function testSession(){
 const {data,error}=await supabaseClient.auth.getSession();
 if(error||!data?.session)fail("Sesión activa",error?.message||"No hay sesión","Seguridad"); else ok("Sesión activa",data.session.user.email||"Usuario autenticado","Seguridad");
 if(ctx.perfil?.id)ok("Perfil disponible",`Rol: ${ctx.perfil.rol}`,"Seguridad"); else fail("Perfil disponible","No se cargó el perfil","Seguridad");
 ROLE_SET.includes(ctx.perfil?.rol)?ok("Rol reconocido",ctx.perfil.rol,"Seguridad"):fail("Rol reconocido",String(ctx.perfil?.rol||"Sin rol"),"Seguridad");
}
async function testDatabase(){
 for(const table of MODULE_TABLES){
  try{const {error,count}=await supabaseClient.from(table).select("*",{head:true,count:"exact"});if(error)throw error;ok(`Tabla ${table}`,`${count??0} registro(s) visibles`,`Base de datos`)}
  catch(e){fail(`Tabla ${table}`,e.message||"No accesible","Base de datos")}
 }
}
async function testPages(){
 for(const page of PAGE_LIST){
  try{
   const text=await fetchText(page);
   if(!/ada-security\.js/.test(text))fail(`Página ${page}`,"No carga ada-security.js","Páginas");
   else if(!/<meta[^>]+name=["']viewport["']/i.test(text))warn(`Página ${page}`,"Falta meta viewport","Páginas");
   else ok(`Página ${page}`,"Disponible, responsive y protegida","Páginas");
   if(/window\.print\s*\(|about:blank/i.test(text))warn(`Exportación ${page}`,"Referencia a impresión del navegador o about:blank","Exportaciones");
  }catch(e){fail(`Página ${page}`,e.message||"No disponible","Páginas")}
 }
}
async function testResources(){
 const resources=["../assets/js/ada-pdf.js","../assets/js/ada-reports.js","../assets/js/ada-security.js","../assets/js/ada-final.js","../assets/css/ada-reports.css","../assets/css/ada-final.css"];
 for(const resource of resources){try{await fetchText(resource);ok(`Recurso ${resource.split('/').pop()}`,"Disponible","Recursos")}catch(e){fail(`Recurso ${resource.split('/').pop()}`,e.message,"Recursos")}}
}
async function testRuntime(){
 window.ADA_PAGE_ACCESS&&Object.keys(window.ADA_PAGE_ACCESS).length>20?ok("Mapa de permisos","Cargado","Permisos"):fail("Mapa de permisos","No disponible o incompleto","Permisos");
 window.ADA_PDF?.create?ok("Motor PDF","Disponible","Exportaciones"):fail("Motor PDF","No cargado","Exportaciones");
 window.ADAReports?.generate?ok("ADA Reports","Disponible","Exportaciones"):warn("ADA Reports","No está cargado en esta página; verificar Centro de Informes","Exportaciones");
 navigator.onLine?ok("Conectividad del navegador","En línea","Conectividad"):warn("Conectividad del navegador","Sin conexión","Conectividad");
}
function render(){
 const root=document.getElementById("qaResults");root.textContent="";
 const counters={ok:0,warning:0,error:0};results.forEach(r=>counters[r.status]++);
 document.getElementById("qaSummary").innerHTML=`<strong>${results.length} controles</strong> · <span class="qa-ok">${counters.ok} OK</span> · <span class="qa-warning">${counters.warning} advertencia(s)</span> · <span class="qa-error">${counters.error} error(es)</span>`;
 results.forEach(r=>{const row=document.createElement("article");row.className=`qa-row ${r.status}`;const left=document.createElement("div");const strong=document.createElement("strong");strong.textContent=`${r.status==="ok"?"✓":r.status==="warning"?"⚠":"✕"} ${r.name}`;const small=document.createElement("small");small.textContent=r.category;left.append(strong,small);const detail=document.createElement("span");detail.textContent=r.detail||"";row.append(left,detail);root.appendChild(row)});
}
async function run(){
 results=[];document.getElementById("qaSummary").textContent="Ejecutando controles...";document.getElementById("qaResults").textContent="";
 await testSession();await testDatabase();await testPages();await testResources();await testRuntime();render();
}
function download(type){
 if(!results.length)return alert("Ejecutá los controles antes de exportar.");
 if(type==="json"){
  const blob=new Blob([JSON.stringify({generatedAt:new Date().toISOString(),profile:ctx.perfil?.email,results},null,2)],{type:"application/json"});save(blob,`ADA_QA_FINAL_${new Date().toISOString().slice(0,10)}.json`);return;
 }
 const lines=[["Categoría","Control","Estado","Detalle","Fecha"],...results.map(r=>[r.category,r.name,r.status,r.detail,r.time])];
 const csv=lines.map(row=>row.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
 save(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),`ADA_QA_FINAL_${new Date().toISOString().slice(0,10)}.csv`);
}
function save(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function pdf(){
 if(!results.length)return alert("Ejecutá los controles antes de generar el PDF.");
 if(!window.ADA_PDF?.create)return alert("El motor PDF no está disponible.");
 const errors=results.filter(r=>r.status==="error").length,warnings=results.filter(r=>r.status==="warning").length;
 const doc=window.ADA_PDF.create({title:"Auditoría final ADA 1.0",subtitle:`Generada ${new Date().toLocaleString("es-AR")}`,filename:`ADA_Auditoria_Final_${new Date().toISOString().slice(0,10)}.pdf`,institution:"ADA Cloud"});
 doc.cards([{label:"Controles",value:results.length},{label:"Correctos",value:results.filter(r=>r.status==="ok").length},{label:"Advertencias",value:warnings},{label:"Errores",value:errors}],4);
 doc.note(errors?"Estado: requiere correcciones antes de producción.":warnings?"Estado: apto con observaciones.":"Estado: controles automáticos aprobados.");
 doc.table(["Categoría","Control","Estado","Detalle"],results.map(r=>[r.category,r.name,r.status.toUpperCase(),r.detail]),{fontSize:6.8,widths:[.18,.27,.12,.43]});
 doc.download();
}
document.getElementById("runQa")?.addEventListener("click",run);
document.getElementById("exportQa")?.addEventListener("click",()=>download("csv"));
document.getElementById("exportQaJson")?.addEventListener("click",()=>download("json"));
document.getElementById("exportQaPdf")?.addEventListener("click",pdf);
run();
})();
