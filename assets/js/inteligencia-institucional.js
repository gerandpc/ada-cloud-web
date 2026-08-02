const intelState={perfil:null,cursos:[],materias:[],alumnoCursos:[],asistencia:[],calificaciones:[],programas:[],docenteMaterias:[],seguimientos:[]};
const intelEl=(id)=>document.getElementById(id);
const intelNum=(v)=>{const n=Number(v);return Number.isFinite(n)?n:null};
const intelPct=(n)=>Number.isFinite(n)?`${n.toFixed(1)}%`:'—';
const intelText=(v)=>String(v??'').replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

async function intelSafe(table,select='*'){
  try{const {data,error}=await supabaseClient.from(table).select(select);if(error)throw error;return data||[]}
  catch(error){console.warn(`Inteligencia: ${table}`,error.message);return[]}
}
function intelName(record, fallback='Sin identificar'){
  if(!record)return fallback;
  if(typeof record==='string')return record;
  return record.nombre||record.descripcion||record.titulo||fallback;
}
function intelCourseName(id){return intelName(intelState.cursos.find(x=>String(x.id)===String(id)),'Curso sin identificar')}
function intelSubjectName(id){return intelName(intelState.materias.find(x=>String(x.id)===String(id)),'Materia sin identificar')}
function intelProfileName(r){return [r?.apellido,r?.nombre].filter(Boolean).join(', ')||r?.email||'Estudiante'}
function intelSet(id,value){const e=intelEl(id);if(e)e.textContent=value}
function intelOptions(id,rows,labelFn){const e=intelEl(id);if(!e)return;const first=e.options[0]?.outerHTML||'<option value="">Todos</option>';e.innerHTML=first+rows.map(r=>`<option value="${intelText(r.id)}">${intelText(labelFn(r))}</option>`).join('')}

function intelFilters(){return{curso:intelEl('filtroInteligenciaCurso')?.value||'',materia:intelEl('filtroInteligenciaMateria')?.value||'',desde:intelEl('filtroInteligenciaDesde')?.value||'',hasta:intelEl('filtroInteligenciaHasta')?.value||''}}
function intelFilteredAttendance(){const f=intelFilters();return intelState.asistencia.filter(r=>(!f.curso||String(r.curso_id)===String(f.curso))&&(!f.materia||String(r.materia_id)===String(f.materia))&&(!f.desde||String(r.fecha||'')>=f.desde)&&(!f.hasta||String(r.fecha||'')<=f.hasta))}
function intelFilteredGrades(){const f=intelFilters();return intelState.calificaciones.filter(r=>(!f.curso||String(r.curso_id||r.cursos_id||'')===String(f.curso))&&(!f.materia||String(r.materia_id)===String(f.materia))) }

function intelRenderBars(id,items,{warn=false,suffix='',maxValue=null}={}){
  const box=intelEl(id);if(!box)return;
  if(!items.length){box.innerHTML='<div class="intel-empty">No hay información suficiente para este indicador.</div>';return}
  const max=maxValue||Math.max(...items.map(x=>x.value),1);
  box.innerHTML=items.slice(0,10).map(item=>{const width=Math.max(2,Math.min(100,(item.value/max)*100));return `<div class="intel-bar-row"><div class="intel-bar-label" title="${intelText(item.label)}">${intelText(item.label)}</div><div class="intel-bar-track"><div class="intel-bar-fill ${warn?'warn':''}" style="width:${width}%"></div></div><div class="intel-bar-value">${Number(item.value).toFixed(1)}${suffix}</div></div>`}).join('')
}
function intelGradeValue(r){return intelNum(r.nota??r.valor??r.calificacion??r.promedio)}
function intelIsAbsent(r){return Boolean(r.computa_inasistencia)||['ausente','falta','injustificada'].includes(String(r.estado_codigo||r.estado||'').toLowerCase())}
function intelIsPresent(r){return ['presente','tarde'].includes(String(r.estado_codigo||r.estado||'').toLowerCase())||(!intelIsAbsent(r)&&r.computa_inasistencia===false)}

