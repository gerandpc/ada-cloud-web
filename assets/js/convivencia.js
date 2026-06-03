let cvPerfil = null;
let cvCasos = [];
let cvAlumnos = [];
let cvCursos = [];
const BUCKET_CV = 'ada-convivencia';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    cvPerfil = await obtenerSesionPerfil();
    if (!cvPerfil) return;
    setupTabs();
    adaptarVistaPorRol();
    await Promise.all([cargarCatalogos(), cargarCasos(), cargarResumen()]);
    bindEvents();
    setMensaje('Módulo listo.', 'success');
  } catch (error) {
    console.error(error);
    setMensaje(error.message || 'No se pudo abrir el módulo de convivencia.', 'error');
  }
});

function bindEvents() {
  document.getElementById('btnActualizarConvivencia')?.addEventListener('click', async () => {
    await Promise.all([cargarCasos(), cargarResumen()]);
  });
  document.getElementById('formConvivencia')?.addEventListener('submit', guardarCaso);
  document.getElementById('btnLimpiarCv')?.addEventListener('click', () => document.getElementById('formConvivencia')?.reset());
  document.getElementById('filtroCvEstado')?.addEventListener('change', renderCasos);
  document.getElementById('filtroCvGravedad')?.addEventListener('change', renderCasos);
}

function setupTabs() {
  const tabs = document.querySelectorAll('.cv-tab');
  const panels = document.querySelectorAll('.cv-tab-panel');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab)?.classList.add('active');
    });
  });
}

function adaptarVistaPorRol() {
  const rol = (cvPerfil?.rol || '').toLowerCase();
  document.querySelectorAll('[data-area-only="gestion"]').forEach((el) => {
    el.style.display = ['admin','directivo','secretaria','preceptor'].includes(rol) ? '' : 'none';
  });
  document.querySelectorAll('[data-area-only="familia"]').forEach((el) => {
    el.style.display = rol === 'familia' ? '' : 'none';
  });
  if (rol === 'familia') {
    document.querySelector('.cv-tab[data-tab="tab-firma"]')?.classList.add('active');
    document.querySelector('.cv-tab[data-tab="tab-seguimiento"]')?.classList.remove('active');
    document.querySelectorAll('.cv-tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-firma')?.classList.add('active');
  }
}

async function cargarCatalogos() {
  const [alumnosRes, cursosRes] = await Promise.all([
    supabaseClient.from('alumnos').select('id,nombre,apellido,curso_id,familia_id').order('apellido'),
    supabaseClient.from('cursos').select('id,nombre,anio,division').order('anio')
  ]);
  if (alumnosRes.error && !String(alumnosRes.error.message).includes('relation')) throw alumnosRes.error;
  if (cursosRes.error && !String(cursosRes.error.message).includes('relation')) throw cursosRes.error;
  cvAlumnos = alumnosRes.data || [];
  cvCursos = cursosRes.data || [];
  cargarSelect(document.getElementById('cvAlumno'), cvAlumnos.map(a => ({ value:a.id, text:`${a.apellido}, ${a.nombre}` })));
  cargarSelect(document.getElementById('cvCurso'), cvCursos.map(c => ({ value:c.id, text:c.nombre || `${c.anio || ''} ${c.division || ''}`.trim() })));
}

function cargarSelect(select, options) {
  if (!select) return;
  select.innerHTML = '<option value="">Seleccionar...</option>' + options.map(o => `<option value="${o.value}">${o.text}</option>`).join('');
}

async function guardarCaso(e) {
  e.preventDefault();
  const payload = {
    alumno_id: document.getElementById('cvAlumno').value || null,
    curso_id: document.getElementById('cvCurso').value || null,
    fecha_hecho: document.getElementById('cvFecha').value || null,
    gravedad: document.getElementById('cvGravedad').value,
    tipo_hecho: document.getElementById('cvTipo').value,
    descreditos: Number(document.getElementById('cvDescreditos').value || 0),
    descripcion: document.getElementById('cvDescripcion').value.trim(),
    sancion_aplicada: document.getElementById('cvSancion').value.trim(),
    requiere_firma_familia: document.getElementById('cvRequiereFirma').checked,
    visible_secretaria: document.getElementById('cvVisibleSecretaria').checked,
    estado: document.getElementById('cvRequiereFirma').checked ? 'notificado' : 'pendiente',
    creado_por: cvPerfil.id || cvPerfil.user_id || null
  };

  const file = document.getElementById('cvArchivo').files?.[0];
  if (file) {
    payload.archivo_adjunto_path = await subirArchivoCaso(file, payload.alumno_id || 'sin_alumno');
    payload.archivo_adjunto_nombre = file.name;
  }

  const { error } = await supabaseClient.from('convivencia_casos').insert(payload);
  if (error) throw error;

  setMensaje('Caso registrado correctamente.', 'success');
  document.getElementById('formConvivencia').reset();
  await Promise.all([cargarCasos(), cargarResumen()]);
}

