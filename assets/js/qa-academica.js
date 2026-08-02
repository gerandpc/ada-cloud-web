(function(){
  "use strict";

  const $ = (id) => document.getElementById(id);
  const state = { results: [], running: false, context: null };
  const STATUS = { OK:"ok", WARN:"warn", ERROR:"error", INFO:"info" };
  const ROLE_SET = ["admin","directivo","secretaria","docente","preceptor","familia","alumno"];
  const PLACEHOLDER_RX = /\b(ac[aá]\s+va|placeholder|demo|todo|fixme|pr[oó]ximamente|en\s+construcci[oó]n|sin\s+implementar|pendiente\s+de\s+implementar|resumen\s+de)\b/i;

  const MODULES = [
    {key:"programas",page:"programas.html",script:"programas.js",table:"programas_materia",columns:"id,curso_id,materia_id,estado",roles:["admin","directivo","docente","alumno","familia"],required:["formPrograma","programaCurso","programaMateria","programaTitulo","listaProgramas","btnFiltrar"],actions:["formPrograma","btnFiltrar","btnLimpiar"]},
    {key:"planificaciones",page:"planificaciones.html",script:"planificaciones.js",table:"planificaciones_didacticas",columns:"id,curso_id,materia_id,estado",roles:["admin","directivo","docente","alumno","familia"],required:["planForm","planCurso","planMateria","planTitulo","planLista","planBtnFiltrar"],actions:["planForm","planBtnFiltrar","planBtnLimpiar","planBtnNueva"]},
    {key:"actividades",page:"actividades.html",script:"actividades.js",table:"actividades",columns:"id,curso_id,materia_id,estado",roles:["admin","directivo","docente","alumno"],required:["formActividad","actividadCurso","actividadMateria","actividadTitulo","listaActividades","btnFiltrar"],actions:["formActividad","btnFiltrar","btnLimpiar","btnGuardarActividad"]},
    {key:"entregas",page:"entregas.html",script:"entregas.js",table:"entregas_actividades",columns:"id,actividad_id,alumno_id,estado",roles:["admin","directivo","docente","alumno"],required:["listaEntregas","tablaRevision","formEntrega","formRevision"],actions:["formEntrega","formRevision","btnCerrarModalEntrega","btnCerrarModalRevision"]},
    {key:"asistencia",page:"asistencia.html",script:"asistencia.js",table:"asistencia_registros",columns:"id,alumno_id,estado_id",roles:["admin","directivo","secretaria","docente","preceptor"],required:["formClaseAsistencia","asistenciaCurso","asistenciaFecha","listaAlumnosAsistencia","tablaHistorial"],actions:["formClaseAsistencia","formGuardarAsistencia","btnCargarAlumnos","btnBuscarHistorial"]},
    {key:"calificaciones",page:"calificaciones.html",script:"calificaciones.js",table:"planilla_docente_notas",columns:"id",roles:["admin","directivo","secretaria","docente"],required:["cursoSelect","materiaSelect","btnCargarPlanilla","tablaPrimer","tablaSegundo"],actions:["btnCargarPlanilla","btnExportarExcel","btnExportarActaPdf","btnEnviarSecretaria"]},
    {key:"boletines",page:"boletines.html",script:"boletines.js",table:"boletines",columns:"id,alumno_id,estado",roles:["admin","directivo","secretaria","alumno","familia"],required:["formBoletin","boletinAlumno","boletinPeriodo","tablaBoletines","tablaRevisionBoletines"],actions:["formBoletin","btnBuscarBoletines","btnLimpiarBoletines"]},
    {key:"cierres",page:"cierres-academicos.html",script:"cierres-academicos.js",table:"cierres_academicos",columns:"id,curso_id,materia_id,estado",roles:["admin","directivo","secretaria"],required:["formCierre","cierreCurso","cierreMateria","tablaCierres","btnGenerarActa"],actions:["formCierre","btnActualizarCierres","btnGenerarBoletines","btnGenerarActa"]},
    {key:"reportes",page:"reportes.html",script:"reportes.js",table:"profiles",columns:"id,rol,activo",roles:["admin","directivo","secretaria","docente","preceptor"],required:["btnReporteAsistencia","tablaAsistencia","btnReporteSeguimiento","tablaSeguimiento"],actions:["btnReporteAsistencia","btnReporteSeguimiento","btnExportAsistencia","btnPDFAsistencia"]}
  ];

  const WORKFLOWS = [
    {name:"Programa: creación → revisión → aprobación → consulta",modules:["programas"],checks:["formPrograma","programaEstado","listaProgramas"],roles:["docente","directivo","alumno","familia"]},
    {name:"Planificación: borrador → revisión → aprobación",modules:["planificaciones"],checks:["planForm","planLista","planBtnNueva"],roles:["docente","directivo"]},
    {name:"Actividad: publicación → entrega → corrección",modules:["actividades","entregas"],checks:["formActividad","formEntrega","formRevision"],roles:["docente","alumno"]},
    {name:"Calificaciones: carga → envío → cierre",modules:["calificaciones","cierres"],checks:["btnEnviarSecretaria","formCierre","btnGenerarActa"],roles:["docente","secretaria","directivo"]},
    {name:"Boletín: generación → revisión → emisión → consulta",modules:["boletines"],checks:["formBoletin","tablaRevisionBoletines","tablaBoletines"],roles:["secretaria","directivo","alumno","familia"]},
    {name:"Asistencia: toma → historial → alertas",modules:["asistencia"],checks:["formGuardarAsistencia","tablaHistorial","listaSeguimientos"],roles:["docente","preceptor","secretaria","directivo"]}
  ];

  const cache = new Map();
  function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function now(){return new Date().toISOString();}
  function makeResult(category,name,status,detail,meta={}){return {category,name,status,detail:String(detail||""),time:now(),...meta};}
  async function fetchText(path){
    const key=path;
    if(cache.has(key)) return cache.get(key);
    const response=await fetch(path,{cache:"no-store"});
    if(!response.ok) throw new Error(`HTTP ${response.status} al abrir ${path}`);
    const text=await response.text(); cache.set(key,text); return text;
  }
  function parseHtml(text){return new DOMParser().parseFromString(text,"text/html");}
  function pageUrl(file){return file;}
  function scriptUrl(file){return `../assets/js/${file}`;}
  function cssUrl(file){return `../assets/css/${file}`;}

  async function runCheck(category,name,fn,critical=true){
    try{const out=await fn();const detail=typeof out==="string"?out:(out?.detail||"Correcto");const status=out?.status||STATUS.OK;state.results.push(makeResult(category,name,status,detail,out?.meta||{}));}
    catch(error){state.results.push(makeResult(category,name,critical?STATUS.ERROR:STATUS.WARN,error?.message||error));}
    render();
  }

  async function testSession(){
    const {data,error}=await supabaseClient.auth.getSession();
    if(error||!data.session) throw new Error("No hay una sesión activa");
    return data.session.user.email||data.session.user.id;
  }
  async function testProfile(){
    const {data:{user},error:userError}=await supabaseClient.auth.getUser(); if(userError||!user) throw new Error("No se pudo identificar al usuario");
    const {data,error}=await supabaseClient.from("profiles").select("id,rol,activo").eq("id",user.id).single();
    if(error||!data) throw new Error("No existe el perfil asociado");
    if(!data.activo) throw new Error("El perfil está inactivo");
    if(!ROLE_SET.includes(String(data.rol).toLowerCase())) throw new Error(`Rol no reconocido: ${data.rol}`);
    state.context={user,perfil:data}; return `Rol activo: ${data.rol}`;
  }
  async function testSupabase(){
    const {error,count}=await supabaseClient.from("profiles").select("id",{head:true,count:"exact"});
    if(error) throw new Error(error.message); return `Conexión correcta${Number.isFinite(count)?` · ${count} perfiles`:""}`;
  }
  async function testTable(module){
    const {error}=await supabaseClient.from(module.table).select(module.columns,{head:true,count:"exact"}).limit(1);
    if(error) throw new Error(`${module.table}: ${error.message}`); return `${module.table} accesible con columnas mínimas`;
  }
  async function inspectModule(module){
    const html=await fetchText(pageUrl(module.page));
    const doc=parseHtml(html);
    const scriptText=await fetchText(scriptUrl(module.script));
    const missingIds=module.required.filter(id=>!doc.getElementById(id));
    if(missingIds.length) throw new Error(`Controles ausentes: ${missingIds.join(", ")}`);
    const disconnected=module.actions.filter(id=>!scriptText.includes(id) && !doc.getElementById(id)?.getAttribute("onclick"));
    if(disconnected.length) return {status:STATUS.WARN,detail:`Estructura correcta; revisar enlace JS de: ${disconnected.join(", ")}`};
    return `${module.required.length} controles esenciales y ${module.actions.length} acciones conectadas`;
  }
  async function inspectAssets(module){
    const html=await fetchText(pageUrl(module.page)); const doc=parseHtml(html);
    const assets=[...doc.querySelectorAll('script[src],link[rel="stylesheet"][href]')].map(n=>n.getAttribute("src")||n.getAttribute("href")).filter(u=>u&&!/^https?:/i.test(u));
    const failed=[];
    for(const asset of assets){try{await fetchText(asset);}catch(e){failed.push(asset);}}
    if(failed.length) throw new Error(`Recursos inexistentes: ${failed.join(", ")}`);
    if(!html.includes("ada-security.js")) throw new Error("La página no carga ada-security.js");
    return `${assets.length} recursos locales disponibles y control de seguridad cargado`;
  }
  async function inspectLinks(module){
    const html=await fetchText(pageUrl(module.page)); const doc=parseHtml(html);
    const links=[...doc.querySelectorAll('a[href]')].map(a=>a.getAttribute("href")).filter(h=>h&&/\.html(?:$|[?#])/.test(h)&&!/^https?:/i.test(h));
    const failed=[];
    for(const link of [...new Set(links)]){const clean=link.split(/[?#]/)[0];try{await fetchText(clean);}catch(e){failed.push(link);}}
    if(failed.length) throw new Error(`Enlaces rotos: ${failed.join(", ")}`);
    return `${links.length} enlaces internos verificados`;
  }
  async function inspectText(module){
    const html=await fetchText(pageUrl(module.page)); const js=await fetchText(scriptUrl(module.script));
    const hits=[];
    for(const [type,text] of [["HTML",html],["JS",js]]){const match=text.match(PLACEHOLDER_RX);if(match)hits.push(`${type}: “${match[0]}”`);}
    if(hits.length) return {status:STATUS.WARN,detail:`Texto provisorio detectado: ${hits.join(" · ")}`};
    return "Sin textos de prueba o marcadores internos detectables";
  }
  function testPermissions(module){
    const declared=window.ADA_PAGE_ACCESS?.[module.page];
    if(!Array.isArray(declared)) throw new Error("Página sin regla explícita en ADA_PAGE_ACCESS");
    const expected=[...module.roles].sort(); const actual=[...declared].sort();
    const same=expected.length===actual.length&&expected.every((v,i)=>v===actual[i]);
    if(!same) throw new Error(`Esperado: ${expected.join(", ")} · Declarado: ${actual.join(", ")}`);
    const missingModule=module.roles.filter(role=>!(window.ADA_ROLE_MODULES?.[role]||[]).includes(module.key));
    if(missingModule.length) return {status:STATUS.WARN,detail:`Acceso URL correcto; módulo no visible en menú para: ${missingModule.join(", ")}`};
    return `Permisos coherentes para ${actual.join(", ")}`;
  }
  async function testExport(module){
    const html=await fetchText(pageUrl(module.page)); const js=await fetchText(scriptUrl(module.script));
    const joined=`${html}\n${js}`;
    const signals=["ADAExport","PDF","Pdf","pdf","Exportar","exportar","CSV","csv"];
    if(!signals.some(s=>joined.includes(s))) return {status:STATUS.WARN,detail:"No se detectó una exportación contextual en este módulo"};
    return "Se detectó al menos una exportación contextual";
  }
  async function testWorkflow(flow){
    const docs={}; const scripts={};
    for(const key of flow.modules){const module=MODULES.find(m=>m.key===key);docs[key]=parseHtml(await fetchText(pageUrl(module.page)));scripts[key]=await fetchText(scriptUrl(module.script));}
    const missing=[];
    for(const id of flow.checks){const present=Object.values(docs).some(d=>d.getElementById(id));const referenced=Object.values(scripts).some(s=>s.includes(id));if(!present||!referenced)missing.push(`${id}${!present?" (HTML)":""}${!referenced?" (JS)":""}`);}
    if(missing.length) throw new Error(`Puntos del circuito sin conexión verificable: ${missing.join(", ")}`);
    const roleProblems=[];
    for(const role of flow.roles){const hasSome=flow.modules.some(key=>{const m=MODULES.find(x=>x.key===key);return (window.ADA_PAGE_ACCESS?.[m.page]||[]).includes(role);});if(!hasSome)roleProblems.push(role);}
    if(roleProblems.length) throw new Error(`Roles sin acceso al circuito: ${roleProblems.join(", ")}`);
    return `${flow.checks.length} puntos funcionales conectados · roles: ${flow.roles.join(", ")}`;
  }
  async function testJsSyntax(module){
    const text=await fetchText(scriptUrl(module.script));
    try{new Function(text);}catch(error){throw new Error(`${module.script}: ${error.message}`);}
    return `${module.script} compila sin errores de sintaxis`;
  }
  async function testSecurityDefaults(){
    const sec=await fetchText("../assets/js/ada-security.js");
    if(!sec.includes("ADA_PAGE_ACCESS")) throw new Error("No se encontró el mapa de páginas");
    if(!sec.includes("ADA_ROLE_MODULES")) throw new Error("No se encontró el mapa de módulos");
    const pages=MODULES.map(m=>m.page);const missing=pages.filter(p=>!window.ADA_PAGE_ACCESS?.[p]);if(missing.length)throw new Error(`Páginas académicas sin regla: ${missing.join(", ")}`);
    return "Mapas de páginas y módulos disponibles; páginas académicas declaradas";
  }
  async function testExportEngine(){
    const text=await fetchText("../assets/js/ada-export.js");
    if(!text.includes("window.ADAExport")) throw new Error("ada-export.js no publica ADAExport");
    try{new Function(text);}catch(e){throw new Error(`Error de sintaxis: ${e.message}`);}
    return "Motor de exportación disponible y válido";
  }

  async function run(){
    if(state.running)return; state.running=true; state.results=[]; cache.clear();
    $("qaAcRun").disabled=true; $("qaAcExport").disabled=true; $("qaAcExportCsv").disabled=true; $("qaAcStatus").textContent="Ejecutando controles estructurales, de permisos, datos y flujos…"; render();
    await runCheck("Base","Sesión autenticada",testSession);
    await runCheck("Base","Perfil activo y rol reconocido",testProfile);
    await runCheck("Base","Conexión de lectura con Supabase",testSupabase);
    await runCheck("Seguridad","Denegación y reglas académicas declaradas",testSecurityDefaults);
    await runCheck("Exportaciones","Motor contextual de PDF/CSV",testExportEngine,false);

    for(const module of MODULES){
      const label=module.key.charAt(0).toUpperCase()+module.key.slice(1);
      await runCheck("Datos",`${label}: tabla y columnas`,()=>testTable(module));
      await runCheck("Estructura",`${label}: controles y acciones`,()=>inspectModule(module));
      await runCheck("Recursos",`${label}: archivos y seguridad`,()=>inspectAssets(module));
      await runCheck("Navegación",`${label}: enlaces internos`,()=>inspectLinks(module),false);
      await runCheck("Permisos",`${label}: matriz por rol`,()=>testPermissions(module));
      await runCheck("Calidad",`${label}: textos provisorios`,()=>inspectText(module),false);
      await runCheck("Exportaciones",`${label}: documento contextual`,()=>testExport(module),false);
      await runCheck("Código",`${label}: sintaxis JavaScript`,()=>testJsSyntax(module));
    }
    for(const flow of WORKFLOWS) await runCheck("Flujos",flow.name,()=>testWorkflow(flow));

    state.running=false; $("qaAcRun").disabled=false; $("qaAcExport").disabled=false; $("qaAcExportCsv").disabled=false; render();
    const counts=count(); $("qaAcStatus").textContent=counts.error?`Control finalizado con ${counts.error} error(es) y ${counts.warn} advertencia(s).`:`Control finalizado sin errores: ${counts.ok} verificaciones correctas y ${counts.warn} advertencia(s).`;
  }

  function count(){return state.results.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{ok:0,warn:0,error:0,info:0});}
  function render(){
    const c=count(); $("qaAcTotal").textContent=state.results.length; $("qaAcOk").textContent=c.ok; $("qaAcWarn").textContent=c.warn; $("qaAcError").textContent=c.error;
    const filter=$("qaAcFilter")?.value||"all"; const category=$("qaAcCategory")?.value||"all";
    const visible=state.results.filter(r=>(filter==="all"||r.status===filter)&&(category==="all"||r.category===category));
    $("qaAcList").innerHTML=visible.map(r=>`<article class="qa-ac-item is-${esc(r.status)}"><div class="qa-ac-icon">${r.status===STATUS.OK?"✓":r.status===STATUS.WARN?"!":"×"}</div><div class="qa-ac-copy"><span class="qa-ac-category">${esc(r.category)}</span><strong>${esc(r.name)}</strong><div class="qa-ac-detail">${esc(r.detail)}</div></div><time>${new Date(r.time).toLocaleTimeString("es-AR")}</time></article>`).join("")||'<div class="qa-ac-empty">No hay resultados para este filtro.</div>';
    const percent=state.results.length?Math.round(((c.ok+c.warn*.5)/state.results.length)*100):0; $("qaAcScore").textContent=`${percent}%`; $("qaAcProgress").style.width=`${percent}%`;
  }
  function downloadJson(){const payload={generatedAt:now(),application:"ADA Cloud",scope:"Gestión Académica",summary:count(),results:state.results};save(JSON.stringify(payload,null,2),`ADA_QA_INTEGRAL_${now().slice(0,10)}.json`,`application/json`);}
  function downloadCsv(){const rows=[["Categoría","Control","Estado","Detalle","Fecha"],...state.results.map(r=>[r.category,r.name,r.status,r.detail,r.time])];const text=rows.map(row=>row.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");save("\ufeff"+text,`ADA_QA_INTEGRAL_${now().slice(0,10)}.csv`,`text/csv;charset=utf-8`);}
  function save(content,name,type){const blob=new Blob([content],{type});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}

  document.addEventListener("DOMContentLoaded",async()=>{
    const ctx=await adaRequirePageAccess(["admin","directivo"]); if(!ctx)return; state.context=ctx;
    $("qaAcRun").addEventListener("click",run); $("qaAcExport").addEventListener("click",downloadJson); $("qaAcExportCsv").addEventListener("click",downloadCsv);
    $("qaAcFilter").addEventListener("change",render); $("qaAcCategory").addEventListener("change",render);
    render();
  },{once:true});
})();
