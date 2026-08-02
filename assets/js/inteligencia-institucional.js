const intelState={perfil:null,cursos:[],materias:[],perfiles:[],alumnoCursos:[],asistencia:[],calificaciones:[],programas:[],docenteMaterias:[],seguimientos:[],actividades:[],entregas:[],convivencia:[],boletines:[],metrics:null};
const intelEl=id=>document.getElementById(id);
const intelNum=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const intelPct=n=>Number.isFinite(n)?`${n.toFixed(1)}%`:'—';
const intelText=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const intelDate=v=>{const d=v?new Date(v):null;return d&&!Number.isNaN(d.getTime())?d:null};
const intelArray=v=>Array.isArray(v)?v:[];

async function intelSafe(table,select='*'){
  try{const {data,error}=await supabaseClient.from(table).select(select);if(error)throw error;return data||[]}
  catch(error){console.warn(`ADA Intelligence · ${table}:`,error.message);return[]}
}
function intelName(record,fallback='Sin identificar'){
  if(!record)return fallback;if(typeof record==='string')return record;
  return record.nombre||record.descripcion||record.titulo||record.codigo||fallback;
}
function intelProfileName(r){return [r?.apellido,r?.nombre].filter(Boolean).join(', ')||r?.nombre_completo||r?.email||'Sin identificar'}
function intelProfile(id){return intelState.perfiles.find(x=>String(x.id)===String(id))||intelState.alumnoCursos.find(x=>String(x.alumno_id)===String(id))?.profiles||null}
function intelCourseName(id){return intelName(intelState.cursos.find(x=>String(x.id)===String(id)),'Curso sin identificar')}
function intelSubjectName(id){return intelName(intelState.materias.find(x=>String(x.id)===String(id)),'Materia sin identificar')}
function intelSet(id,value){const e=intelEl(id);if(e)e.textContent=value}
function intelOptions(id,rows,labelFn){const e=intelEl(id);if(!e)return;const first=e.options[0]?.outerHTML||'<option value="">Todos</option>';e.innerHTML=first+rows.map(r=>`<option value="${intelText(r.id)}">${intelText(labelFn(r))}</option>`).join('')}
function intelFilters(){return{curso:intelEl('filtroInteligenciaCurso')?.value||'',materia:intelEl('filtroInteligenciaMateria')?.value||'',desde:intelEl('filtroInteligenciaDesde')?.value||'',hasta:intelEl('filtroInteligenciaHasta')?.value||''}}
function intelDateInRange(value,f){const d=String(value||'').slice(0,10);return(!f.desde||d>=f.desde)&&(!f.hasta||d<=f.hasta)}
function intelGradeValue(r){return intelNum(r.nota??r.valor??r.calificacion??r.promedio??r.nota_final)}
function intelIsAbsent(r){const code=String(r.estado_codigo||r.estado||r.codigo||'').toLowerCase();return Boolean(r.computa_inasistencia)||['ausente','falta','injustificada','ausente_injustificado'].includes(code)}
function intelIsPresent(r){const code=String(r.estado_codigo||r.estado||r.codigo||'').toLowerCase();return['presente','tarde','presente_tarde'].includes(code)||(!intelIsAbsent(r)&&r.computa_inasistencia===false)}
function intelIsApprovedProgram(r){return ['aprobado','publicado','vigente'].includes(String(r.estado||r.estado_codigo||'').toLowerCase())||r.aprobado===true}
function intelIsDelivered(r){return ['entregada','entregado','corregida','corregido','revisada','revisado'].includes(String(r.estado||'').toLowerCase())||Boolean(r.entregado_en||r.fecha_entrega)}
function intelIsPublishedActivity(r){return ['publicada','publicado','activa','activo'].includes(String(r.estado||'').toLowerCase())||r.publicada===true}

function intelRenderBars(id,items,{warn=false,suffix='',maxValue=null}={}){
  const box=intelEl(id);if(!box)return;
  if(!items.length){box.innerHTML='<div class="intel-empty">No hay información suficiente para este indicador.</div>';return}
  const max=maxValue||Math.max(...items.map(x=>Math.abs(x.value)),1);
  box.innerHTML=items.slice(0,12).map(item=>{const width=Math.max(2,Math.min(100,(Math.abs(item.value)/max)*100));return `<div class="intel-bar-row"><div class="intel-bar-label" title="${intelText(item.label)}">${intelText(item.label)}</div><div class="intel-bar-track"><div class="intel-bar-fill ${warn?'warn':''}" style="width:${width}%"></div></div><div class="intel-bar-value">${Number(item.value).toFixed(1)}${suffix}</div></div>`}).join('')
}
function intelPill(level){const cls=level==='Alto'?'high':level==='Bajo'?'ok':'';return `<span class="intel-pill ${cls}">${intelText(level)}</span>`}