async function subirArchivoCaso(file, alumnoId) {
  const cleanName = file.name.replace(/\s+/g, '_');
  const path = `casos/${new Date().getFullYear()}/alumno_${alumnoId}/${Date.now()}_${cleanName}`;
  const { error } = await supabaseClient.storage.from(BUCKET_CV).upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

async function cargarCasos() {
  const rol = (cvPerfil?.rol || '').toLowerCase();
  let query = supabaseClient.from('convivencia_casos').select('*').order('fecha_hecho', { ascending:false });
  if (rol === 'familia') {
    const familiaId = cvPerfil.familia_id || cvPerfil.id;
    const ids = cvAlumnos.filter(a => String(a.familia_id || '') === String(familiaId || '')).map(a => a.id);
    if (ids.length) query = query.in('alumno_id', ids); else { cvCasos=[]; renderCasos(); renderFirmaFamilia(); actualizarResumenCards(); return; }
  }
  const { data, error } = await query;
  if (error && !String(error.message).includes('relation')) throw error;
  cvCasos = data || [];
  renderCasos();
  renderFirmaFamilia();
  actualizarResumenCards();
}

function renderCasos() {
  const cont = document.getElementById('listaConvivencia');
  if (!cont) return;
  const estado = document.getElementById('filtroCvEstado')?.value || '';
  const gravedad = document.getElementById('filtroCvGravedad')?.value || '';
  const filtered = cvCasos.filter(c => (!estado || c.estado === estado) && (!gravedad || c.gravedad === gravedad));
  if (!filtered.length) {
    cont.innerHTML = '<div class="panel-card"><p>No hay casos para mostrar.</p></div>';
    return;
  }
  const template = document.getElementById('templateCvCard');
  cont.innerHTML = '';
  filtered.forEach((caso) => {
    const node = template.content.cloneNode(true);
    const alumno = cvAlumnos.find(a => String(a.id) === String(caso.alumno_id));
    const curso = cvCursos.find(c => String(c.id) === String(caso.curso_id));
    node.querySelector('h3').textContent = alumno ? `${alumno.apellido}, ${alumno.nombre}` : 'Alumno';
    node.querySelector('.cv-description').textContent = caso.descripcion || 'Sin descripción';
    const sev = node.querySelector('.cv-gravedad');
    sev.textContent = `${(caso.gravedad || 'leve').toUpperCase()} · ${caso.descreditos || 0} descr.`;
    sev.dataset.severity = caso.gravedad || 'leve';
    node.querySelector('.cv-estado').textContent = (caso.estado || 'pendiente').toUpperCase();
    node.querySelector('.cv-meta').innerHTML = `
      <span><strong>Fecha:</strong> ${caso.fecha_hecho || '-'}</span>
      <span><strong>Curso:</strong> ${curso?.nombre || curso?.anio || '-'}</span>
      <span><strong>Tipo:</strong> ${caso.tipo_hecho || '-'}</span>
      <span><strong>Sanción:</strong> ${caso.sancion_aplicada || '-'}</span>`;
    const actions = node.querySelector('.cv-actions');
    if (caso.archivo_adjunto_path) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-secondary';
      btn.textContent = 'Abrir adjunto';
      btn.addEventListener('click', () => abrirArchivo(caso.archivo_adjunto_path));
      actions.appendChild(btn);
    }
    if (['admin','directivo','secretaria','preceptor'].includes((cvPerfil?.rol || '').toLowerCase()) && caso.requiere_firma_familia && ['notificado','pendiente','observado'].includes(caso.estado)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-primary';
      btn.textContent = 'Marcar cerrado';
      btn.addEventListener('click', () => cambiarEstado(caso.id, 'cerrado'));
      actions.appendChild(btn);
    }
    cont.appendChild(node);
  });
}

