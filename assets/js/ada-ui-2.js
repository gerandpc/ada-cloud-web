(()=>{
  "use strict";

  const DESKTOP_MIN = 861;
  const page = () => location.pathname.split('/').pop() || '';
  const assetBase = () => location.pathname.includes('/pages/') ? '../assets/' : 'assets/';
  let raf = 0;
  let observer = null;

  function addBackdrop(){
    if(document.querySelector('.ada-ui2-aurora')) return;
    const d=document.createElement('div');
    d.className='ada-ui2-aurora';
    d.setAttribute('aria-hidden','true');
    d.innerHTML='<span></span><span></span><span></span>';
    document.body.prepend(d);
  }

  function theme(){
    const saved=localStorage.getItem('ada-theme') || 'dark';
    document.documentElement.dataset.theme=saved;
    document.body.classList.toggle('ada-dark', saved==='dark');
  }

  function toggleTheme(){
    const next=document.documentElement.dataset.theme==='dark' ? 'light' : 'dark';
    localStorage.setItem('ada-theme',next);
    theme();
    const b=document.querySelector('.ada-ui2-theme');
    if(b) b.textContent=next==='dark' ? '☀' : '☾';
  }

  function normalizeSidebar(){
    document.querySelectorAll('.sidebar-logo h2').forEach(h=>{
      h.textContent='ADA';
      h.setAttribute('aria-label','Ada');
    });
  }

  function collectProductLinks(){
    const old=document.querySelector('.ada-product-switcher');
    if(!old) return '';
    const links=[...old.querySelectorAll('a')].map(a=>
      `<a href="${a.getAttribute('href')||'#'}" class="${a.classList.contains('active')?'active':''}">${a.textContent.trim()}</a>`
    ).join('');
    old.remove();
    return links;
  }

  function topbar(){
    if(document.querySelector('.ada-ui2-topbar') || ['login.html','recuperar-clave.html'].includes(page())) return;
    const shell=document.querySelector('.module-shell,.secretaria-shell,.dashboard-main,.main-content');
    if(!shell) return;
    const productLinks=collectProductLinks();
    const bar=document.createElement('header');
    bar.className='ada-ui2-topbar';
    bar.innerHTML=`<div class="ada-ui2-brand"><img src="${assetBase()}img/ada-logo.jpg" alt="Logo de Ada"><span>Plataforma ADA</span></div><div class="ada-ui2-top-actions">${productLinks?`<nav class="ada-ui2-product-links">${productLinks}</nav>`:''}<button class="ada-ui2-theme" type="button" aria-label="Cambiar tema">${document.documentElement.dataset.theme==='dark'?'☀':'☾'}</button></div>`;
    shell.prepend(bar);
    bar.querySelector('.ada-ui2-theme')?.addEventListener('click',toggleTheme);
  }

  function floating(){
    const bars=[...document.querySelectorAll('.ada-final-utilities')];
    if(!bars.length) return;
    const first=bars[0];
    bars.slice(1).forEach(x=>x.remove());
    const links=[...first.querySelectorAll('a')];
    const help=links.find(a=>a.textContent.trim()==='?' || a.getAttribute('aria-label')==='Ayuda');
    let brand=links.find(a=>a!==help);
    if(help) help.classList.add('ada-help-link');
    if(!brand){brand=document.createElement('a');brand.href='acerca.html';first.appendChild(brand)}
    brand.className='ada-brand-orb';
    brand.title='Acerca de Ada';
    brand.setAttribute('aria-label','Acerca de Ada');
    brand.innerHTML=`<img src="${assetBase()}img/ada-logo.jpg" alt="Logo de Ada">`;
    links.filter(a=>a!==help && a!==brand).forEach(a=>a.remove());
  }

  function normalizeRoleColors(){
    document.querySelectorAll('[class*="hero"]').forEach(el=>{
      el.style.removeProperty('background');
      el.style.removeProperty('background-color');
      el.style.removeProperty('color');
    });
    document.querySelectorAll('[style*="background"]').forEach(el=>{
      if(el.closest('.role-hero,.portal-hero,.dashboard-hero,.page-hero,.secretaria-hero')){
        el.style.removeProperty('background');
      }
    });
  }

  function setImportant(el, prop, value){
    if(el) el.style.setProperty(prop,value,'important');
  }

  function enforceLayout(){
    if(!document.body) return;
    document.body.classList.add('ada-ui2');
    const desktop=window.innerWidth>=DESKTOP_MIN;
    const sidebar=document.querySelector('.sidebar,.ada-role-sidebar');
    const sidebarWidth=desktop && sidebar ? Math.round(sidebar.getBoundingClientRect().width || 270) : 0;
    document.documentElement.style.setProperty('--ada-sidebar-live', `${sidebarWidth}px`);

    const shells=document.querySelectorAll('main.module-shell,.module-shell,.secretaria-shell,.dashboard-main,.main-content');
    shells.forEach(el=>{
      setImportant(el,'position','relative');
      setImportant(el,'left','auto');
      setImportant(el,'right','auto');
      setImportant(el,'transform','none');
      setImportant(el,'margin-left', desktop ? `${sidebarWidth}px` : '0px');
      setImportant(el,'width', desktop ? `calc(100% - ${sidebarWidth}px)` : '100%');
      setImportant(el,'max-width','none');
      setImportant(el,'min-width','0');
      setImportant(el,'box-sizing','border-box');
    });

    document.querySelectorAll('.module-view,.dashboard-group,.institutional-suite,.secretaria-shell > *').forEach(el=>{
      setImportant(el,'position','relative');
      setImportant(el,'left','auto');
      setImportant(el,'right','auto');
      setImportant(el,'transform','none');
      setImportant(el,'margin-left','auto');
      setImportant(el,'margin-right','auto');
      setImportant(el,'width','100%');
      setImportant(el,'max-width','1280px');
      setImportant(el,'min-width','0');
    });
  }

  function scheduleEnforce(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      enforceLayout();
      floating();
    });
  }

  function watchLayout(){
    if(observer || !document.body) return;
    observer=new MutationObserver(scheduleEnforce);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
    window.addEventListener('resize',scheduleEnforce,{passive:true});
    window.addEventListener('load',scheduleEnforce,{once:true});
  }

  function run(){
    document.body.classList.add('ada-ui2');
    theme();
    addBackdrop();
    normalizeSidebar();
    normalizeRoleColors();
    topbar();
    floating();
    enforceLayout();
    watchLayout();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();

  ['ada:role-applied','ada:context-ready'].forEach(name=>window.addEventListener(name,scheduleEnforce));
  window.ADA_UI2={run,toggleTheme,enforceLayout};
})();
