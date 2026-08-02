(function(){
  'use strict';

  const state={perfil:null,data:null,loading:false};
  const txt=v=>String(v??'').trim();
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
  const pct=v=>v===null||v===undefined||!Number.isFinite(Number(v))?'—':`${Number(v).toFixed(1)}%`;
  const date=()=>new Date().toLocaleString('es-AR');
  const stamp=()=>new Date().toISOString().slice(0,10);
  const profileName=p=>txt(`${p?.apellido||''} ${p?.nombre||''}`).trim()||p?.email||'Sin identificar';
  const name=r=>r?.nombre||r?.titulo||r?.descripcion||r?.name||'Sin nombre';
  const safeHtml=v=>txt(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  async function safe(table,columns='*'){
    try{const {data,error}=await supabaseClient.from(table).select(columns).limit(5000);if(error)throw error;return data||[]}
    catch(error){console.warn(`[ADA Reports] ${table}:`,error?.message||error);return []}
  }

  async function loadData(force=false){
    if(state.data&&!force)return state.data;
    if(state.loading)return null;
    state.loading=true;
    try{
      const ctx=await adaRequirePageAccess();
      if(!ctx)throw new Error('Sesión no disponible');
      state.perfil=ctx.perfil;
      const [cursos,materias,perfiles,alumnoCursos,asistencia,calificaciones,programas,planificaciones,actividades,entregas,docenteMaterias,boletines,seguimientos,convivencia]=await Promise.all([
        safe('cursos','*'),safe('materias','*'),safe('profiles','id,nombre,apellido,email,rol,activo'),safe('alumno_cursos','*'),
        safe('v_reporte_asistencia_detalle','*'),safe('calificaciones','*'),safe('programas_materia','*'),safe('planificaciones_didacticas','*'),
        safe('actividades','*'),safe('entregas_actividades','*'),safe('docente_materias','*'),safe('boletines','*'),
        safe('v_reporte_seguimiento_detalle','*'),safe('convivencia_casos','*')
      ]);
      state.data={cursos,materias,perfiles,alumnoCursos,asistencia,calificaciones,programas,planificaciones,actividades,entregas,docenteMaterias,boletines,seguimientos,convivencia};
      return state.data;
    }finally{state.loading=false}
  }

  function metrics(data){
    const students=data.perfiles.filter(p=>p.rol==='alumno'&&p.activo!==false);
    const teachers=data.perfiles.filter(p=>p.rol==='docente'&&p.activo!==false);
    const grades=data.calificaciones.map(x=>num(x.nota??x.calificacion??x.valor)).filter(x=>x!==null);
    const avg=grades.length?grades.reduce((a,b)=>a+b,0)/grades.length:null;
    const attendanceRows=data.asistencia;
    const present=attendanceRows.filter(x=>['presente','p','1',true].includes(String(x.estado??x.presente).toLowerCase())).length;
    const attendancePct=attendanceRows.length?present/attendanceRows.length*100:null;
    const delivered=data.entregas.filter(x=>['entregada','revisada','corregida','calificada'].includes(txt(x.estado).toLowerCase())).length;
    const deliveryPct=data.actividades.length?Math.min(100,delivered/Math.max(1,data.actividades.length)*100):null;
    const approvedPrograms=data.programas.filter(x=>txt(x.estado).toLowerCase()==='aprobado').length;
    const approvedPlans=data.planificaciones.filter(x=>txt(x.estado).toLowerCase()==='aprobado').length;
    const alerts=data.seguimientos.filter(x=>['alto','medio','critico','crítico'].includes(txt(x.nivel_riesgo??x.nivel??x.riesgo).toLowerCase())).length;
    const scoreParts=[];
    if(attendancePct!==null)scoreParts.push(Math.max(0,Math.min(100,attendancePct)));
    if(avg!==null)scoreParts.push(Math.max(0,Math.min(100,avg*10)));
    if(data.programas.length)scoreParts.push(approvedPrograms/data.programas.length*100);
    if(data.planificaciones.length)scoreParts.push(approvedPlans/data.planificaciones.length*100);
    if(deliveryPct!==null)scoreParts.push(deliveryPct);
    if(students.length)scoreParts.push(Math.max(0,100-alerts/students.length*100));
    const score=scoreParts.length?scoreParts.reduce((a,b)=>a+b,0)/scoreParts.length:null;
    return {students,teachers,grades,avg,attendancePct,deliveryPct,approvedPrograms,approvedPlans,alerts,score};
  }

  function courseRows(data){
    return data.cursos.slice(0,30).map(c=>{
      const links=data.alumnoCursos.filter(x=>String(x.curso_id)===String(c.id));
      const studentIds=new Set(links.map(x=>String(x.alumno_id??x.profile_id)));
      const att=data.asistencia.filter(x=>String(x.curso_id)===String(c.id)||studentIds.has(String(x.alumno_id??x.profile_id)));
      const pr=att.filter(x=>['presente','p','1',true].includes(String(x.estado??x.presente).toLowerCase())).length;
      const gs=data.calificaciones.map(x=>({row:x,value:num(x.nota??x.calificacion??x.valor)})).filter(x=>x.value!==null&&(String(x.curso_id)===String(c.id)||studentIds.has(String(x.alumno_id??x.profile_id))));
      const av=gs.length?gs.reduce((s,x)=>s+x.value,0)/gs.length:null;
      return [name(c),links.length,att.length?pct(pr/att.length*100):'—',av===null?'—':av.toFixed(2)];
    });
  }

  function subjectRows(data){
    return data.materias.slice(0,30).map(m=>{
      const gs=data.calificaciones.map(x=>({row:x,value:num(x.nota??x.calificacion??x.valor)})).filter(x=>x.value!==null&&String(x.materia_id)===String(m.id));
      const av=gs.length?gs.reduce((s,x)=>s+x.value,0)/gs.length:null;
      const fail=gs.length?gs.filter(x=>x.value<6).length/gs.length*100:null;
      return [name(m),gs.length,av===null?'—':av.toFixed(2),fail===null?'—':pct(fail)];
    }).sort((a,b)=>Number(a[2]||99)-Number(b[2]||99));
  }

  function recommendations(m,data){
    const out=[];
    if(m.attendancePct===null)out.push('Completar registros de asistencia para habilitar análisis de ausentismo.');
    else if(m.attendancePct<85)out.push('Implementar un plan de seguimiento de ausentismo con responsables y frecuencia semanal.');
    else out.push('Mantener el seguimiento preventivo de asistencia y documentar variaciones por curso.');
    if(m.avg===null)out.push('Completar calificaciones del período para habilitar indicadores de rendimiento.');
    else if(m.avg<6)out.push('Priorizar acompañamiento pedagógico en materias y cursos con promedio inferior a 6.');
    else out.push('Sostener estrategias de enseñanza y monitorear materias con mayor dispersión de resultados.');
    if(data.programas.length&&m.approvedPrograms<data.programas.length)out.push(`Resolver ${data.programas.length-m.approvedPrograms} programa(s) pendiente(s) de aprobación.`);
    if(data.planificaciones.length&&m.approvedPlans<data.planificaciones.length)out.push(`Completar la revisión de ${data.planificaciones.length-m.approvedPlans} planificación(es).`);
    if(m.alerts)out.push(`Revisar ${m.alerts} trayectoria(s) con alerta media o alta y asignar acciones de seguimiento.`);
    return out;
  }

  function observations(m,data){
    const out=[];
    out.push(m.score===null?'No hay información suficiente para calcular el ADA Score.':`ADA Score institucional: ${Math.round(m.score)}/100.`);
    out.push(m.attendancePct===null?'Asistencia sin información suficiente.':`Asistencia general: ${pct(m.attendancePct)}.`);
    out.push(m.avg===null?'No se dispone de calificaciones numéricas suficientes.':`Promedio general: ${m.avg.toFixed(2)}.`);
    out.push(`${m.approvedPrograms} de ${data.programas.length} programas aprobados.`);
    out.push(`${m.approvedPlans} de ${data.planificaciones.length} planificaciones aprobadas.`);
    out.push(`${m.alerts} trayectorias con alertas medias o altas.`);
    return out;
  }

  function scoreLabel(score){if(score===null)return 'Sin cálculo';if(score>=90)return 'Situación muy favorable';if(score>=75)return 'Situación favorable con seguimiento';if(score>=60)return 'Situación de atención';return 'Situación prioritaria'}

  function cover(pdf,config){
    pdf.text('ADA',pdf.margin,pdf.y,{size:28,bold:true,color:{r:122,g:31,b:43},maxChars:15,leading:30});
    pdf.y-=8;
    pdf.text(config.product||'ADA Reports',pdf.margin,pdf.y,{size:12,bold:true,color:{r:100,g:116,b:139},maxChars:40});
    pdf.y-=58;
    pdf.text(config.title,pdf.margin,pdf.y,{size:25,bold:true,color:{r:31,g:41,b:55},maxChars:48,leading:29});
    pdf.y-=18;
    if(config.description)pdf.paragraph(config.description,{size:12,color:{r:100,g:116,b:139},maxChars:72});
    pdf.y-=20;
    pdf.keyValues([
      ['Institución',config.institution||'ADA Cloud'],['Período',config.period||'Período actual'],['Generado',date()],['Usuario',profileName(state.perfil)],['Versión','ADA Reports 2.0']
    ]);
    pdf.y-=20;
    pdf.note('Documento institucional generado automáticamente. Los indicadores deben interpretarse junto con el criterio profesional de los equipos responsables.');
  }

  function list(pdf,items){items.forEach((x,i)=>pdf.paragraph(`${i+1}. ${x}`));}

  function reportBase(config,data,m){
    if(!window.ADA_PDF)throw new Error('El motor PDF de ADA no está disponible');
    const pdf=window.ADA_PDF.create({title:config.title,subtitle:config.subtitle||'',filename:config.filename,institution:config.institution||'ADA Cloud'});
    // Replace automatic first-page header with a proper cover by starting a clean second page after cover-like content.
    cover(pdf,config);
    pdf.newPage();
    pdf.heading('Resumen ejecutivo',1);
    pdf.scoreBand(m.score,scoreLabel(m.score));
    pdf.cards([
      {label:'ADA Score',value:m.score===null?'—':`${Math.round(m.score)}/100`},{label:'Matrícula',value:m.students.length},
      {label:'Asistencia',value:pct(m.attendancePct)},{label:'Promedio',value:m.avg===null?'—':m.avg.toFixed(2)},
      {label:'Alertas',value:m.alerts},{label:'Programas',value:`${m.approvedPrograms}/${data.programas.length}`},
      {label:'Planificaciones',value:`${m.approvedPlans}/${data.planificaciones.length}`},{label:'Entregas',value:pct(m.deliveryPct)}
    ],4);
    pdf.note(`${scoreLabel(m.score)}. El ADA Score sintetiza asistencia, rendimiento, cumplimiento académico y alertas disponibles.`);
    pdf.heading('Observaciones automáticas',1);list(pdf,observations(m,data));
    pdf.heading('Recomendaciones',1);list(pdf,recommendations(m,data));
    return pdf;
  }

  async function executive(){
    const data=await loadData(true),m=metrics(data);
    const pdf=reportBase({title:'Informe Ejecutivo Institucional',product:'ADA Intelligence',description:'Síntesis estratégica para la toma de decisiones institucionales.',filename:`ADA_Informe_Ejecutivo_${stamp()}.pdf`},data,m);
    pdf.newPage();pdf.heading('Análisis por curso',1);pdf.table(['Curso','Estudiantes','Asistencia','Promedio'],courseRows(data),{widths:[.42,.16,.2,.22]});
    pdf.heading('Asistencia comparada por curso',1);pdf.barChart(courseRows(data).map(r=>({label:r[0],value:Number(String(r[2]).replace('%',''))||0,display:r[2]})),{maxValue:100});
    pdf.heading('Materias que requieren atención',1);pdf.table(['Materia','Registros','Promedio','Desaprobación'],subjectRows(data).slice(0,20),{widths:[.42,.16,.2,.22]});
    pdf.heading('Promedio por materia',1);pdf.barChart(subjectRows(data).filter(r=>r[2]!=='—').slice(0,12).map(r=>({label:r[0],value:Number(r[2])||0,display:r[2]})),{maxValue:10});
    pdf.newPage();pdf.heading('Gestión académica',1);
    pdf.cards([{label:'Programas registrados',value:data.programas.length},{label:'Programas aprobados',value:m.approvedPrograms},{label:'Planificaciones',value:data.planificaciones.length},{label:'Planificaciones aprobadas',value:m.approvedPlans},{label:'Actividades',value:data.actividades.length},{label:'Entregas',value:data.entregas.length},{label:'Boletines',value:data.boletines.length},{label:'Seguimientos',value:data.seguimientos.length}],4);
    pdf.heading('Conclusión institucional',1);pdf.paragraph(`La institución presenta ${scoreLabel(m.score).toLowerCase()}. Este informe integra los registros disponibles al ${date()} y prioriza la lectura combinada de asistencia, rendimiento, cumplimiento de programas y trayectorias.`);
    pdf.heading('Validación',1);pdf.keyValues([['Generado por',profileName(state.perfil)],['Rol',state.perfil?.rol||''],['Fecha y hora',date()],['Sistema','ADA Cloud · ADA Reports 2.0']]);
    pdf.save();
  }

  async function pedagogical(){
    const data=await loadData(true),m=metrics(data);
    const pdf=reportBase({title:'Informe Pedagógico Institucional',product:'ADA Gestión',description:'Lectura pedagógica de rendimiento, asistencia, actividades y planificación.',filename:`ADA_Informe_Pedagogico_${stamp()}.pdf`},data,m);
    pdf.newPage();pdf.heading('Rendimiento por materia',1);pdf.table(['Materia','Evaluaciones','Promedio','Desaprobación'],subjectRows(data),{widths:[.42,.16,.2,.22]});
    pdf.heading('Situación por curso',1);pdf.table(['Curso','Matrícula','Asistencia','Promedio'],courseRows(data),{widths:[.42,.16,.2,.22]});
    pdf.heading('Rendimiento comparado',1);pdf.barChart(subjectRows(data).filter(r=>r[2]!=='—').slice(0,15).map(r=>({label:r[0],value:Number(r[2])||0,display:r[2]})),{maxValue:10});
    pdf.newPage();pdf.heading('Planificación y enseñanza',1);
    pdf.cards([{label:'Programas',value:data.programas.length},{label:'Aprobados',value:m.approvedPrograms},{label:'Planificaciones',value:data.planificaciones.length},{label:'Aprobadas',value:m.approvedPlans},{label:'Actividades',value:data.actividades.length},{label:'Entregas',value:data.entregas.length}],3);
    pdf.heading('Líneas de acción sugeridas',1);list(pdf,recommendations(m,data));pdf.save();
  }

  async function supervision(){
    const data=await loadData(true),m=metrics(data);
    const pdf=reportBase({title:'Informe para Supervisión',product:'ADA Intelligence',description:'Reporte institucional consolidado para acompañamiento, seguimiento y supervisión.',filename:`ADA_Informe_Supervision_${stamp()}.pdf`},data,m);
    pdf.newPage();pdf.heading('Estructura institucional',1);pdf.cards([{label:'Cursos',value:data.cursos.length},{label:'Materias',value:data.materias.length},{label:'Docentes',value:m.teachers.length},{label:'Estudiantes',value:m.students.length}],4);
    pdf.heading('Indicadores académicos',1);pdf.table(['Indicador','Resultado','Lectura'],[
      ['Asistencia',pct(m.attendancePct),m.attendancePct===null?'Sin datos':m.attendancePct>=90?'Adecuada':'Requiere seguimiento'],
      ['Promedio general',m.avg===null?'—':m.avg.toFixed(2),m.avg===null?'Sin datos':m.avg>=6?'Adecuado':'Requiere intervención'],
      ['Programas aprobados',`${m.approvedPrograms}/${data.programas.length}`,m.approvedPrograms===data.programas.length?'Completo':'Pendiente'],
      ['Planificaciones aprobadas',`${m.approvedPlans}/${data.planificaciones.length}`,m.approvedPlans===data.planificaciones.length?'Completo':'Pendiente'],
      ['Trayectorias alertadas',m.alerts,m.alerts?'Requiere seguimiento':'Sin alertas visibles']
    ],{widths:[.38,.2,.42]});
    pdf.heading('Desagregación por curso',1);pdf.table(['Curso','Matrícula','Asistencia','Promedio'],courseRows(data),{widths:[.42,.16,.2,.22]});
    pdf.newPage();pdf.heading('Recomendaciones institucionales',1);list(pdf,recommendations(m,data));pdf.heading('Declaración metodológica',1);pdf.note('Los resultados provienen de los registros disponibles para el usuario autenticado. La ausencia de datos puede afectar la representatividad de los indicadores.');pdf.save();
  }

  async function teacher(){
    const data=await loadData(true),m=metrics(data);const id=String(state.perfil?.id||'');
    const assignments=data.docenteMaterias.filter(x=>String(x.docente_id??x.profile_id)===id);
    const subjectIds=new Set(assignments.map(x=>String(x.materia_id)));
    const activities=data.actividades.filter(x=>String(x.docente_id??x.creado_por)===id||subjectIds.has(String(x.materia_id)));
    const programs=data.programas.filter(x=>String(x.docente_id??x.creado_por)===id||subjectIds.has(String(x.materia_id)));
    const pdf=window.ADA_PDF.create({title:'Informe Docente',filename:`ADA_Informe_Docente_${stamp()}.pdf`});cover(pdf,{title:'Informe Docente',product:'ADA Gestión',description:'Síntesis de carga académica, planificación, actividades y seguimiento.',period:'Período actual'});
    pdf.newPage();pdf.cards([{label:'Asignaciones',value:assignments.length},{label:'Programas',value:programs.length},{label:'Actividades',value:activities.length},{label:'Entregas totales',value:data.entregas.length}],4);
    pdf.heading('Asignaciones',1);pdf.table(['Materia','Curso'],assignments.map(x=>[name(data.materias.find(m=>String(m.id)===String(x.materia_id))),name(data.cursos.find(c=>String(c.id)===String(x.curso_id)))]),{widths:[.5,.5]});
    pdf.heading('Programas y actividades',1);pdf.table(['Tipo','Título','Estado'],[
      ...programs.map(x=>['Programa',x.titulo||'Programa',x.estado||'—']),...activities.map(x=>['Actividad',x.titulo||'Actividad',x.estado||'—'])
    ],{widths:[.2,.55,.25]});pdf.save();
  }

  async function studentOrFamily(){
    const data=await loadData(true);const role=state.perfil?.rol;const pdf=window.ADA_PDF.create({title:role==='familia'?'Informe de seguimiento familiar':'Informe de trayectoria estudiantil',filename:`ADA_Informe_${role==='familia'?'Familia':'Alumno'}_${stamp()}.pdf`});
    cover(pdf,{title:role==='familia'?'Informe de seguimiento familiar':'Informe de trayectoria estudiantil',product:'ADA Gestión',description:'Información académica y de seguimiento disponible para el usuario autenticado.'});
    pdf.newPage();pdf.heading('Información disponible',1);pdf.cards([{label:'Boletines',value:data.boletines.length},{label:'Actividades',value:data.actividades.length},{label:'Entregas',value:data.entregas.length},{label:'Registros de asistencia',value:data.asistencia.length}],4);
    pdf.heading('Boletines',1);pdf.table(['Período','Estado','Fecha'],data.boletines.map(x=>[x.periodo||x.trimestre||'—',x.estado||'—',x.fecha_emision||x.created_at||'—']),{widths:[.35,.3,.35]});
    pdf.heading('Seguimiento',1);pdf.table(['Fecha','Descripción','Nivel'],data.seguimientos.slice(0,30).map(x=>[x.fecha||x.created_at||'—',x.descripcion||x.observacion||'—',x.nivel_riesgo||x.nivel||'—']),{widths:[.22,.58,.2]});pdf.save();
  }

  async function generate(type){
    const buttons=document.querySelectorAll('[data-ada-report]');buttons.forEach(b=>b.disabled=true);
    try{
      if(type==='ejecutivo')return await executive();
      if(type==='pedagogico')return await pedagogical();
      if(type==='supervision')return await supervision();
      if(type==='docente')return await teacher();
      if(type==='alumno'||type==='familia')return await studentOrFamily();
      throw new Error('Tipo de informe no reconocido');
    }catch(error){console.error(error);alert(`No se pudo generar el informe: ${error.message||error}`)}
    finally{buttons.forEach(b=>b.disabled=false)}
  }

  async function initCenter(){
    const box=document.getElementById('reportsStatus');if(!box)return;
    try{const data=await loadData(true);const m=metrics(data);box.textContent=`Información actualizada: ${data.cursos.length} cursos, ${m.students.length} estudiantes y ${data.calificaciones.length} calificaciones visibles.`;
      document.querySelectorAll('[data-role-report]').forEach(card=>{const roles=card.dataset.roleReport.split(',');card.hidden=!roles.includes(state.perfil?.rol)});
    }catch(error){box.textContent='No se pudo cargar la información. Verificá la sesión y la conexión.';box.classList.add('error')}
    document.querySelectorAll('[data-ada-report]').forEach(btn=>btn.addEventListener('click',()=>generate(btn.dataset.adaReport)));
  }

  const reportsApi={loadData,generate,executive,pedagogical,supervision,teacher,studentOrFamily};
  window.ADA_REPORTS=reportsApi;
  window.ADAReports=reportsApi;
  window.ADA=window.ADA||{};
  window.ADA.reports=reportsApi;
  document.addEventListener('DOMContentLoaded',initCenter);
})();