function intelFilteredData(){
  const f=intelFilters();
  const attendance=intelState.asistencia.filter(r=>(!f.curso||String(r.curso_id||r.cursos_id||'')===String(f.curso))&&(!f.materia||String(r.materia_id||'')===String(f.materia))&&intelDateInRange(r.fecha||r.creado_en||r.created_at,f));
  const grades=intelState.calificaciones.filter(r=>(!f.curso||String(r.curso_id||r.cursos_id||'')===String(f.curso))&&(!f.materia||String(r.materia_id||'')===String(f.materia))&&intelDateInRange(r.fecha||r.creado_en||r.created_at,f));
  const links=intelState.alumnoCursos.filter(r=>r.activo!==false&&(!f.curso||String(r.curso_id)===String(f.curso)));
  const programs=intelState.programas.filter(r=>(!f.curso||String(r.curso_id||'')===String(f.curso))&&(!f.materia||String(r.materia_id||'')===String(f.materia)));
  const activities=intelState.actividades.filter(r=>(!f.curso||String(r.curso_id||'')===String(f.curso))&&(!f.materia||String(r.materia_id||'')===String(f.materia))&&intelDateInRange(r.fecha_publicacion||r.fecha_entrega||r.creado_en||r.created_at,f));
  const activityIds=new Set(activities.map(r=>String(r.id)));
  const deliveries=intelState.entregas.filter(r=>!activities.length||activityIds.has(String(r.actividad_id)));
  return{f,attendance,grades,links,programs,activities,deliveries};
}

