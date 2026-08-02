(function(){
  "use strict";

  const $ = (id) => document.getElementById(id);
  const STATUS = { OK:"ok", WARN:"warn", ERROR:"error", SKIPPED:"skipped" };
  const state = { results:[], running:false, stopped:false, current:0, totalPlanned:0, context:null };
  const cache = new Map();
  const HISTORY_KEY = "ada_test_center_history_v1";
  const PLACEHOLDER_RX = /\b(ac[aá]\s+va|demo|todo|fixme|pr[oó]ximamente|en\s+construcci[oó]n|sin\s+implementar|pendiente\s+de\s+implementar|bloque\s+\d+)\b/i;

  const MODULES = [
    {key:"programas",label:"Programas",page:"programas.html",script:"programas.js",table:"programas_materia",columns:"id,curso_id,materia_id,estado",roles:["admin","directivo","docente","alumno","familia"],required:["formPrograma","programaCurso","programaMateria","programaTitulo","listaProgramas"],actions:["formPrograma","btnFiltrar"],exports:["PDF","pdf","export"]},
    {key:"planificaciones",label:"Planificaciones",page:"planificaciones.html",script:"planificaciones.js",table:"planificaciones_didacticas",columns:"id,curso_id,materia_id,estado",roles:["admin","directivo","docente","alumno","familia"],required:["planForm","planCurso","planMateria","planTitulo","planLista"],actions:["planForm","planBtnFiltrar"],exports:["PDF","pdf","export"]},
    {key:"actividades",label:"Actividades",page:"actividades.html",script:"actividades.js",table:"actividades",columns:"id,curso_id,materia_id,estado",roles:["admin","directivo","docente","alumno"],required:["formActividad","actividadCurso","actividadMateria","actividadTitulo","listaActividades"],actions:["formActividad","btnFiltrar"],exports:["PDF","pdf","export"]},
    {key:"entregas",label:"Entregas",page:"entregas.html",script:"entregas.js",table:"entregas_actividades",columns:"id,actividad_id,alumno_id,estado",roles:["admin","directivo","docente","alumno"],required:["listaEntregas","formEntrega","formRevision"],actions:["formEntrega","formRevision"],exports:["PDF","pdf","export"]},
    {key:"asistencia",label:"Asistencia",page:"asistencia.html",script:"asistencia.js",table:"asistencia_registros",columns:"id,alumno_id",roles:["admin","directivo","secretaria","docente","preceptor"],required:["formClaseAsistencia","asistenciaCurso","asistenciaFecha","listaAlumnosAsistencia","tablaHistorial"],actions:["btnCargarAlumnos","formGuardarAsistencia"],exports:["PDF","pdf","export"]},
    {key:"calificaciones",label:"Calificaciones",page:"calificaciones.html",script:"calificaciones.js",table:"planilla_docente_notas",columns:"id",roles:["admin","directivo","secretaria","docente"],required:["cursoSelect","materiaSelect","btnCargarPlanilla","tablaPrimer","tablaSegundo"],actions:["btnCargarPlanilla","btnEnviarSecretaria"],exports:["PDF","Excel","export"]},
    {key:"boletines",label:"Boletines",page:"boletines.html",script:"boletines.js",table:"boletines",columns:"id,alumno_id,estado",roles:["admin","directivo","secretaria","alumno","familia"],required:["formBoletin","boletinAlumno","boletinPeriodo","tablaBoletines"],actions:["formBoletin","btnBuscarBoletines"],exports:["PDF","pdf","export"]},
    {key:"cierres",label:"Cierres académicos",page:"cierres-academicos.html",script:"cierres-academicos.js",table:"cierres_academicos",columns:"id,curso_id,materia_id,estado",roles:["admin","directivo","secretaria"],required:["formCierre","cierreCurso","cierreMateria","tablaCierres"],actions:["formCierre","btnGenerarActa"],exports:["PDF","pdf","export"]},
    {key:"reportes",label:"Reportes",page:"reportes.html",script:"reportes.js",table:"profiles",columns:"id,rol,activo",roles:["admin","directivo","secretaria","docente","preceptor"],required:["btnReporteAsistencia","tablaAsistencia","btnReporteSeguimiento","tablaSeguimiento"],actions:["btnReporteAsistencia","btnReporteSeguimiento"],exports:["PDF","CSV","export"]}
  ];

  const WORKFLOWS = [
    {key:"programas",name:"Programa: borrador → revisión → aprobación → consulta",modules:["programas"],states:["borrador","revision","observado","aprobado"],roles:["docente","directivo","alumno","familia"]},
    {key:"planificaciones",name:"Planificación: borrador → revisión → aprobación",modules:["planificaciones"],states:["borrador","revision","observado","aprobado"],roles:["docente","directivo"]},
    {key:"actividades",name:"Actividad: publicación → entrega → corrección",modules:["actividades","entregas"],states:["borrador","publicada","entregada","corregida"],roles:["docente","alumno"]},
    {key:"calificaciones",name:"Calificaciones: carga → envío → control → publicación",modules:["calificaciones","cierres"],states:["borrador","enviada","cerrada","publicada"],roles:["docente","secretaria","directivo"]},
    {key:"boletines",name:"Boletín: borrador → revisión → emisión → consulta",modules:["boletines"],states:["borrador","revision","observado","emitido"],roles:["secretaria","directivo","alumno","familia"]},
    {key:"asistencia",name:"Asistencia: toma → historial → alertas → consulta",modules:["asistencia"],states:["presente","ausente","tarde","justificada"],roles:["docente","preceptor","directivo","familia","alumno"]}
  ];

  const SUITES = [
    {key:"base",label:"Base y sesión",description:"Autenticación, perfil, conexión y versión del cliente.",runner:runBaseSuite},
    {key:"datos",label:"Base de datos",description:"Tablas, columnas mínimas, lectura y evidencias de estados.",runner:runDataSuite},
    {key:"seguridad",label:"Seguridad y permisos",description:"Reglas explícitas, roles, denegación por defecto y menús.",runner:runSecuritySuite},
    {key:"estructura",label:"Páginas y controles",description:"Páginas, controles esenciales y acciones conectadas.",runner:runStructureSuite},
    {key:"recursos",label:"Recursos y navegación",description:"CSS, JavaScript y enlaces internos disponibles.",runner:runResourcesSuite},
    {key:"codigo",label:"Calidad de código",description:"Sintaxis, textos internos y duplicaciones evidentes.",runner:runCodeSuite},
    {key:"exportaciones",label:"Exportaciones",description:"Disponibilidad de PDF, CSV o Excel contextual.",runner:runExportsSuite},
    {key:"flujos",label:"Flujos académicos",description:"Integración, estados y evidencia funcional existente.",runner:runWorkflowSuite},
    {key:"interfaz",label:"Interfaz y accesibilidad",description:"Responsive básico, etiquetas, botones y estados vacíos.",runner:runInterfaceSuite}
  ];

  function esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function now(){return new Date().toISOString();}
  function normalize(value){return String(value??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");}
  function relativePage(file){return file;}
  function relativeScript(file){return `../assets/js/${file}`;}
  async function fetchText(path){
    if(cache.has(path)) return cache.get(path);
    const response=await fetch(path,{cache:"no-store"});
    if(!response.ok) throw new Error(`HTTP ${response.status} al abrir ${path}`);
    const text=await response.text(); cache.set(path,text); return text;
  }
  function parseHtml(text){return new DOMParser().parseFromString(text,"text/html");}
  function selectedSuites(){return [...document.querySelectorAll('.qa-suite-checkbox:checked')].map(el=>el.value);}
  function result(suite,name,status,detail,meta={}){
    state.results.push({suite,name,status,detail:String(detail||""),time:now(),...meta});
    state.current += 1; updateProgress(); renderResults();
  }
  async function check(suite,name,fn,{critical=true}={}){
    if(state.stopped) return;
    try{
      const out=await fn();
      if(out && typeof out==="object" && out.status){result(suite,name,out.status,out.detail||"Correcto",out.meta||{});}
      else result(suite,name,STATUS.OK,typeof out==="string"?out:"Correcto");
    }catch(error){result(suite,name,critical?STATUS.ERROR:STATUS.WARN,error?.message||String(error));}
  }

  function countPlanned(keys){
    let count=0;
    for(const key of keys){
      if(key==="base") count+=4;
      if(key==="datos") count+=MODULES.length*2;
      if(key==="seguridad") count+=6+MODULES.length;
      if(key==="estructura") count+=MODULES.length*2;
      if(key==="recursos") count+=MODULES.length*2;
      if(key==="codigo") count+=MODULES.length*2;
      if(key==="exportaciones") count+=MODULES.length;
      if(key==="flujos") count+=WORKFLOWS.length*2;
      if(key==="interfaz") count+=MODULES.length*2;
    }
    return Math.max(count,1);
  }

  async function runBaseSuite(){
    await check("Base","Sesión autenticada",async()=>{
      const {data,error}=await supabaseClient.auth.getSession();
      if(error||!data.session) throw new Error("No hay una sesión activa");
      state.context={session:data.session}; return data.session.user.email||data.session.user.id;
    });
    await check("Base","Perfil activo",async()=>{
      const user=state.context?.session?.user; if(!user) throw new Error("No se pudo identificar al usuario");
      const {data,error}=await supabaseClient.from("profiles").select("id,rol,activo").eq("id",user.id).single();
      if(error||!data) throw new Error("No existe el perfil asociado");
      if(!data.activo) throw new Error("El perfil está inactivo");
      state.context.profile=data; return `Rol: ${data.rol}`;
    });
    await check("Base","Conexión con Supabase",async()=>{
      const {error,count}=await supabaseClient.from("profiles").select("id",{head:true,count:"exact"});
      if(error) throw new Error(error.message); return `Conexión correcta${Number.isFinite(count)?` · ${count} perfiles`:""}`;
    });
    await check("Base","Cliente Supabase disponible",async()=>{
      if(typeof supabaseClient === "undefined" || !supabaseClient?.auth || typeof supabaseClient.from !== "function") throw new Error("supabaseClient no está disponible");
      return "Cliente inicializado";
    });
  }

  async function runDataSuite(){
    for(const module of MODULES){
      await check("Datos",`Tabla ${module.table}`,async()=>{
        const {error,count}=await supabaseClient.from(module.table).select(module.columns,{head:true,count:"exact"}).limit(1);
        if(error) throw new Error(error.message); return `${module.columns.split(',').length} columnas mínimas · ${Number.isFinite(count)?count:"?"} registros visibles`;
      });
      await check("Datos",`Evidencia de datos en ${module.label}`,async()=>{
        const {data,error}=await supabaseClient.from(module.table).select("*").limit(20);
        if(error) throw new Error(error.message);
        if(!data?.length) return {status:STATUS.WARN,detail:"Tabla accesible, sin registros visibles para comprobar el flujo"};
        return `${data.length} registros de muestra disponibles`;
      },{critical:false});
    }
  }

  async function runSecuritySuite(){
    await check("Seguridad","Matriz de páginas disponible",async()=>{
      if(typeof ADA_PAGE_ACCESS==="undefined") throw new Error("ADA_PAGE_ACCESS no está disponible");
      return `${Object.keys(ADA_PAGE_ACCESS).length} páginas con regla`;
    });
    await check("Seguridad","Matriz de módulos por rol",async()=>{
      if(typeof ADA_ROLE_MODULES==="undefined") throw new Error("ADA_ROLE_MODULES no está disponible");
      const roles=["admin","directivo","secretaria","docente","preceptor","alumno","familia"];
      const missing=roles.filter(r=>!Array.isArray(ADA_ROLE_MODULES[r]));
      if(missing.length) throw new Error(`Roles sin matriz: ${missing.join(', ')}`);
      return "Siete roles declarados";
    });
    await check("Seguridad","Denegación por defecto",async()=>{
      const source=await fetchText("../assets/js/ada-security.js");
      if(!/allowedRoles|ADA_PAGE_ACCESS/.test(source)) throw new Error("No se detectó validación de página");
      if(/if\s*\(allowedRoles\s*&&/.test(source)) return {status:STATUS.WARN,detail:"Revisar: una regla inexistente podría no bloquear por defecto"};
      return "La seguridad valida reglas explícitas";
    });
    await check("Seguridad","Página Test Center restringida",async()=>{
      const roles=ADA_PAGE_ACCESS?.["qa-academica.html"]||[];
      if(!roles.includes("admin")||!roles.includes("directivo")) throw new Error("Debe admitir Admin y Directivo");
      if(roles.some(r=>!["admin","directivo"].includes(r))) throw new Error(`Rol indebido: ${roles.join(', ')}`);
      return "Acceso limitado a Administración y Dirección";
    });
    await check("Seguridad","Credenciales no expuestas",async()=>{
      const sources=await Promise.all([fetchText("../assets/js/supabase-config.js"),fetchText("../assets/js/ada-security.js")]);
      const joined=sources.join("\n")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      const privileged = [
        /(?:service[_-]?role|secret[_-]?key)\s*[:=]\s*["'][^"']{12,}["']/i,
        /sb_secret_[A-Za-z0-9._-]{12,}/i,
        /(?:DATABASE_URL|POSTGRES_PASSWORD|SUPABASE_DB_PASSWORD)\s*[:=]\s*["'][^"']+["']/i
      ];
      if(privileged.some(rx=>rx.test(joined))) throw new Error("Se detectó una credencial privilegiada hardcodeada");
      const config=await fetchText("../assets/js/supabase-config.js");
      if(!/SUPABASE_(?:ANON|PUBLISHABLE)_KEY/i.test(config)) return {status:STATUS.WARN,detail:"No se identificó una clave pública de navegador"};
      return "Solo se detectó configuración pública de navegador; no hay secretos privilegiados";
    });
    await check("Seguridad","Roles académicos coherentes",async()=>{
      const inconsistencies=[];
      for(const m of MODULES){
        const declared=ADA_PAGE_ACCESS?.[m.page]||[];
        for(const role of m.roles){if(!declared.includes(role)) inconsistencies.push(`${m.page}: falta ${role}`);}
      }
      if(inconsistencies.length) throw new Error(inconsistencies.slice(0,6).join(" · "));
      return "Roles esperados presentes en las páginas académicas";
    });
    for(const module of MODULES){
      await check("Seguridad",`Permisos declarados: ${module.label}`,async()=>{
        const actual=ADA_PAGE_ACCESS?.[module.page];
        if(!Array.isArray(actual)) throw new Error("Página sin regla explícita");
        const extra=actual.filter(r=>!module.roles.includes(r));
        if(extra.length) return {status:STATUS.WARN,detail:`Roles adicionales a revisar: ${extra.join(', ')}`};
        return actual.join(", ");
      },{critical:false});
    }
  }

  async function runStructureSuite(){
    for(const module of MODULES){
      await check("Estructura",`Página ${module.page}`,async()=>{
        const html=await fetchText(relativePage(module.page));
        const doc=parseHtml(html);
        if(!doc.querySelector('meta[name="viewport"]')) return {status:STATUS.WARN,detail:"Página disponible, falta meta viewport"};
        if(!html.includes("ada-security.js")) throw new Error("No carga ada-security.js");
        return "Página disponible y protegida";
      });
      await check("Estructura",`Controles y acciones: ${module.label}`,async()=>{
        const html=await fetchText(relativePage(module.page));
        const doc=parseHtml(html);
        const js=await fetchText(relativeScript(module.script));
        const missing=module.required.filter(id=>!doc.getElementById(id));
        if(missing.length) throw new Error(`Controles ausentes: ${missing.join(', ')}`);
        const disconnected=module.actions.filter(id=>!js.includes(id)&&!doc.getElementById(id)?.getAttribute("onclick"));
        if(disconnected.length) return {status:STATUS.WARN,detail:`Revisar acciones: ${disconnected.join(', ')}`};
        return `${module.required.length} controles y ${module.actions.length} acciones conectadas`;
      });
    }
  }

  async function runResourcesSuite(){
    for(const module of MODULES){
      await check("Recursos",`Recursos locales: ${module.label}`,async()=>{
        const html=await fetchText(relativePage(module.page)); const doc=parseHtml(html);
        const assets=[...doc.querySelectorAll('script[src],link[rel="stylesheet"][href]')]
          .map(n=>n.getAttribute("src")||n.getAttribute("href"))
          .filter(u=>u&&!/^https?:/i.test(u));
        const failed=[];
        for(const asset of [...new Set(assets)]){try{await fetchText(asset);}catch(_){failed.push(asset);}}
        if(failed.length) throw new Error(`No disponibles: ${failed.join(', ')}`);
        return `${assets.length} recursos disponibles`;
      });
      await check("Navegación",`Enlaces internos: ${module.label}`,async()=>{
        const html=await fetchText(relativePage(module.page)); const doc=parseHtml(html);
        const links=[...doc.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>h&&/\.html(?:$|[?#])/.test(h)&&!/^https?:/i.test(h));
        const failed=[];
        for(const link of [...new Set(links)]){try{await fetchText(link.split(/[?#]/)[0]);}catch(_){failed.push(link);}}
        if(failed.length) throw new Error(`Enlaces rotos: ${failed.join(', ')}`);
        return `${links.length} enlaces verificados`;
      });
    }
  }

  async function runCodeSuite(){
    for(const module of MODULES){
      await check("Código",`Sintaxis JavaScript: ${module.script}`,async()=>{
        const js=await fetchText(relativeScript(module.script));
        try{new Function(js);}catch(error){throw new Error(error.message);}
        return "Sintaxis válida";
      });
      await check("Calidad",`Textos internos: ${module.label}`,async()=>{
        const html=await fetchText(relativePage(module.page)); const js=await fetchText(relativeScript(module.script));
        const hits=[];
        for(const [kind,text] of [["HTML",html],["JS",js]]){const match=text.match(PLACEHOLDER_RX);if(match) hits.push(`${kind}: “${match[0]}”`);}
        if(hits.length) return {status:STATUS.WARN,detail:hits.join(" · ")};
        return "Sin textos provisorios detectados";
      },{critical:false});
    }
  }

  async function runExportsSuite(){
    for(const module of MODULES){
      await check("Exportaciones",`Exportación contextual: ${module.label}`,async()=>{
        const html=await fetchText(relativePage(module.page)); const js=await fetchText(relativeScript(module.script));
        const source=`${html}\n${js}`;
        const found=module.exports.filter(token=>new RegExp(token,"i").test(source));
        if(!found.length) return {status:STATUS.WARN,detail:"No se detectó exportación PDF, CSV o Excel"};
        if(/Guardar PDF/i.test(html)&&/position\s*:\s*fixed/i.test(source)) return {status:STATUS.WARN,detail:"Se detectó un botón PDF global; revisar exportación contextual"};
        return `Formato(s) detectado(s): ${[...new Set(found.map(v=>v.toUpperCase()))].join(', ')}`;
      },{critical:false});
    }
  }

  async function collectStates(table){
    const {data,error}=await supabaseClient.from(table).select("estado").limit(500);
    if(error) throw new Error(error.message);
    const counts={};
    for(const row of data||[]){const key=normalize(row.estado||"sin estado");counts[key]=(counts[key]||0)+1;}
    return counts;
  }

  async function runWorkflowSuite(){
    for(const workflow of WORKFLOWS){
      await check("Flujos",`Integración estructural: ${workflow.name}`,async()=>{
        const modules=workflow.modules.map(key=>MODULES.find(m=>m.key===key)).filter(Boolean);
        if(modules.length!==workflow.modules.length) throw new Error("Módulo no registrado en Test Center");
        const missing=modules.filter(m=>!ADA_PAGE_ACCESS?.[m.page]);
        if(missing.length) throw new Error(`Sin regla: ${missing.map(m=>m.page).join(', ')}`);
        const rolePortal = {
          alumno: "mi-espacio-alumno.html",
          familia: "mi-espacio-familia.html",
          docente: "mi-espacio-docente.html",
          preceptor: "mi-espacio-preceptor.html"
        };
        const roleMissing=workflow.roles.filter(role=>{
          const direct=modules.some(m=>(ADA_PAGE_ACCESS[m.page]||[]).includes(role));
          const portal=rolePortal[role];
          const viaPortal=portal && Array.isArray(ADA_PAGE_ACCESS?.[portal]) && ADA_PAGE_ACCESS[portal].includes(role);
          return !direct && !viaPortal;
        });
        if(roleMissing.length) return {status:STATUS.WARN,detail:`Roles sin punto de acceso en el circuito: ${roleMissing.join(', ')}`};
        return `${modules.length} módulo(s), ${workflow.roles.length} roles y puntos de acceso conectados`;
      });
      await check("Flujos",`Evidencia funcional: ${workflow.name}`,async()=>{
        const evidence=[];
        for(const key of workflow.modules){
          const module=MODULES.find(m=>m.key===key); if(!module) continue;
          try{
            const states=await collectStates(module.table);
            const total=Object.values(states).reduce((a,b)=>a+b,0);
            evidence.push(`${module.label}: ${total} registros${total?` (${Object.entries(states).slice(0,5).map(([k,v])=>`${k}:${v}`).join(', ')})`:""}`);
          }catch(error){
            const {count,error:countError}=await supabaseClient.from(module.table).select("id",{head:true,count:"exact"});
            if(countError) throw error;
            evidence.push(`${module.label}: ${count||0} registros`);
          }
        }
        const hasRecords=evidence.some(text=>!/\: 0 registros/.test(text));
        if(!hasRecords) return {status:STATUS.SKIPPED,detail:`Sin datos de prueba para certificar transiciones. ${evidence.join(' · ')}`};
        return evidence.join(" · ");
      },{critical:false});
    }
  }

  async function runInterfaceSuite(){
    for(const module of MODULES){
      await check("Interfaz",`Accesibilidad básica: ${module.label}`,async()=>{
        const html=await fetchText(relativePage(module.page)); const doc=parseHtml(html);
        const buttons=[...doc.querySelectorAll('button')];
        const unnamed=buttons.filter(b=>!(b.textContent||"").trim()&&!b.getAttribute('aria-label')&&!b.getAttribute('title'));
        const inputs=[...doc.querySelectorAll('input,select,textarea')];
        const unlabeled=inputs.filter(input=>{
          if(input.type==="hidden") return false;
          return !input.getAttribute('aria-label')&&!input.id&&!input.closest('label');
        });
        if(unnamed.length||unlabeled.length) return {status:STATUS.WARN,detail:`Botones sin nombre: ${unnamed.length} · Controles sin etiqueta: ${unlabeled.length}`};
        return `${buttons.length} botones y ${inputs.length} controles revisados`;
      },{critical:false});
      await check("Interfaz",`Responsive: ${module.label}`,async()=>{
        const html=await fetchText(relativePage(module.page)); const doc=parseHtml(html);
        if(!doc.querySelector('meta[name="viewport"]')) throw new Error("Falta meta viewport");
        const inlineFixed=[...doc.querySelectorAll('[style]')].filter(el=>/width\s*:\s*[1-9]\d{3,}px/i.test(el.getAttribute('style')||""));
        if(inlineFixed.length) return {status:STATUS.WARN,detail:`Hay ${inlineFixed.length} anchos fijos grandes en línea`};
        return "Viewport y estructura responsive disponibles";
      },{critical:false});
    }
  }

  function suiteByKey(key){return SUITES.find(s=>s.key===key);}
  async function runSelected(){
    if(state.running) return;
    const keys=selectedSuites();
    if(!keys.length){$("qaStatus").textContent="Seleccioná al menos una suite.";return;}
    state.results=[];state.running=true;state.stopped=false;state.current=0;state.totalPlanned=countPlanned(keys);state.context=null;
    setRunningUi(true); renderResults(); updateProgress();
    $("qaStatus").textContent="Ejecutando control automático...";
    for(const key of keys){if(state.stopped) break;const suite=suiteByKey(key);if(!suite) continue;$("qaStatus").textContent=`Ejecutando: ${suite.label}`;await suite.runner();}
    state.running=false;setRunningUi(false);renderResults();updateProgress();saveHistory();renderHistory();
    $("qaStatus").textContent=state.stopped?"Ejecución detenida.":"Control finalizado.";
  }

  function setRunningUi(running){
    $("qaRunAll").disabled=running;$("qaStop").disabled=!running;$("qaExportJson").disabled=running||!state.results.length;$("qaExportCsv").disabled=running||!state.results.length;$("qaPrintReport").disabled=running||!state.results.length;
    document.body.classList.toggle("qa-running",running);
  }
  function updateProgress(){
    const pct=state.running?Math.min(99,Math.round(state.current/state.totalPlanned*100)):score();
    $("qaProgress").style.width=`${pct}%`;
  }
  function score(){
    const relevant=state.results.filter(r=>r.status!==STATUS.SKIPPED);if(!relevant.length)return 0;
    const points=relevant.reduce((sum,r)=>sum+(r.status===STATUS.OK?1:r.status===STATUS.WARN?.5:0),0);
    return Math.round(points/relevant.length*100);
  }
  function summary(){
    return {
      total:state.results.length,
      ok:state.results.filter(r=>r.status===STATUS.OK).length,
      warn:state.results.filter(r=>r.status===STATUS.WARN).length,
      error:state.results.filter(r=>r.status===STATUS.ERROR).length,
      skipped:state.results.filter(r=>r.status===STATUS.SKIPPED).length,
      score:score()
    };
  }
  function certification(s){
    if(!s.total) return "Sin ejecutar";
    if(s.error>0) return "NO CERTIFICADO";
    if(s.warn>0) return "CERTIFICACIÓN CONDICIONAL";
    return "CERTIFICADO";
  }
  function renderResults(){
    const s=summary();
    $("qaTotal").textContent=s.total;$("qaOk").textContent=s.ok;$("qaWarn").textContent=s.warn;$("qaError").textContent=s.error;$("qaSkipped").textContent=s.skipped;$("qaScore").textContent=`${s.score}%`;$("qaCertification").textContent=certification(s);
    const status=$("qaFilterStatus").value;const suite=$("qaFilterSuite").value;const query=normalize($("qaSearch").value);
    const filtered=state.results.filter(r=>(status==="all"||r.status===status)&&(suite==="all"||r.suite===suite)&&(!query||normalize(`${r.name} ${r.detail}`).includes(query)));
    const root=$("qaResults");
    if(!filtered.length){root.innerHTML='<div class="qa-empty">No hay resultados para mostrar.</div>';return;}
    root.innerHTML=filtered.map(r=>{
      const icon={ok:"✓",warn:"!",error:"×",skipped:"–"}[r.status]||"•";
      return `<article class="qa-result ${esc(r.status)}"><div class="qa-result-icon">${icon}</div><div><h3>${esc(r.name)}</h3><p>${esc(r.detail)}</p></div><div class="qa-result-meta">${esc(r.suite)}<br>${new Date(r.time).toLocaleTimeString("es-AR")}</div></article>`;
    }).join("");
    renderWorkflowCards();
  }
  function renderWorkflowCards(){
    const root=$("qaWorkflowCards");
    root.innerHTML=WORKFLOWS.map(w=>{
      const rows=state.results.filter(r=>r.suite==="Flujos"&&r.name.includes(w.name));
      const pct=rows.length?Math.round(rows.reduce((n,r)=>n+(r.status===STATUS.OK?1:r.status===STATUS.WARN?.5:0),0)/rows.length*100):0;
      return `<article class="qa-workflow-card"><strong>${esc(w.name)}</strong><span>${rows.length?`${pct}% de evidencia automática`:'Pendiente de ejecución'}</span><div class="bar"><i style="width:${pct}%"></i></div></article>`;
    }).join("");
  }
  function renderSuites(){
    $("qaSuites").innerHTML=SUITES.map((s,index)=>`<label class="qa-suite-item"><input class="qa-suite-checkbox" type="checkbox" value="${esc(s.key)}" ${index<8?'checked':''}><span><strong>${esc(s.label)}</strong><small>${esc(s.description)}</small></span><span class="qa-suite-count">AUTO</span></label>`).join("");
    $("qaFilterSuite").innerHTML='<option value="all">Todas</option>'+SUITES.map(s=>`<option value="${esc(s.label)}">${esc(s.label)}</option>`).join("");
  }
  function toggleSuites(){
    const boxes=[...document.querySelectorAll('.qa-suite-checkbox')];const all=boxes.every(b=>b.checked);boxes.forEach(b=>b.checked=!all);$("qaToggleSuites").textContent=all?"Seleccionar todas":"Quitar selección";
  }
  function clearResults(){state.results=[];state.current=0;state.totalPlanned=0;state.stopped=false;setRunningUi(false);renderResults();updateProgress();$("qaStatus").textContent="Resultados limpiados.";}
  function download(name,mime,content){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function exportJson(){const payload={generatedAt:now(),summary:summary(),certification:certification(summary()),results:state.results};download(`ADA_TEST_CENTER_${new Date().toISOString().slice(0,10)}.json`,"application/json;charset=utf-8",JSON.stringify(payload,null,2));}
  function csvCell(value){return `"${String(value??"").replace(/"/g,'""')}"`;}
  function exportCsv(){const rows=[["Suite","Prueba","Estado","Detalle","Fecha"],...state.results.map(r=>[r.suite,r.name,r.status,r.detail,r.time])];download(`ADA_TEST_CENTER_${new Date().toISOString().slice(0,10)}.csv`,"text/csv;charset=utf-8","\uFEFF"+rows.map(row=>row.map(csvCell).join(",")).join("\n"));}
  function saveHistory(){
    if(!state.results.length)return;const item={date:now(),...summary(),certification:certification(summary())};let history=[];try{history=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");}catch(_){history=[];}history.unshift(item);localStorage.setItem(HISTORY_KEY,JSON.stringify(history.slice(0,10)));
  }
  function renderHistory(){
    let history=[];try{history=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");}catch(_){history=[];}
    $("qaHistory").innerHTML=history.length?history.map(h=>`<div class="qa-history-row"><div><strong>${new Date(h.date).toLocaleString("es-AR")}</strong><small>${esc(h.certification)}</small></div><span>${h.score}%</span><span>✓ ${h.ok}</span><span>! ${h.warn}</span><span>× ${h.error}</span></div>`).join(""):'<div class="qa-empty">Todavía no hay ejecuciones guardadas.</div>';
  }
  function clearHistory(){localStorage.removeItem(HISTORY_KEY);renderHistory();}

  function bind(){
    $("qaRunAll").addEventListener("click",runSelected);
    $("qaStop").addEventListener("click",()=>{state.stopped=true;$("qaStatus").textContent="Deteniendo al finalizar la prueba actual...";});
    $("qaClear").addEventListener("click",clearResults);
    $("qaExportJson").addEventListener("click",exportJson);
    $("qaExportCsv").addEventListener("click",exportCsv);
    $("qaPrintReport").addEventListener("click",()=>window.print());
    $("qaToggleSuites").addEventListener("click",toggleSuites);
    $("qaClearHistory").addEventListener("click",clearHistory);
    ["qaFilterStatus","qaFilterSuite","qaSearch"].forEach(id=>$(id).addEventListener(id==="qaSearch"?"input":"change",renderResults));
  }

  async function initTestCenter(){
    try {
      if (typeof window.adaRequirePageAccess !== "function") {
        throw new Error("No se pudo inicializar el control de acceso de ADA.");
      }

      const context = await window.adaRequirePageAccess(["admin", "directivo"]);
      if (!context) return;

      state.context = context;
      renderSuites();
      bind();
      renderResults();
      renderWorkflowCards();
      renderHistory();
    } catch (error) {
      console.error("[ADA TEST CENTER] Error de inicialización:", error);
      document.body.classList.remove("role-loading");
      document.body.classList.add("ada-page-ready");

      const shell = document.querySelector(".qa-center-shell");
      if (shell) {
        shell.innerHTML = `
          <section class="panel-card access-denied-card">
            <p class="eyebrow">ADA Test Center</p>
            <h1>No se pudo iniciar el control automático</h1>
            <p>La sesión o los permisos no pudieron verificarse correctamente.</p>
            <p class="helper-text">Actualizá la página. Si el problema continúa, cerrá sesión y volvé a ingresar como Administrador o Directivo.</p>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px;">
              <button class="btn-primary" type="button" onclick="window.location.reload()">Reintentar</button>
              <a class="btn-secondary" href="dashboard.html">Volver al inicio</a>
            </div>
          </section>`;
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTestCenter, { once: true });
  } else {
    initTestCenter();
  }
})();
