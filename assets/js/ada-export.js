(function(){
  "use strict";
  const PAGE_MAP = {
    "usuarios.html": { title:"Listado de usuarios", selectors:["#tablaUsuarios"] },
    "alumnos.html": { title:"Listado de alumnos", selectors:["#tablaUsuarios"] },
    "docentes.html": { title:"Listado de docentes", selectors:["#tablaUsuarios"] },
    "directivos.html": { title:"Listado de directivos", selectors:["#tablaUsuarios"] },
    "preceptoria.html": { title:"Listado de preceptoría", selectors:["#tablaUsuarios"] },
    "familias.html": { title:"Listado de familias", selectors:["#tablaUsuarios"] },
    "cursos.html": { title:"Estructura de cursos", selectors:["#tablaNiveles","#tablaAnios","#tablaDivisiones","#tablaModalidades","#tablaCursos"] },
    "materias.html": { title:"Listado de materias", selectors:["#tablaMaterias"] },
    "reportes.html": { title:"Reporte institucional", selectors:["#resumenAsistencia","#tablaAsistencia","#tablaSeguimiento","#tablaUsuariosReporte","#tablaDocumentosReporte","#tablaEstructuraReporte"] }
  };

  function esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
  function page(){return (location.pathname.split('/').pop()||'').toLowerCase();}
  function visible(el){return !!el && el.offsetParent!==null && (el.textContent||'').trim().length>0;}
  function cloneClean(el){
    const c=el.cloneNode(true);
    c.querySelectorAll('button,input,select,textarea,.no-export,[hidden]').forEach(n=>n.remove());
    c.querySelectorAll('a').forEach(a=>{ const span=document.createElement('span'); span.innerHTML=a.innerHTML; a.replaceWith(span); });
    return c.outerHTML;
  }
  function institution(){return document.querySelector('[data-institution-name]')?.textContent?.trim()||'ADA Cloud';}
  function openDocument(title,body){
    if(!window.ADA_PDF){ alert('El motor PDF de ADA no está disponible. Recargá la página.'); return; }
    window.ADA_PDF.fromHTML(title,body,{institution:institution(),filename:`${title.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`});
  }
  function exportMapped(){
    const cfg=PAGE_MAP[page()]; if(!cfg)return;
    const blocks=cfg.selectors.map(s=>document.querySelector(s)).filter(visible);
    if(!blocks.length){alert('No hay información cargada para exportar.');return;}
    openDocument(cfg.title,blocks.map(cloneClean).join(''));
  }
  function inject(){
    const cfg=PAGE_MAP[page()]; if(!cfg || document.getElementById('adaExportContextual'))return;
    const target=document.querySelector('.module-view h1, .module-view h2, h1'); if(!target)return;
    const btn=document.createElement('button'); btn.type='button'; btn.id='adaExportContextual'; btn.className='btn-secondary ada-export-button no-export'; btn.textContent='Exportar información a PDF'; btn.addEventListener('click',exportMapped);
    target.insertAdjacentElement('afterend',btn);
  }
  function programa(programa){
    if(!programa)return;
    const row=(label,value)=>value?`<tr><th>${esc(label)}</th><td>${esc(value).replace(/\n/g,'<br>')}</td></tr>`:'';
    const body=`<table>${row('Título',programa.titulo)}${row('Curso',programa.cursos?.nombre)}${row('Materia',programa.materias?.nombre)}${row('Año lectivo',programa.anio_lectivo)}${row('Versión',programa.version)}${row('Estado',programa.estado)}${row('Fundamentación',programa.fundamentacion)}${row('Objetivos',programa.objetivos)}${row('Contenidos',programa.contenidos)}${row('Metodología y evaluación',programa.evaluacion)}${row('Observaciones',programa.observaciones)}</table>`;
    openDocument(programa.titulo||'Programa de materia',body);
  }
  window.ADAExport={openDocument,exportMapped,programa,escapeHtml:esc,cloneClean};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();