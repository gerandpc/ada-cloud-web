(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let context=null;
  function msg(text,type="info"){$("demoMessage").textContent=text;$('demoMessage').className=`helper-text ${type}`;}
  function list(id,items,empty){$(id).innerHTML=(items?.length?items:[empty]).map(x=>`<li>${esc(x)}</li>`).join("");}
  function formatDate(value){if(!value)return "—";try{return new Intl.DateTimeFormat("es-AR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}catch{return value;}}
  function render(status){
    const state=status?.estado||"sin_datos";
    $("demoRun").textContent=status?.run_id||"—";$("demoState").textContent=state;$("demoCount").textContent=status?.registros||0;$("demoCreated").textContent=formatDate(status?.creado_en);
    const badge=$("demoStatusBadge");badge.textContent=state==="sin_datos"?"Sin dataset":state;badge.className=`demo-badge ${state}`;
    const summary=status?.resumen||{};list("demoOk",summary.correctos,"No hay registros generados.");list("demoWarnings",summary.advertencias,"Sin advertencias.");
    $("demoDelete").disabled=!status?.run_id||state==="eliminado"||state==="sin_datos";
  }
  async function load(){
    const {data,error}=await supabaseClient.rpc("ada_demo_status");
    if(error){msg("Primero ejecutá la migración SQL del módulo Demo Dataset.","error");throw error;} render(data);
  }
  async function generate(){
    if(!confirm("Se generarán registros académicos de demostración vinculados a la estructura activa. ¿Continuar?"))return;
    $("demoGenerate").disabled=true;msg("Generando dataset controlado…");
    try{const {data,error}=await supabaseClient.rpc("ada_demo_generate",{p_etiqueta:$("demoLabel").value.trim()||"ADA Demo Dataset"});if(error)throw error;
      msg(`Dataset generado: ${data.registros||0} registros identificados.`,data.advertencias?.length?"warn":"success");await load();
    }catch(e){console.error(e);msg(e.message||"No se pudo generar el dataset.","error");}finally{$("demoGenerate").disabled=false;}
  }
  async function remove(){
    if(!confirm("Se eliminarán únicamente los registros identificados como demo. ¿Continuar?"))return;
    $("demoDelete").disabled=true;msg("Eliminando dataset…");
    try{const {data,error}=await supabaseClient.rpc("ada_demo_delete",{p_run_id:null});if(error)throw error;msg(`Se eliminaron ${data.deleted||0} registros demo.`,data.advertencias?.length?"warn":"success");await load();}
    catch(e){console.error(e);msg(e.message||"No se pudo eliminar el dataset.","error");}finally{$("demoDelete").disabled=false;}
  }
  document.addEventListener("DOMContentLoaded",async()=>{
    try{context=window.adaReady?await window.adaReady:await window.obtenerSesionPerfil?.();if(!context)return;
      $("demoGenerate").addEventListener("click",generate);$("demoDelete").addEventListener("click",remove);await load();
    }catch(e){console.error(e);msg("No se pudo iniciar el módulo. Verificá permisos y migración SQL.","error");}
  });
})();