(()=>{
 "use strict";
 const page=()=>location.pathname.split('/').pop()||'';
 const assetBase=()=>location.pathname.includes('/pages/')?'../assets/':'assets/';
 function addBackdrop(){if(document.querySelector('.ada-ui2-aurora'))return;const d=document.createElement('div');d.className='ada-ui2-aurora';d.setAttribute('aria-hidden','true');d.innerHTML='<span></span><span></span><span></span>';document.body.prepend(d)}
 function readTheme(){
   const current=document.documentElement.dataset.theme;
   if(current==='light'||current==='dark')return current;
   const primary=localStorage.getItem('ada-theme');
   if(primary==='light'||primary==='dark')return primary;
   const legacy=localStorage.getItem('ada-color-theme');
   if(legacy==='light'||legacy==='dark')return legacy;
   return window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light';
 }
 function applyTheme(value,{persist=true}={}){
   const selected=value==='dark'?'dark':'light';
   const root=document.documentElement;
   root.dataset.theme=selected;
   root.dataset.adaTheme=selected;
   root.style.colorScheme=selected;
   document.body?.classList.toggle('ada-dark',selected==='dark');
   document.body?.classList.toggle('ada-light',selected==='light');
   if(persist){
     localStorage.setItem('ada-theme',selected);
     localStorage.setItem('ada-color-theme',selected);
   }
   const button=document.querySelector('.ada-ui2-theme');
   if(button){
     button.textContent=selected==='dark'?'☀':'☾';
     const label=selected==='dark'?'Activar modo claro':'Activar modo oscuro';
     button.setAttribute('aria-label',label);button.title=label;
   }
   document.querySelector('meta[name="theme-color"]')?.setAttribute('content',selected==='dark'?'#070a1c':'#f5f3ff');
   window.dispatchEvent(new CustomEvent('ada:theme-changed',{detail:{theme:selected}}));
   return selected;
 }
 function theme(){return applyTheme(readTheme(),{persist:false})}
 function toggleTheme(){
   const current=document.documentElement.dataset.theme==='dark'?'dark':'light';
   applyTheme(current==='dark'?'light':'dark');
 }
 function normalizeSidebar(){document.querySelectorAll('.sidebar-logo h2').forEach(h=>{h.textContent='ADA';h.setAttribute('aria-label','Ada')})}
 function collectProductLinks(){
   const old=document.querySelector('.ada-product-switcher');
   if(!old)return '';
   const links=[...old.querySelectorAll('a')].map(a=>`<a href="${a.getAttribute('href')||'#'}" class="${a.classList.contains('active')?'active':''}">${a.textContent.trim()}</a>`).join('');
   old.remove();return links;
 }
 function topbar(){
   if(document.querySelector('.ada-ui2-topbar')||['login.html','recuperar-clave.html'].includes(page()))return;
   const shell=document.querySelector('.module-shell');if(!shell)return;
   const productLinks=collectProductLinks();
   const bar=document.createElement('header');bar.className='ada-ui2-topbar';
   bar.innerHTML=`<div class="ada-ui2-brand"><img src="${assetBase()}img/ada-logo.jpg" alt="Logo de Ada"><span>Plataforma ADA</span></div><div class="ada-ui2-top-actions">${productLinks?`<nav class="ada-ui2-product-links">${productLinks}</nav>`:''}<button class="ada-ui2-theme" type="button" aria-label="Cambiar tema">${document.documentElement.dataset.theme==='dark'?'☀':'☾'}</button></div>`;
   shell.prepend(bar);bar.querySelector('.ada-ui2-theme').addEventListener('click',toggleTheme)
 }
 function floating(){const bars=[...document.querySelectorAll('.ada-final-utilities')];if(!bars.length)return;const first=bars[0];bars.slice(1).forEach(x=>x.remove());let links=[...first.querySelectorAll('a')];let help=links.find(a=>a.textContent.trim()==='?'||a.getAttribute('aria-label')==='Ayuda');let brand=links.find(a=>a!==help);if(help)help.classList.add('ada-help-link');if(!brand){brand=document.createElement('a');brand.href='acerca.html';first.appendChild(brand)}brand.className='ada-brand-orb';brand.title='Acerca de Ada';brand.setAttribute('aria-label','Acerca de Ada');brand.innerHTML=`<img src="${assetBase()}img/ada-logo.jpg" alt="Logo de Ada">`;links.filter(a=>a!==help&&a!==brand).forEach(a=>a.remove())}
 function normalizeRoleColors(){document.querySelectorAll('[class*="hero"]').forEach(el=>{el.style.removeProperty('background');el.style.removeProperty('background-color');el.style.removeProperty('color')});document.querySelectorAll('[style*="background"]').forEach(el=>{if(el.closest('.role-hero,.portal-hero,.dashboard-hero,.page-hero,.secretaria-hero'))el.style.removeProperty('background')})}
 function normalizeLayout(){
   document.querySelectorAll('.module-shell,.module-view,.secretaria-shell,.dashboard-group').forEach(el=>{el.style.removeProperty('left');el.style.removeProperty('right');el.style.removeProperty('transform');el.style.removeProperty('max-width')});
 }
 function run(){document.body.classList.add('ada-ui2');theme();addBackdrop();normalizeSidebar();normalizeLayout();topbar();normalizeRoleColors();floating();setTimeout(()=>{normalizeLayout();floating()},800);setTimeout(floating,1800)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
 window.addEventListener('ada:role-applied',()=>{normalizeSidebar();normalizeLayout();floating()});
 window.ADA_UI2={run,toggleTheme};
})();