function intelCompute(){
  const d=intelFilteredData();
  const uniqueStudents=new Set(d.links.map(x=>x.alumno_id).filter(Boolean));
  const present=d.attendance.filter(intelIsPresent).length;
  const attendancePct=d.attendance.length?(present/d.attendance.length)*100:null;
  const gradeValues=d.grades.map(intelGradeValue).filter(v=>v!==null);
  const avg=gradeValues.length?gradeValues.reduce((a,b)=>a+b,0)/gradeValues.length:null;
  const approved=d.programs.filter(intelIsApprovedProgram).length;
  const programsPct=d.programs.length?(approved/d.programs.length)*100:null;
  const publishedActivities=d.activities.filter(intelIsPublishedActivity);
  const delivered=d.deliveries.filter(intelIsDelivered).length;
  const expectedDeliveries=Math.max(publishedActivities.length*uniqueStudents.size,d.deliveries.length);
  const deliveryPct=expectedDeliveries?(delivered/expectedDeliveries)*100:null;

  const attendanceByCourse=new Map();
  d.attendance.forEach(r=>{const id=r.curso_id||r.cursos_id||'sin';const x=attendanceByCourse.get(id)||{total:0,absent:0};x.total++;if(intelIsAbsent(r))x.absent++;attendanceByCourse.set(id,x)});
  const courseAbsence=[...attendanceByCourse].map(([id,x])=>({id,label:intelCourseName(id),value:x.total?(x.absent/x.total)*100:0,total:x.total})).sort((a,b)=>b.value-a.value);

  const gradeBySubject=new Map();
  d.grades.forEach(r=>{const id=r.materia_id||'sin';const n=intelGradeValue(r);if(n===null)return;const x=gradeBySubject.get(id)||[];x.push(n);gradeBySubject.set(id,x)});
  const subjects=[...gradeBySubject].map(([id,vals])=>({id,label:intelSubjectName(id),value:vals.reduce((a,b)=>a+b,0)/vals.length,failedPct:(vals.filter(v=>v<6).length/vals.length)*100,count:vals.length})).sort((a,b)=>a.value-b.value);

  const teacherLoads=new Map();
  intelState.docenteMaterias.forEach(r=>{const id=r.docente_id||r.profile_id||'sin';const x=teacherLoads.get(id)||{count:0,profile:r.profiles||intelProfile(id)};x.count++;teacherLoads.set(id,x)});
  const loads=[...teacherLoads].map(([id,x])=>({id,label:intelProfileName(x.profile),value:x.count})).sort((a,b)=>b.value-a.value);
  const avgLoad=loads.length?loads.reduce((s,x)=>s+x.value,0)/loads.length:null;

  const perStudent=new Map();
  d.links.forEach(link=>{const id=link.alumno_id;if(!id)return;perStudent.set(id,{id,profile:link.profiles||intelProfile(id),courseId:link.curso_id,attendance:[],grades:[],activities:0,deliveries:0,followups:0,incidents:0})});
  d.attendance.forEach(r=>{const id=r.alumno_id||r.estudiante_id;if(!id)return;const x=perStudent.get(id)||{id,profile:intelProfile(id),courseId:r.curso_id,attendance:[],grades:[],activities:0,deliveries:0,followups:0,incidents:0};x.attendance.push(r);perStudent.set(id,x)});
  d.grades.forEach(r=>{const id=r.alumno_id||r.estudiante_id;if(!id)return;const x=perStudent.get(id)||{id,profile:intelProfile(id),courseId:r.curso_id,attendance:[],grades:[],activities:0,deliveries:0,followups:0,incidents:0};const n=intelGradeValue(r);if(n!==null)x.grades.push(n);perStudent.set(id,x)});
  d.deliveries.forEach(r=>{const id=r.alumno_id||r.estudiante_id;if(!id)return;const x=perStudent.get(id)||{id,profile:intelProfile(id),courseId:null,attendance:[],grades:[],activities:0,deliveries:0,followups:0,incidents:0};x.deliveries++;perStudent.set(id,x)});
  intelState.seguimientos.forEach(r=>{const id=r.alumno_id||r.estudiante_id;if(!id)return;const x=perStudent.get(id)||{id,profile:intelProfile(id),courseId:r.curso_id,attendance:[],grades:[],activities:0,deliveries:0,followups:0,incidents:0};x.followups++;perStudent.set(id,x)});
  intelState.convivencia.forEach(r=>{const id=r.alumno_id||r.estudiante_id;if(!id)return;const x=perStudent.get(id)||{id,profile:intelProfile(id),courseId:r.curso_id,attendance:[],grades:[],activities:0,deliveries:0,followups:0,incidents:0};x.incidents++;perStudent.set(id,x)});

  const students=[...perStudent.values()].map(x=>{
    const absentee=x.attendance.length?x.attendance.filter(intelIsAbsent).length/x.attendance.length:0;
    const studentAvg=x.grades.length?x.grades.reduce((a,b)=>a+b,0)/x.grades.length:null;
    let score=0;const factors=[];
    if(absentee>=.25){score+=4;factors.push('Ausentismo alto')}else if(absentee>=.15){score+=2;factors.push('Ausentismo medio')}
    if(studentAvg!==null&&studentAvg<6){score+=4;factors.push('Promedio bajo')}else if(studentAvg!==null&&studentAvg<7){score+=2;factors.push('Rendimiento en observación')}
    if(x.followups>0){score+=Math.min(2,x.followups);factors.push('Seguimiento activo')}
    if(x.incidents>0){score+=Math.min(2,x.incidents);factors.push('Convivencia')}
    const level=score>=6?'Alto':score>=3?'Medio':'Bajo';
    return{...x,absentee,avg:studentAvg,score,level,factors};
  });
  const alerts=students.filter(x=>x.level!=='Bajo').sort((a,b)=>b.score-a.score||b.absentee-a.absentee);
  const riskCounts={Alto:students.filter(x=>x.level==='Alto').length,Medio:students.filter(x=>x.level==='Medio').length,Bajo:students.filter(x=>x.level==='Bajo').length};
  const factorCounts=new Map();alerts.forEach(x=>x.factors.forEach(f=>factorCounts.set(f,(factorCounts.get(f)||0)+1)));
  const factors=[...factorCounts].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);

  const courseMetrics=intelState.cursos.map(c=>{
    const cid=String(c.id);const courseLinks=d.links.filter(x=>String(x.curso_id)===cid);const ids=new Set(courseLinks.map(x=>String(x.alumno_id)));
    const att=d.attendance.filter(x=>String(x.curso_id||x.cursos_id||'')===cid);const gp=d.grades.filter(x=>String(x.curso_id||x.cursos_id||'')===cid);
    const ap=att.length?att.filter(intelIsPresent).length/att.length*100:null;const gv=gp.map(intelGradeValue).filter(v=>v!==null);const ga=gv.length?gv.reduce((a,b)=>a+b,0)/gv.length:null;
    const courseAlerts=alerts.filter(x=>String(x.courseId||'')===cid).length;
    return{id:c.id,label:intelName(c),students:ids.size||courseLinks.length,attendance:ap,avg:ga,alerts:courseAlerts};
  }).filter(x=>x.students||x.attendance!==null||x.avg!==null);

  const scoreParts=[];if(attendancePct!==null)scoreParts.push(Math.min(100,attendancePct));if(avg!==null)scoreParts.push(Math.min(100,avg*10));if(programsPct!==null)scoreParts.push(programsPct);if(deliveryPct!==null)scoreParts.push(Math.min(100,deliveryPct));if(students.length)scoreParts.push(Math.max(0,100-(riskCounts.Alto*12+riskCounts.Medio*5)));
  const score=scoreParts.length?scoreParts.reduce((a,b)=>a+b,0)/scoreParts.length:null;
  const scoreLevel=score===null?'medio':score>=80?'bajo':score>=60?'medio':'alto';
  const scoreLabel=score===null?'Sin datos suficientes':score>=80?'Salud institucional favorable':score>=60?'Situación institucional en seguimiento':'Intervención institucional prioritaria';

  const metrics={...d,uniqueStudents,attendancePct,avg,approved,programsPct,deliveryPct,courseAbsence,subjects,loads,avgLoad,students,alerts,riskCounts,factors,courseMetrics,score,scoreLevel,scoreLabel};
  intelState.metrics=metrics;intelRender(metrics);return metrics;
}