function intelCompute(){
  const attendance=intelFilteredAttendance();const grades=intelFilteredGrades();const f=intelFilters();
  const activeLinks=intelState.alumnoCursos.filter(x=>x.activo!==false&&(!f.curso||String(x.curso_id)===String(f.curso)));
  const uniqueStudents=new Set(activeLinks.map(x=>x.alumno_id).filter(Boolean));
  const present=attendance.filter(intelIsPresent).length;const attendancePct=attendance.length?(present/attendance.length)*100:null;
  const gradeValues=grades.map(intelGradeValue).filter(v=>v!==null);const avg=gradeValues.length?gradeValues.reduce((a,b)=>a+b,0)/gradeValues.length:null;
  const programs=intelState.programas.filter(p=>!f.materia||String(p.materia_id)===String(f.materia));const approved=programs.filter(p=>['aprobado','aprobada','publicado','publicada'].includes(String(p.estado||'').toLowerCase())).length;
  const activeTeachers=new Set(intelState.docenteMaterias.map(x=>x.docente_id).filter(Boolean));const avgLoad=activeTeachers.size?intelState.docenteMaterias.length/activeTeachers.size:null;

  const byStudent={};
  attendance.forEach(r=>{const id=r.alumno_id;if(!id)return;byStudent[id]??={abs:0,total:0,grades:[],priority:0,profile:r};byStudent[id].total++;if(intelIsAbsent(r))byStudent[id].abs++});
  grades.forEach(r=>{const id=r.alumno_id;if(!id)return;byStudent[id]??={abs:0,total:0,grades:[],priority:0,profile:r};const v=intelGradeValue(r);if(v!==null)byStudent[id].grades.push(v)});
  intelState.seguimientos.forEach(r=>{const id=r.alumno_id;if(!id)return;byStudent[id]??={abs:0,total:0,grades:[],priority:0,profile:r};if(String(r.prioridad||'').toLowerCase()==='alta')byStudent[id].priority+=2;else if(String(r.prioridad||'').toLowerCase()==='media')byStudent[id].priority+=1});
  const alerts=Object.entries(byStudent).map(([id,x])=>{const absentee=x.total?x.abs/x.total:0;const studentAvg=x.grades.length?x.grades.reduce((a,b)=>a+b,0)/x.grades.length:null;let score=x.priority;if(absentee>=.25)score+=3;else if(absentee>=.15)score+=2;if(studentAvg!==null&&studentAvg<6)score+=3;else if(studentAvg!==null&&studentAvg<7)score+=1;return{id,score,absentee,avg:studentAvg,profile:x.profile}}).filter(x=>x.score>=3).sort((a,b)=>b.score-a.score);

  intelSet('intelMatricula',uniqueStudents.size||'—');intelSet('intelAsistencia',intelPct(attendancePct));intelSet('intelPromedio',avg===null?'—':avg.toFixed(2));intelSet('intelRiesgo',alerts.length);intelSet('intelProgramas',programs.length?`${approved}/${programs.length}`:'—');intelSet('intelCargaDocente',avgLoad===null?'—':avgLoad.toFixed(1));

  const attendByCourse={};attendance.forEach(r=>{const id=r.curso_id||r.curso||'sin';attendByCourse[id]??={total:0,abs:0,label:r.curso||intelCourseName(id)};attendByCourse[id].total++;if(intelIsAbsent(r))attendByCourse[id].abs++});
  intelRenderBars('graficoAusentismoCurso',Object.values(attendByCourse).map(x=>({label:x.label,value:x.total?(x.abs/x.total)*100:0})).sort((a,b)=>b.value-a.value),{warn:true,suffix:'%',maxValue:100});

  const gradeBySubject={};grades.forEach(r=>{const id=r.materia_id||'sin';const v=intelGradeValue(r);if(v===null)return;gradeBySubject[id]??={sum:0,count:0,failed:0,label:r.materia||r.materias?.nombre||intelSubjectName(id)};gradeBySubject[id].sum+=v;gradeBySubject[id].count++;if(v<6)gradeBySubject[id].failed++});
  const subjects=Object.values(gradeBySubject).map(x=>({label:x.label,value:x.sum/x.count,count:x.count,failedPct:(x.failed/x.count)*100})).sort((a,b)=>a.value-b.value);
  intelRenderBars('graficoRendimientoMateria',[...subjects].sort((a,b)=>b.value-a.value),{suffix:'',maxValue:10});
  const critical=subjects.filter(x=>x.value<7||x.failedPct>=25).slice(0,10);intelEl('tablaMateriasCriticas').innerHTML=critical.length?`<table class="intel-table"><thead><tr><th>Materia</th><th>Promedio</th><th>Desaprobación</th><th>Estado</th></tr></thead><tbody>${critical.map(x=>`<tr><td>${intelText(x.label)}</td><td>${x.value.toFixed(2)}</td><td>${x.failedPct.toFixed(1)}%</td><td><span class="intel-pill ${x.value<6?'high':''}">${x.value<6?'Crítica':'Atención'}</span></td></tr>`).join('')}</tbody></table>`:'<div class="intel-empty">No se detectaron materias críticas con los registros disponibles.</div>';

  intelEl('tablaAlertasAlumnos').innerHTML=alerts.length?`<table class="intel-table"><thead><tr><th>Estudiante</th><th>Ausentismo</th><th>Promedio</th><th>Nivel</th></tr></thead><tbody>${alerts.slice(0,15).map(x=>`<tr><td>${intelText(intelProfileName(x.profile))}</td><td>${(x.absentee*100).toFixed(1)}%</td><td>${x.avg===null?'—':x.avg.toFixed(2)}</td><td><span class="intel-pill ${x.score>=6?'high':''}">${x.score>=6?'Alto':'Medio'}</span></td></tr>`).join('')}</tbody></table>`:'<div class="intel-empty">No se detectaron alertas con la información disponible.</div>';

  const load={};intelState.docenteMaterias.forEach(r=>{const id=r.docente_id||'sin';const label=r.profiles?intelProfileName(r.profiles):r.docente||'Docente';load[id]??={label,value:0};load[id].value++});intelRenderBars('graficoCargaDocente',Object.values(load).sort((a,b)=>b.value-a.value),{suffix:''});
  const metrics={attendancePct,avg,alerts,subjects,programs,approved,uniqueStudents,avgLoad};intelRenderScore(metrics);intelRenderEvolution();return metrics;
}


