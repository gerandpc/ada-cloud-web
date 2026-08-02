(()=>{
 "use strict";
 const page=()=>location.pathname.split('/').pop()||'';
 const assetBase=()=>location.pathname.includes('/pages/')?'../assets/':'assets/';
 function addBackdrop(){if(document.querySelector('.ada-ui2-aurora'))return;const d=document.createElement('div');d.className='ada-ui2-aurora';d.setAttribute('aria-hidden','true');d.innerHTML='<span></span><span></span><span></span>';document.body.prepend(d)}
 function theme(){const saved=localStorage.getItem('ada-theme')||'light';document.documentElement.dataset.theme=saved;document.body.classList.toggle('ada-dark',saved==='dark')}
 function toggleTheme(){const next=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem('ada-theme',next);theme();const b=document.querySelector('.ada-ui2-theme');if(b)b.textContent=next==='dark'?'☀':'☾'}
 function normalizeSidebar(){document.querySelectorAll('.sidebar-logo h2').forEach(h=>{h.textContent='ADA';h.setAttribute('aria-label','Ada')})}
 function topbar(){if(document.querySelector('.ada-ui2-topbar')||['login.html','recuperar-clave.html'].includes(page()))return;const shell=document.querySelector('.module-shell');if(!shell)return;const bar=document.createElement('header');bar.className='ada-ui2-topbar';bar.innerHTML=`<div class="ada-ui2-brand"><img src="${assetBase()}img/ada-logo.jpg" alt="Logo de Ada"><span>Plataforma ADA</span></div><div class="ada-ui2-top-actions"><button class="ada-ui2-theme" type="button" aria-label="Cambiar tema">${document.documentElement.dataset.theme==='dark'?'☀':'☾'}</button></div>`;shell.prepend(bar);bar.querySelector('.ada-ui2-theme').addEventListener('click',toggleTheme)}
 function floating(){const bars=[...document.querySelectorAll('.ada-final-utilities')];if(!bars.length)return;const first=bars[0];bars.slice(1).forEach(x=>x.remove());let links=[...first.querySelectorAll('a')];let help=links.find(a=>a.textContent.trim()==='?'||a.getAttribute('aria-label')==='Ayuda');let brand=links.find(a=>a!==help);if(help)help.classList.add('ada-help-link');if(!brand){brand=document.createElement('a');brand.href='acerca.html';first.appendChild(brand)}brand.className='ada-brand-orb';brand.title='Acerca de Ada';brand.setAttribute('aria-label','Acerca de Ada');brand.innerHTML=`<img src="${assetBase()}img/ada-logo.jpg" alt="Logo de Ada">`;links.filter(a=>a!==help&&a!==brand).forEach(a=>a.remove())}
 function normalizeRoleColors(){document.querySelectorAll('[class*="hero"]').forEach(el=>{el.style.removeProperty('background');el.style.removeProperty('background-color');el.style.removeProperty('color')});document.querySelectorAll('[style*="background"]').forEach(el=>{if(el.closest('.role-hero,.portal-hero,.dashboard-hero,.page-hero'))el.style.removeProperty('background')})}
 function run(){document.body.classList.add('ada-ui2');theme();addBackdrop();normalizeSidebar();topbar();normalizeRoleColors();floating();setTimeout(floating,800);setTimeout(floating,1800)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
 window.addEventListener('ada:role-applied',()=>{normalizeSidebar();floating()});
 window.ADA_UI2={run,toggleTheme};
})();