function intelRender(m){
  intelSet('intelScore',m.score===null?'—':Math.round(m.score));intelSet('intelScoreLabel',m.scoreLabel);intelEl('intelScoreCard')?.setAttribute('data-level',m.scoreLevel);
  intelSet('intelMatricula',m.uniqueStudents.size);intelSet('intelAsistencia',intelPct(m.attendancePct));intelSet('intelPromedio',m.avg===null?'—':m.avg.toFixed(2));intelSet('intelRiesgo',m.alerts.length);intelSet('intelProgramas',m.programs.length?`${m.approved}/${m.programs.length}`:'—');intelSet('intelEntregas',intelPct(m.deliveryPct));intelSet('intelCargaDocente',m.avgLoad===null?'—':m.avgLoad.toFixed(1));
  intelRenderBars('graficoAusentismoCurso',m.courseAbsence,{warn:true,suffix:'%',maxValue:100});
  intelRenderBars('graficoRendimientoMateria',m.subjects.map(x=>({label:x.label,value:x.value})),{maxValue:10});
  intelRenderBars('graficoCargaDocente',m.loads,{maxValue:Math.max(...m.loads.map(x=>x.value),1)});
  intelRenderBars('factoresRiesgo',m.factors,{warn:true});
  intelRenderTables(m);intelRenderTrends(m);intelRenderSemaphore(m);intelRenderRiskDonut(m);
}
function intelRenderTables(m){
  const critical=m.subjects.filter(x=>x.value<7||x.failedPct>=25);
  intelEl('tablaMateriasCriticas').innerHTML=critical.length?`<table class="intel-table"><thead><tr><th>Materia</th><th>Promedio</th><th>Desaprobación</th><th>Registros</th><th>Estado</th></tr></thead><tbody>${critical.map(x=>`<tr><td>${intelText(x.label)}</td><td>${x.value.toFixed(2)}</td><td>${x.failedPct.toFixed(1)}%</td><td>${x.count}</td><td>${intelPill(x.value<6||x.failedPct>=40?'Alto':'Medio')}</td></tr>`).join('')}</tbody></table>`:'<div class="intel-empty">No se detectaron materias críticas con los registros disponibles.</div>';
  intelEl('tablaAlertasAlumnos').innerHTML=m.alerts.length?`<table class="intel-table"><thead><tr><th>Estudiante</th><th>Curso</th><th>Ausentismo</th><th>Promedio</th><th>Factores</th><th>Nivel</th></tr></thead><tbody>${m.alerts.slice(0,50).map(x=>`<tr><td>${intelText(intelProfileName(x.profile))}</td><td>${intelText(intelCourseName(x.courseId))}</td><td>${(x.absentee*100).toFixed(1)}%</td><td>${x.avg===null?'—':x.avg.toFixed(2)}</td><td>${intelText(x.factors.join(', ')||'Sin detalle')}</td><td>${intelPill(x.level)}</td></tr>`).join('')}</tbody></table>`:'<div class="intel-empty">No se detectaron trayectorias con riesgo medio o alto.</div>';
  intelEl('tablaCursos').innerHTML=m.courseMetrics.length?`<table class="intel-table"><thead><tr><th>Curso</th><th>Estudiantes</th><th>Asistencia</th><th>Promedio</th><th>Alertas</th><th>Prioridad</th></tr></thead><tbody>${m.courseMetrics.sort((a,b)=>(b.alerts-a.alerts)||((a.attendance??100)-(b.attendance??100))).map(x=>{const level=x.alerts>=5||(x.attendance!==null&&x.attendance<75)||(x.avg!==null&&x.avg<6)?'Alto':x.alerts>=2||(x.attendance!==null&&x.attendance<85)||(x.avg!==null&&x.avg<7)?'Medio':'Bajo';return`<tr><td>${intelText(x.label)}</td><td>${x.students}</td><td>${intelPct(x.attendance)}</td><td>${x.avg===null?'—':x.avg.toFixed(2)}</td><td>${x.alerts}</td><td>${intelPill(level)}</td></tr>`}).join('')}</tbody></table>`:'<div class="intel-empty">No hay información suficiente para comparar cursos.</div>';
  const teacherRows=m.loads.map(load=>{const profile=intelProfile(load.id);const programs=intelState.programas.filter(x=>String(x.docente_id||x.creado_por||'')===String(load.id));const approved=programs.filter(intelIsApprovedProgram).length;const activities=intelState.actividades.filter(x=>String(x.docente_id||x.creado_por||'')===String(load.id));return{...load,profile,programs:programs.length,approved,activities:activities.length}});
  intelEl('tablaGestionDocente').innerHTML=teacherRows.length?`<table class="intel-table"><thead><tr><th>Docente</th><th>Asignaciones</th><th>Programas</th><th>Aprobados</th><th>Actividades</th><th>Lectura</th></tr></thead><tbody>${teacherRows.map(x=>`<tr><td>${intelText(x.label)}</td><td>${x.value}</td><td>${x.programs}</td><td>${x.approved}</td><td>${x.activities}</td><td>${intelPill(x.value>Math.max(8,(m.avgLoad||0)*1.7)?'Medio':'Bajo')}</td></tr>`).join('')}</tbody></table>`:'<div class="intel-empty">No hay asignaciones docentes disponibles.</div>';
}
function intelRenderTrends(){
  const box=intelEl('evolucionInstitucional');if(!box)return;const now=new Date(),cut=new Date(now);cut.setDate(cut.getDate()-30);const prev=new Date(cut);prev.setDate(prev.getDate()-30);
  const split=(rows,dateFn)=>({current:rows.filter(r=>{const d=intelDate(dateFn(r));return d&&d>=cut}),previous:rows.filter(r=>{const d=intelDate(dateFn(r));return d&&d>=prev&&d<cut})});
  const a=split(intelState.asistencia,r=>r.fecha||r.creado_en||r.created_at),g=split(intelState.calificaciones,r=>r.fecha||r.creado_en||r.created_at);
  const att=rows=>rows.length?rows.filter(intelIsPresent).length/rows.length*100:null;const grd=rows=>{const v=rows.map(intelGradeValue).filter(x=>x!==null);return v.length?v.reduce((s,x)=>s+x,0)/v.length:null};
  const trend=(cur,old,suffix='')=>cur===null?'—':`${cur.toFixed(1)}${suffix}${old===null?'':` · ${cur-old>=0?'▲':'▼'} ${Math.abs(cur-old).toFixed(1)}`}`;
  box.innerHTML=`<div class="intel-trend-item"><small>Asistencia últimos 30 días</small><strong>${trend(att(a.current),att(a.previous),'%')}</strong></div><div class="intel-trend-item"><small>Promedio últimos 30 días</small><strong>${trend(grd(g.current),grd(g.previous))}</strong></div><div class="intel-trend-item"><small>Registros recientes</small><strong>${a.current.length+g.current.length}</strong></div>`;
}
function intelRenderSemaphore(m){
  const items=[{label:'Asistencia',value:intelPct(m.attendancePct),level:m.attendancePct===null?'medio':m.attendancePct>=85?'bajo':m.attendancePct>=75?'medio':'alto'},{label:'Rendimiento',value:m.avg===null?'—':m.avg.toFixed(2),level:m.avg===null?'medio':m.avg>=7?'bajo':m.avg>=6?'medio':'alto'},{label:'Trayectorias',value:`${m.alerts.length} alertas`,level:m.riskCounts.Alto>0?'alto':m.riskCounts.Medio>0?'medio':'bajo'},{label:'Programas',value:intelPct(m.programsPct),level:m.programsPct===null?'medio':m.programsPct>=90?'bajo':m.programsPct>=70?'medio':'alto'},{label:'Entregas',value:intelPct(m.deliveryPct),level:m.deliveryPct===null?'medio':m.deliveryPct>=80?'bajo':m.deliveryPct>=60?'medio':'alto'},{label:'Carga docente',value:m.avgLoad===null?'—':m.avgLoad.toFixed(1),level:'bajo'}];
  intelEl('semaforoInstitucional').innerHTML=items.map(x=>`<div class="intel-semaphore-item" data-level="${x.level}"><small>${intelText(x.label)}</small><strong>${intelText(x.value)}</strong></div>`).join('');
}
function intelRenderRiskDonut(m){
  const total=m.students.length||1;const high=m.riskCounts.Alto/total*100,medium=m.riskCounts.Medio/total*100;const gradient=`conic-gradient(#c43f35 0 ${high}%,#e2a136 ${high}% ${high+medium}%,#32956a ${high+medium}% 100%)`;
  intelEl('distribucionRiesgo').innerHTML=`<div><div class="intel-donut" style="background:${gradient}"><div class="intel-donut-center"><strong>${m.students.length}</strong><span>estudiantes</span></div></div><div class="intel-legend"><div class="intel-legend-row"><span>Alto</span><strong>${m.riskCounts.Alto}</strong></div><div class="intel-legend-row"><span>Medio</span><strong>${m.riskCounts.Medio}</strong></div><div class="intel-legend-row"><span>Bajo</span><strong>${m.riskCounts.Bajo}</strong></div></div></div>`;
}