function renderFirmaFamilia() {
  const cont = document.getElementById('listaFirmaFamilia');
  if (!cont) return;
  const pendientes = cvCasos.filter(c => c.requiere_firma_familia && ['notificado','observado'].includes(c.estado));
  if (!pendientes.length) {
    cont.innerHTML = '<div class="panel-card"><p>No tenés notificaciones pendientes de firma.</p></div>';
    return;
  }
  cont.innerHTML = pendientes.map(c => {
    const alumno = cvAlumnos.find(a => String(a.id) === String(c.alumno_id));
    return `
      <article class="cv-card">
        <div class="cv-card-top">
          <span class="cv-gravedad" data-severity="${c.gravedad || 'leve'}">${(c.gravedad || 'leve').toUpperCase()}</span>
          <span class="cv-estado">${(c.estado || 'notificado').toUpperCase()}</span>
        </div>
        <h3>${alumno ? `${alumno.apellido}, ${alumno.nombre}` : 'Alumno'}</h3>
        <p class="cv-description">${c.descripcion || ''}</p>
        <div class="cv-meta">
          <span><strong>Fecha:</strong> ${c.fecha_hecho || '-'}</span>
          <span><strong>Sanción:</strong> ${c.sancion_aplicada || '-'}</span>
          <span><strong>Descréditos:</strong> ${c.descreditos || 0}</span>
        </div>
        <div class="cv-actions">
          ${c.archivo_adjunto_path ? `<button type="button" class="btn-secondary" onclick="abrirArchivo('${c.archivo_adjunto_path}')">Ver documento</button>` : ''}
          <button type="button" class="btn-primary" onclick="firmarCaso('${c.id}')">Firmar / confirmar lectura</button>
        </div>
      </article>`;
  }).join('');
}

async function firmarCaso(id) {
  const { error } = await supabaseClient.from('convivencia_casos').update({ estado: 'firmado', fecha_firma_familia: new Date().toISOString() }).eq('id', id);
  if (error) return setMensaje(error.message, 'error');
  setMensaje('Constancia firmada/confirmada correctamente.', 'success');
  await Promise.all([cargarCasos(), cargarResumen()]);
}
window.firmarCaso = firmarCaso;

async function cambiarEstado(id, estado) {
  const { error } = await supabaseClient.from('convivencia_casos').update({ estado }).eq('id', id);
  if (error) return setMensaje(error.message, 'error');
  setMensaje('Estado actualizado.', 'success');
  await Promise.all([cargarCasos(), cargarResumen()]);
}

async function abrirArchivo(path) {
  const { data, error } = await supabaseClient.storage.from(BUCKET_CV).createSignedUrl(path, 60);
  if (error) return setMensaje(error.message, 'error');
  window.open(data.signedUrl, '_blank');
}
window.abrirArchivo = abrirArchivo;

async function cargarResumen() {
  const tbody = document.getElementById('tablaResumenConvivencia');
  if (!tbody) return;
  const resumen = new Map();
  cvCasos.forEach(c => {
    const key = String(c.alumno_id || 'sin');
    if (!resumen.has(key)) resumen.set(key, { alumno_id:key, casos:0, descreditos:0, pendientes:0, ultimo:c.estado, curso_id:c.curso_id });
    const item = resumen.get(key);
    item.casos += 1;
    item.descreditos += Number(c.descreditos || 0);
    if (['notificado','observado'].includes(c.estado)) item.pendientes += 1;
    item.ultimo = c.estado || item.ultimo;
    item.curso_id = c.curso_id || item.curso_id;
  });
  tbody.innerHTML = [...resumen.values()].map(r => {
    const alumno = cvAlumnos.find(a => String(a.id) === r.alumno_id);
    const curso = cvCursos.find(c => String(c.id) === String(r.curso_id));
    return `<tr>
      <td>${alumno ? `${alumno.apellido}, ${alumno.nombre}` : '-'}</td>
      <td>${curso?.nombre || curso?.anio || '-'}</td>
      <td>${r.casos}</td>
      <td>${r.descreditos}</td>
      <td>${r.pendientes}</td>
      <td>${r.ultimo || '-'}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="6">Sin datos aún.</td></tr>';
}

function actualizarResumenCards() {
  const total = cvCasos.length;
  document.getElementById('sumCasosAbiertos').textContent = cvCasos.filter(c => ['pendiente','notificado','observado'].includes(c.estado)).length;
  document.getElementById('sumPendientesFirma').textContent = cvCasos.filter(c => c.requiere_firma_familia && ['notificado','observado'].includes(c.estado)).length;
  document.getElementById('sumDescreditos').textContent = cvCasos.reduce((acc,c) => acc + Number(c.descreditos || 0), 0);
  document.getElementById('sumCasosCerrados').textContent = cvCasos.filter(c => c.estado === 'cerrado' || c.estado === 'firmado').length;
}

function setMensaje(text, type='info') {
  const el = document.getElementById('mensajeConvivencia');
  if (!el) return;
  el.textContent = text;
  el.className = `form-message ${type}`;
}
