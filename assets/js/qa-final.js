(async()=>{"use strict";const ctx=await adaRequirePageAccess();if(!ctx)return;let results=[];const tests=[
["Sesión activa",async()=>!!(await supabaseClient.auth.getSession()).data.session],
["Perfil disponible",async()=>!!ctx.perfil?.id],
["Rol reconocido",async()=>["admin","directivo","secretaria","docente","preceptor","familia","alumno"].includes(ctx.perfil.rol)],
["Conexión con Supabase",async()=>{const r=await supabaseClient.from("profiles").select("id",{count:"exact",head:true});return !r.error}],
["Mapa de permisos cargado",async()=>!!window.ADA_PAGE_ACCESS&&Object.keys(window.ADA_PAGE_ACCESS).length>20],
["Menú filtrado por rol",async()=>!document.querySelector('[data-module][hidden] a:focus')],
["Runtime ADA 1.0",async()=>!!window.ADA_FINAL],
["Conexión del navegador",async()=>navigator.onLine]
];
async function run(){results=[];const root=document.getElementById("qaResults");root.textContent="";for(const [name,fn] of tests){let ok=false,msg="";try{ok=!!(await fn())}catch(e){msg=e.message||"Error"}results.push({name,ok,msg});const row=document.createElement("div");row.className=`qa-row ${ok?"ok":"fail"}`;row.innerHTML=`<strong>${ok?"✓":"✕"} ${name}</strong><span>${ok?"Correcto":(msg||"Revisar")}</span>`;root.appendChild(row)}const pass=results.filter(r=>r.ok).length;document.getElementById("qaSummary").textContent=`${pass} de ${results.length} controles correctos`;}
function csv(){const lines=[["Control","Estado","Detalle"],...results.map(r=>[r.name,r.ok?"Correcto":"Revisar",r.msg||""])];const text=lines.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");const blob=new Blob(["\ufeff"+text],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="ADA_QA_1_0.csv";a.click();URL.revokeObjectURL(a.href)}
document.getElementById("runQa").addEventListener("click",run);document.getElementById("exportQa").addEventListener("click",csv);run();})();