function intelClamp(n,min=0,max=100){return Math.max(min,Math.min(max,n))}
function intelScore(metrics){
  const attendance=metrics.attendancePct===null?50:metrics.attendancePct;
  const grade=metrics.avg===null?50:intelClamp((metrics.avg/10)*100);
  const programs=metrics.programs.length?intelClamp((metrics.approved/metrics.programs.length)*100):50;
  const riskPenalty=Math.min(35,metrics.alerts.length*2);
  return Math.round(intelClamp(attendance*.35+grade*.35+programs*.30-riskPenalty));
}
function intelRenderScore(metrics){
  const score=intelScore(metrics),card=intelEl('intelScoreCard');
  const level=score>=80?'alto':score>=60?'medio':'bajo';
  intelSet('intelScore',`${score}/100`);intelSet('intelScoreLabel',score>=80?'Estado institucional favorable':score>=60?'Estado institucional con aspectos a fortalecer':'Estado institucional prioritario');
  if(card)card.dataset.level=level;
}
function intelRenderEvolution(){
  const box=intelEl('evolucionInstitucional');if(!box)return;
  const dated=[...intelState.asistencia,...intelState.calificaciones].filter(r=>r.fecha||r.creado_en||r.created_at);
  if(!dated.length){box.innerHTML='<div class="intel-empty">No hay registros fechados suficientes para comparar períodos.</div>';return}
  const now=new Date(),cut=new Date(now);cut.setDate(cut.getDate()-30);
  const prev=new Date(cut);prev.setDate(prev.getDate()-30);
  const dateOf=r=>new Date(r.fecha||r.creado_en||r.created_at);
  const currentA=intelState.asistencia.filter(r=>dateOf(r)>=cut),previousA=intelState.asistencia.filter(r=>dateOf(r)>=prev&&dateOf(r)<cut);
  const currentG=intelState.calificaciones.filter(r=>dateOf(r)>=cut),previousG=intelState.calificaciones.filter(r=>dateOf(r)>=prev&&dateOf(r)<cut);
  const attendancePct=rows=>rows.length?(rows.filter(intelIsPresent).length/rows.length)*100:null;
  const gradeAvg=rows=>{const v=rows.map(intelGradeValue).filter(x=>x!==null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
  const trend=(cur,prev,suffix='')=>cur===null?'—':`${cur.toFixed(1)}${suffix}${prev===null?'':` (${cur-prev>=0?'+':''}${(cur-prev).toFixed(1)})`}`;
  box.innerHTML=`<div class="intel-trend-item"><small>Asistencia últimos 30 días</small><strong>${trend(attendancePct(currentA),attendancePct(previousA),'%')}</strong></div><div class="intel-trend-item"><small>Promedio últimos 30 días</small><strong>${trend(gradeAvg(currentG),gradeAvg(previousG))}</strong></div><div class="intel-trend-item"><small>Registros recientes</small><strong>${currentA.length+currentG.length}</strong></div>`;
}

async function intelLoad(){
  const status=intelEl('estadoInteligencia');status.className='intelligence-status';status.textContent='Consultando información institucional...';
  try{
    const context=await adaRequirePageAccess(['admin','directivo']);if(!context)return;intelState.perfil=context.perfil;
    const [cursos,materias,alumnoCursos,asistencia,calificaciones,programas,docenteMaterias,seguimientos]=await Promise.all([
      intelSafe('cursos','*'),intelSafe('materias','*'),intelSafe('alumno_cursos','alumno_id,curso_id,activo,profiles(nombre,apellido,email),cursos(nombre)'),intelSafe('v_reporte_asistencia_detalle','*'),intelSafe('calificaciones','*'),intelSafe('programas_materia','*'),intelSafe('docente_materias','docente_id,materia_id,profiles(nombre,apellido,email),materias(nombre)'),intelSafe('v_reporte_seguimiento_detalle','*')
    ]);
    Object.assign(intelState,{cursos,materias,alumnoCursos,asistencia,calificaciones,programas,docenteMaterias,seguimientos});
    intelOptions('filtroInteligenciaCurso',cursos,x=>intelName(x));intelOptions('filtroInteligenciaMateria',materias,x=>intelName(x));intelCompute();
    const unavailable=[['asistencia',asistencia],['calificaciones',calificaciones],['asignaciones',docenteMaterias]].filter(([,v])=>!v.length).map(([k])=>k);
    status.textContent=unavailable.length?`Panel cargado. Sin datos visibles en: ${unavailable.join(', ')}.`:'Indicadores actualizados correctamente.';
  }catch(error){console.error(error);status.className='intelligence-status error';status.textContent='No se pudo cargar el Centro de Inteligencia. Verificá la conexión y los permisos RLS.'}
}
function intelExecutiveReport(){
  const metrics=intelCompute();const generated=new Date().toLocaleString('es-AR');const f=intelFilters();
  const popup=window.open('','_blank','width=1000,height=800');if(!popup)return alert('El navegador bloqueó la ventana del informe.');
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Informe ejecutivo ADA</title><style>body{font-family:Arial,sans-serif;color:#1c2f40;margin:36px}h1{margin-bottom:4px}h2{margin-top:28px;border-bottom:1px solid #ccd6df;padding-bottom:7px}.meta{color:#647487}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.k{border:1px solid #d8e0e8;border-radius:10px;padding:14px}.k strong{display:block;font-size:24px;margin-top:6px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #e2e8ee;text-align:left;font-size:12px}.note{background:#f2f6f9;padding:12px;border-radius:8px;margin-top:24px}@media print{button{display:none}}</style></head><body><h1>Informe ejecutivo institucional</h1><p class="meta">Generado por ADA · ${intelText(generated)} · Curso: ${intelText(f.curso?intelCourseName(f.curso):'Todos')} · Materia: ${intelText(f.materia?intelSubjectName(f.materia):'Todas')}</p><div class="grid"><div class="k">Matrícula<strong>${metrics.uniqueStudents.size}</strong></div><div class="k">Asistencia<strong>${intelPct(metrics.attendancePct)}</strong></div><div class="k">Promedio<strong>${metrics.avg===null?'—':metrics.avg.toFixed(2)}</strong></div><div class="k">Alertas<strong>${metrics.alerts.length}</strong></div><div class="k">Programas aprobados<strong>${metrics.programs.length?`${metrics.approved}/${metrics.programs.length}`:'—'}</strong></div><div class="k">Carga docente promedio<strong>${metrics.avgLoad===null?'—':metrics.avgLoad.toFixed(1)}</strong></div></div><h2>Materias que requieren atención</h2><table><thead><tr><th>Materia</th><th>Promedio</th><th>Desaprobación</th></tr></thead><tbody>${metrics.subjects.filter(x=>x.value<7||x.failedPct>=25).slice(0,12).map(x=>`<tr><td>${intelText(x.label)}</td><td>${x.value.toFixed(2)}</td><td>${x.failedPct.toFixed(1)}%</td></tr>`).join('')||'<tr><td colspan="3">Sin alertas con los registros disponibles.</td></tr>'}</tbody></table><h2>Trayectorias priorizadas</h2><table><thead><tr><th>Estudiante</th><th>Ausentismo</th><th>Promedio</th><th>Nivel</th></tr></thead><tbody>${metrics.alerts.slice(0,15).map(x=>`<tr><td>${intelText(intelProfileName(x.profile))}</td><td>${(x.absentee*100).toFixed(1)}%</td><td>${x.avg===null?'—':x.avg.toFixed(2)}</td><td>${x.score>=6?'Alto':'Medio'}</td></tr>`).join('')||'<tr><td colspan="4">Sin alertas con los registros disponibles.</td></tr>'}</tbody></table><p class="note">Los indicadores son orientativos, dependen de la calidad y completitud de los registros y deben interpretarse junto con el criterio profesional de los equipos institucionales.</p><button onclick="window.print()">Guardar como PDF / Imprimir</button></body></html>`);popup.document.close();
}
document.addEventListener('DOMContentLoaded',()=>{intelEl('btnActualizarInteligencia')?.addEventListener('click',intelLoad);intelEl('btnAplicarFiltrosInteligencia')?.addEventListener('click',intelCompute);intelEl('btnInformeEjecutivo')?.addEventListener('click',intelExecutiveReport);intelLoad()});
