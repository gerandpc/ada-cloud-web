(() => {
  'use strict';
  const PAGE = (location.pathname.split('/').pop() || '').toLowerCase();
  const LABELS = {
    'institucion.html':'Institución','usuarios.html':'Usuarios','directivos.html':'Directivos','docentes.html':'Docentes',
    'preceptoria.html':'Preceptoría','alumnos.html':'Alumnos','familias.html':'Familias','cursos.html':'Cursos',
    'materias.html':'Materias','asignaciones.html':'Asignaciones','secretaria.html':'Secretaría','convivencia.html':'Convivencia',
    'documentos.html':'Documentos'
  };
  const ACCESS = {
    admin:Object.keys(LABELS),
    directivo:['institucion.html','directivos.html','docentes.html','preceptoria.html','alumnos.html','familias.html','cursos.html','materias.html','secretaria.html','convivencia.html','documentos.html'],
    secretaria:['institucion.html','docentes.html','preceptoria.html','alumnos.html','familias.html','cursos.html','materias.html','secretaria.html','documentos.html'],
    docente:['alumnos.html','cursos.html','materias.html','documentos.html'],
    preceptor:['alumnos.html','familias.html','cursos.html','convivencia.html','documentos.html'],
    familia:['documentos.html'], alumno:['documentos.html']
  };
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function countVisibleRows(){
    const rows=[...document.querySelectorAll('tbody tr')].filter(r=>r.offsetParent!==null && !/sin datos|no hay|cargando/i.test(r.textContent||''));
    const cards=[...document.querySelectorAll('.card,.item-card,.user-card,.module-card')].filter(c=>c.offsetParent!==null);
    const forms=[...document.querySelectorAll('form')].filter(f=>f.offsetParent!==null);
    return {rows:rows.length,cards:cards.length,forms:forms.length};
  }
  function render(role){
    const main=document.querySelector('main'); if(!main || document.querySelector('.ada-institutional-suite')) return;
    const allowed=(ACCESS[role]||[]).filter(p=>LABELS[p]); if(!allowed.length) return;
    const box=document.createElement('section'); box.className='ada-institutional-suite'; box.setAttribute('aria-label','Navegación de gestión institucional');
    box.innerHTML=`<div class="ada-institutional-suite__head"><h2 class="ada-institutional-suite__title">Gestión institucional</h2><span class="ada-institutional-suite__status">Accesos habilitados para ${esc(role)}</span></div><nav class="ada-institutional-suite__links">${allowed.map(p=>`<a class="ada-institutional-suite__link" href="${p}" ${p===PAGE?'aria-current="page"':''}>${esc(LABELS[p])}</a>`).join('')}</nav><div class="ada-institutional-suite__metrics"><div class="ada-institutional-suite__metric"><strong data-suite-rows>0</strong><span>registros visibles</span></div><div class="ada-institutional-suite__metric"><strong data-suite-cards>0</strong><span>paneles disponibles</span></div><div class="ada-institutional-suite__metric"><strong data-suite-forms>0</strong><span>operaciones habilitadas</span></div></div>`;
    const first=main.firstElementChild; first ? main.insertBefore(box,first.nextSibling) : main.prepend(box);
    const update=()=>{const m=countVisibleRows(); box.querySelector('[data-suite-rows]').textContent=m.rows; box.querySelector('[data-suite-cards]').textContent=m.cards; box.querySelector('[data-suite-forms]').textContent=m.forms;};
    update(); const obs=new MutationObserver(()=>requestAnimationFrame(update)); obs.observe(main,{childList:true,subtree:true}); setTimeout(update,1200);
  }
  async function init(){
    try{
      if(typeof window.obtenerSesionPerfil==='function'){
        const ctx=await window.obtenerSesionPerfil(); const role=(ctx?.perfil?.rol||'').toLowerCase(); render(role); return;
      }
    }catch(e){console.warn('ADA Gestión Institucional:',e);}
    document.addEventListener('ada:role-applied',e=>render((e.detail?.rol||'').toLowerCase()),{once:true});
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
