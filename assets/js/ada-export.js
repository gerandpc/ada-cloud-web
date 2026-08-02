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
    "asistencia.html": { title:"Informe de asistencia", selectors:["#tablaHistorial","#resultadoAlertas"] },
    "calificaciones.html": { title:"Libro de calificaciones", selectors:["#tablaPrimer","#tablaSegundo","#tablaDiciembre","#tablaFebrero","#tablaFormalDocente"] },
    "reportes.html": { title:"Reporte institucional", selectors:["#resumenAsistencia","#tablaAsistencia","#tablaSeguimiento","#tablaUsuariosReporte","#tablaDocumentosReporte","#tablaEstructuraReporte"] },
    "boletines.html": { title:"Boletines", selectors:["#vistaPreviaBoletin","#tablaBoletines"] }
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
    const w=window.open('','_blank','noopener,noreferrer');
    if(!w){alert('El navegador bloqueó la ventana del documento. Habilitá ventanas emergentes para ADA.');return;}
    const date=new Intl.DateTimeFormat('es-AR',{dateStyle:'long',timeStyle:'short'}).format(new Date());
    w.document.open();
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      @page{size:A4;margin:16mm} body{font-family:Arial,sans-serif;color:#1f2937;margin:0;font-size:11pt} header{border-bottom:2px solid #149187;padding-bottom:10px;margin-bottom:18px} h1{font-size:20pt;margin:0 0 5px} .meta{color:#64748b;font-size:9pt} h2{font-size:14pt;margin:18px 0 8px} table{width:100%;border-collapse:collapse;margin:8px 0 18px;page-break-inside:auto} tr{page-break-inside:avoid} th,td{border:1px solid #cbd5e1;padding:6px 7px;text-align:left;vertical-align:top} th{background:#eaf7f5} article,.panel-card,.b27-card{border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin:10px 0;page-break-inside:avoid} .btn-primary,.btn-secondary,.b27-card-actions,.back-link,.sidebar{display:none!important} footer{margin-top:20px;border-top:1px solid #cbd5e1;padding-top:8px;color:#64748b;font-size:8pt}
    </style></head><body><header><h1>${esc(title)}</h1><div class="meta">${esc(institution())} · Generado el ${esc(date)}</div></header>${body}<footer>Documento generado por ADA Cloud.</footer><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    w.document.close();
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
  window.ADAExport={openDocument,exportMapped,programa};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();