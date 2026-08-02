(()=>{
 "use strict";
 const page=()=>location.pathname.split('/').pop()||'';
 const assetBase=()=>location.pathname.includes('/pages/')?'../assets/':'assets/';
 function addBackdrop(){if(document.querySelector('.ada-ui2-aurora'))return;const d=document.createElement('div');d.className='ada-ui2-aurora';d.setAttribute('aria-hidden','true');d.innerHTML='<span></span><span></span><span></span>';document.body.prepend(d)}
 function theme(){const saved=localStorage.getItem('ada-theme')||'dark';document.documentElement.dataset.theme=saved;document.body.classList.toggle('ada-dark',saved==='dark')}
 function toggleTheme(){const next=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem('ada-theme',next);theme();const b=document.querySelector('.ada-ui2-theme');if(b)b.textContent=next==='dark'?'☀':'☾'}
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