async function intelLoad(){
  const status=intelEl('estadoInteligencia');status.className='intelligence-status';status.textContent='Consultando información institucional...';
  try{
    const context=await adaRequirePageAccess(['admin','directivo']);if(!context)return;intelState.perfil=context.perfil;
    const [cursos,materias,perfiles,alumnoCursos,asistencia,calificaciones,programas,docenteMaterias,seguimientos,actividades,entregas,convivencia,boletines]=await Promise.all([
      intelSafe('cursos','*'),intelSafe('materias','*'),intelSafe('profiles','id,nombre,apellido,email,rol,activo'),intelSafe('alumno_cursos','*'),intelSafe('v_reporte_asistencia_detalle','*'),intelSafe('calificaciones','*'),intelSafe('programas_materia','*'),intelSafe('docente_materias','*'),intelSafe('v_reporte_seguimiento_detalle','*'),intelSafe('actividades','*'),intelSafe('entregas_actividades','*'),intelSafe('convivencia_casos','*'),intelSafe('boletines','*')
    ]);
    Object.assign(intelState,{cursos,materias,perfiles,alumnoCursos,asistencia,calificaciones,programas,docenteMaterias,seguimientos,actividades,entregas,convivencia,boletines});
    intelOptions('filtroInteligenciaCurso',cursos,intelName);intelOptions('filtroInteligenciaMateria',materias,intelName);intelCompute();
    const visible=[asistencia,calificaciones,programas,actividades,entregas].filter(x=>x.length).length;status.textContent=visible>=3?'Indicadores actualizados correctamente.':'Panel cargado con información parcial. Algunos indicadores requieren más registros.';
  }catch(error){console.error(error);status.className='intelligence-status error';status.textContent='No se pudo cargar el Centro de Inteligencia. Verificá la conexión y los permisos.'}
}

function intelExecutiveReport(){
  const m=intelState.metrics||intelCompute();const generated=new Date().toLocaleString('es-AR');const f=intelFilters();const critical=m.subjects.filter(x=>x.value<7||x.failedPct>=25).slice(0,12);const priorityCourses=m.courseMetrics.sort((a,b)=>b.alerts-a.alerts).slice(0,10);
  const popup=window.open('','_blank','width=1100,height=850');if(!popup)return alert('El navegador bloqueó la ventana del informe.');
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Informe ejecutivo ADA</title><style>body{font-family:Arial,sans-serif;color:#1c2f40;margin:36px}h1{margin-bottom:4px;color:#7a1f2b}h2{margin-top:28px;border-bottom:1px solid #ccd6df;padding-bottom:7px}.meta{color:#647487}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.k{border:1px solid #d8e0e8;border-radius:10px;padding:14px}.k strong{display:block;font-size:24px;margin-top:6px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #e2e8ee;text-align:left;font-size:12px}.note{background:#f2f6f9;padding:12px;border-radius:8px;margin-top:24px}.conclusion{border-left:5px solid #7a1f2b;padding:12px;background:#fff5f6}@media print{button{display:none}.grid{grid-template-columns:repeat(4,1fr)}}</style></head><body><h1>Informe ejecutivo institucional</h1><p class="meta">Generado por ADA Intelligence · ${intelText(generated)} · Curso: ${intelText(f.curso?intelCourseName(f.curso):'Todos')} · Materia: ${intelText(f.materia?intelSubjectName(f.materia):'Todas')}</p><div class="conclusion"><strong>ADA Score: ${m.score===null?'—':Math.round(m.score)}/100</strong><br>${intelText(m.scoreLabel)}</div><div class="grid"><div class="k">Matrícula<strong>${m.uniqueStudents.size}</strong></div><div class="k">Asistencia<strong>${intelPct(m.attendancePct)}</strong></div><div class="k">Promedio<strong>${m.avg===null?'—':m.avg.toFixed(2)}</strong></div><div class="k">Alertas<strong>${m.alerts.length}</strong></div><div class="k">Programas aprobados<strong>${m.programs.length?`${m.approved}/${m.programs.length}`:'—'}</strong></div><div class="k">Entregas<strong>${intelPct(m.deliveryPct)}</strong></div><div class="k">Carga docente<strong>${m.avgLoad===null?'—':m.avgLoad.toFixed(1)}</strong></div><div class="k">Riesgo alto<strong>${m.riskCounts.Alto}</strong></div></div><h2>Cursos prioritarios</h2><table><thead><tr><th>Curso</th><th>Asistencia</th><th>Promedio</th><th>Alertas</th></tr></thead><tbody>${priorityCourses.map(x=>`<tr><td>${intelText(x.label)}</td><td>${intelPct(x.attendance)}</td><td>${x.avg===null?'—':x.avg.toFixed(2)}</td><td>${x.alerts}</td></tr>`).join('')||'<tr><td colspan="4">Sin datos suficientes.</td></tr>'}</tbody></table><h2>Materias que requieren atención</h2><table><thead><tr><th>Materia</th><th>Promedio</th><th>Desaprobación</th></tr></thead><tbody>${critical.map(x=>`<tr><td>${intelText(x.label)}</td><td>${x.value.toFixed(2)}</td><td>${x.failedPct.toFixed(1)}%</td></tr>`).join('')||'<tr><td colspan="3">Sin alertas.</td></tr>'}</tbody></table><h2>Trayectorias priorizadas</h2><table><thead><tr><th>Estudiante</th><th>Curso</th><th>Ausentismo</th><th>Promedio</th><th>Nivel</th></tr></thead><tbody>${m.alerts.slice(0,20).map(x=>`<tr><td>${intelText(intelProfileName(x.profile))}</td><td>${intelText(intelCourseName(x.courseId))}</td><td>${(x.absentee*100).toFixed(1)}%</td><td>${x.avg===null?'—':x.avg.toFixed(2)}</td><td>${x.level}</td></tr>`).join('')||'<tr><td colspan="5">Sin alertas.</td></tr>'}</tbody></table><p class="note">Los indicadores son orientativos y deben interpretarse junto con el criterio profesional de los equipos institucionales.</p><button onclick="window.print()">Guardar como PDF / Imprimir</button></body></html>`);popup.document.close();
}
function intelExportCSV(){
  const m=intelState.metrics||intelCompute();const rows=[['Indicador','Valor'],['ADA Score',m.score===null?'':Math.round(m.score)],['Matrícula',m.uniqueStudents.size],['Asistencia',m.attendancePct??''],['Promedio',m.avg??''],['Alertas',m.alerts.length],['Programas aprobados',m.approved],['Programas totales',m.programs.length],['Entregas',m.deliveryPct??''],['Carga docente promedio',m.avgLoad??''],[],['Curso','Estudiantes','Asistencia','Promedio','Alertas'],...m.courseMetrics.map(x=>[x.label,x.students,x.attendance??'',x.avg??'',x.alerts]),[],['Materia','Promedio','Desaprobación'],...m.subjects.map(x=>[x.label,x.value,x.failedPct])];
  const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ADA_Intelligence_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);
}
function intelAnswerQuery(){
  const q=(intelEl('intelConsulta')?.value||'').trim();const box=intelEl('intelRespuesta');if(!q){box.textContent='Escribí una consulta para analizar.';return}const m=intelState.metrics||intelCompute();const n=q.toLowerCase();let answer='';
  if(n.includes('curso')&&(n.includes('riesgo')||n.includes('desaprob'))){const rows=m.courseMetrics.sort((a,b)=>b.alerts-a.alerts||((a.attendance??100)-(b.attendance??100))).slice(0,5);answer=`Cursos que requieren mayor atención:\n${rows.map((x,i)=>`${i+1}. ${x.label}: ${x.alerts} alertas, asistencia ${intelPct(x.attendance)}, promedio ${x.avg===null?'sin dato':x.avg.toFixed(2)}.`).join('\n')||'No hay datos suficientes.'}`}
  else if((n.includes('alumno')||n.includes('estudiante'))&&(n.includes('baj')||n.includes('riesgo')||n.includes('rendimiento'))){answer=`Trayectorias priorizadas:\n${m.alerts.slice(0,10).map((x,i)=>`${i+1}. ${intelProfileName(x.profile)} (${intelCourseName(x.courseId)}): nivel ${x.level}; ${x.factors.join(', ')}.`).join('\n')||'No se detectaron alertas.'}`}
  else if(n.includes('materia')&&(n.includes('crítica')||n.includes('critica')||n.includes('desaprob'))){const rows=m.subjects.filter(x=>x.value<7||x.failedPct>=25).slice(0,10);answer=`Materias críticas:\n${rows.map((x,i)=>`${i+1}. ${x.label}: promedio ${x.value.toFixed(2)}, desaprobación ${x.failedPct.toFixed(1)}%.`).join('\n')||'No se detectaron materias críticas.'}`}
  else if(n.includes('informe')||n.includes('supervisión')||n.includes('supervision')){answer=`Síntesis para supervisión:\nADA Score ${m.score===null?'sin cálculo':Math.round(m.score)+'/100'} (${m.scoreLabel}). Matrícula: ${m.uniqueStudents.size}. Asistencia: ${intelPct(m.attendancePct)}. Promedio: ${m.avg===null?'sin dato':m.avg.toFixed(2)}. Alertas de trayectoria: ${m.alerts.length}. Programas aprobados: ${m.programs.length?`${m.approved} de ${m.programs.length}`:'sin datos'}.\n\nUsá “Informe ejecutivo PDF” para generar el documento completo.`}
  else if(n.includes('asistencia')||n.includes('ausentismo')){answer=`La asistencia general es ${intelPct(m.attendancePct)}. Los cursos con mayor ausentismo son:\n${m.courseAbsence.slice(0,5).map((x,i)=>`${i+1}. ${x.label}: ${x.value.toFixed(1)}%.`).join('\n')||'No hay datos suficientes.'}`}
  else if(n.includes('docente')||n.includes('carga')){answer=`Carga docente promedio: ${m.avgLoad===null?'sin dato':m.avgLoad.toFixed(1)} asignaciones. Mayor carga:\n${m.loads.slice(0,8).map((x,i)=>`${i+1}. ${x.label}: ${x.value} asignaciones.`).join('\n')||'No hay asignaciones visibles.'}`}
  else{answer=`Resumen institucional:\nADA Score ${m.score===null?'—':Math.round(m.score)}/100. Asistencia ${intelPct(m.attendancePct)}. Promedio ${m.avg===null?'—':m.avg.toFixed(2)}. ${m.alerts.length} trayectorias con alerta. ${m.subjects.filter(x=>x.value<7||x.failedPct>=25).length} materias requieren atención.\n\nPodés preguntar por cursos en riesgo, alumnos con bajo rendimiento, materias críticas, asistencia, carga docente o solicitar un informe para supervisión.`}
  box.innerHTML=`<strong>Análisis ADA</strong>\n${intelText(answer)}`;
}
function intelSetupTabs(){document.querySelectorAll('.intel-tab').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.intel-tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.intel-panel-page').forEach(x=>x.classList.remove('active'));btn.classList.add('active');document.querySelector(`[data-panel-page="${btn.dataset.panel}"]`)?.classList.add('active')}));document.querySelectorAll('[data-query]').forEach(btn=>btn.addEventListener('click',()=>{intelEl('intelConsulta').value=btn.dataset.query;intelAnswerQuery()}))}
document.addEventListener('DOMContentLoaded',()=>{intelSetupTabs();intelEl('btnActualizarInteligencia')?.addEventListener('click',intelLoad);intelEl('btnAplicarFiltrosInteligencia')?.addEventListener('click',intelCompute);intelEl('btnInformeEjecutivo')?.addEventListener('click',intelExecutiveReport);intelEl('btnExportarCSV')?.addEventListener('click',intelExportCSV);intelEl('btnConsultarInteligencia')?.addEventListener('click',intelAnswerQuery);intelLoad()});
