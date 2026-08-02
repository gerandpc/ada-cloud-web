let cvPerfil = null;
let cvCasos = [];
let cvAlumnos = [];
let cvCursos = [];
const BUCKET_CV = 'ada-convivencia';
const CV_ROLES_GESTION = new Set(['admin', 'directivo', 'secretaria', 'preceptor']);
const CV_ESTADOS = new Set(['pendiente', 'notificado', 'firmado', 'observado', 'cerrado']);
const CV_GRAVEDADES = new Set(['leve', 'moderada', 'grave']);

function cvRol() {
  return String(cvPerfil?.rol || '').toLowerCase();
}

function cvPuedeGestionar() {
  return CV_ROLES_GESTION.has(cvRol());
}

function cvTexto(value, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function cvFecha(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? cvTexto(value) : date.toLocaleDateString('es-AR');
}

function cvMensajeError(error, fallback) {
  console.error(error);
  setMensaje(fallback, 'error');
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    cvPerfil = await obtenerSesionPerfil();
    if (!cvPerfil) return;

    if (![...CV_ROLES_GESTION, 'familia'].includes(cvRol())) {
      window.location.replace('dashboard.html');
      return;
    }

    setupTabs();
    adaptarVistaPorRol();
    bindEvents();
    await cargarCatalogos();
    await cargarCasos();
    setMensaje('Información actualizada.', 'success');
  } catch (error) {
    cvMensajeError(error, 'No se pudo abrir el módulo de convivencia.');
  }
});

function bindEvents() {
  document.getElementById('btnActualizarConvivencia')?.addEventListener('click', async () => {
    try {
      await cargarCasos();
      setMensaje('Información actualizada.', 'success');
    } catch (error) {
      cvMensajeError(error, 'No se pudo actualizar la información.');
    }
  });
  document.getElementById('formConvivencia')?.addEventListener('submit', guardarCaso);
  document.getElementById('btnLimpiarCv')?.addEventListener('click', () => {
    document.getElementById('formConvivencia')?.reset();
    document.getElementById('cvFecha').value = new Date().toISOString().slice(0, 10);
  });
  document.getElementById('filtroCvEstado')?.addEventListener('change', renderCasos);
  document.getElementById('filtroCvGravedad')?.addEventListener('change', renderCasos);
  document.getElementById('btnExportarResumenCv')?.addEventListener('click', exportarResumenConvivencia);
}

function setupTabs() {
  const tabs = [...document.querySelectorAll('.cv-tab')];
  const panels = [...document.querySelectorAll('.cv-tab-panel')];
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.hidden || tab.style.display === 'none') return;
      tabs.forEach((item) => item.classList.remove('active'));
      panels.forEach((panel) => panel.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab)?.classList.add('active');
    });
  });
}

function adaptarVistaPorRol() {
  const gestion = cvPuedeGestionar();
  const familia = cvRol() === 'familia';

  document.querySelectorAll('[data-area-only="gestion"]').forEach((el) => {
    el.hidden = !gestion;
  });
  document.querySelectorAll('[data-area-only="familia"]').forEach((el) => {
    el.hidden = !familia;
  });

  if (familia) {
    document.querySelectorAll('.cv-tab, .cv-tab-panel').forEach((el) => el.classList.remove('active'));
    document.querySelector('.cv-tab[data-tab="tab-firma"]')?.classList.add('active');
    document.getElementById('tab-firma')?.classList.add('active');
  }

  const fechaInput = document.getElementById('cvFecha');
  if (fechaInput && !fechaInput.value) fechaInput.value = new Date().toISOString().slice(0, 10);
}

async function cargarCatalogos() {
  const rol = cvRol();

  if (rol === 'familia') {
    const { data, error } = await supabaseClient
      .from('v_familia_hijos')
      .select('alumno_id,alumno_nombre,alumno_apellido,curso_id,curso_nombre')
      .eq('familia_id', cvPerfil.id)
      .order('alumno_apellido');
    if (error) throw error;

    cvAlumnos = (data || []).map((row) => ({
      id: row.alumno_id,
      nombre: row.alumno_nombre,
      apellido: row.alumno_apellido,
      curso_id: row.curso_id
    }));
    const cursosUnicos = new Map();
    (data || []).forEach((row) => {
      if (row.curso_id) cursosUnicos.set(String(row.curso_id), { id: row.curso_id, nombre: row.curso_nombre || 'Curso' });
    });
    cvCursos = [...cursosUnicos.values()];
    return;
  }

  const [alumnosRes, cursosRes] = await Promise.all([
    supabaseClient.from('alumnos').select('id,nombre,apellido,curso_id').eq('activo', true).order('apellido'),
    supabaseClient.from('cursos').select('id,nombre,anio,division').order('anio')
  ]);
  if (alumnosRes.error) throw alumnosRes.error;
  if (cursosRes.error) throw cursosRes.error;

  cvAlumnos = alumnosRes.data || [];
  cvCursos = cursosRes.data || [];
  cargarSelect(document.getElementById('cvAlumno'), cvAlumnos.map((a) => ({ value: a.id, text: `${cvTexto(a.apellido, '')}, ${cvTexto(a.nombre, '')}` })));
  cargarSelect(document.getElementById('cvCurso'), cvCursos.map((c) => ({ value: c.id, text: c.nombre || `${c.anio || ''} ${c.division || ''}`.trim() || 'Curso' })));
}

function cargarSelect(select, options) {
  if (!select) return;
  select.replaceChildren();
  const first = document.createElement('option');
  first.value = '';
  first.textContent = 'Seleccionar…';
  select.appendChild(first);
  options.forEach((option) => {
    const el = document.createElement('option');
    el.value = String(option.value ?? '');
    el.textContent = cvTexto(option.text, 'Sin identificar');
    select.appendChild(el);
  });
}

async function guardarCaso(event) {
  event.preventDefault();
  if (!cvPuedeGestionar()) return setMensaje('No tenés permisos para registrar casos.', 'error');

  const alumnoId = document.getElementById('cvAlumno').value;
  const cursoId = document.getElementById('cvCurso').value;
  const fecha = document.getElementById('cvFecha').value;
  const gravedad = document.getElementById('cvGravedad').value;
  const tipo = document.getElementById('cvTipo').value;
  const descripcion = document.getElementById('cvDescripcion').value.trim();
  const descreditos = Number(document.getElementById('cvDescreditos').value || 0);

  if (!alumnoId || !cursoId || !fecha || !descripcion) return setMensaje('Completá todos los campos obligatorios.', 'error');
  if (!CV_GRAVEDADES.has(gravedad)) return setMensaje('Seleccioná una gravedad válida.', 'error');
  if (!Number.isFinite(descreditos) || descreditos < 0 || descreditos > 100) return setMensaje('La cantidad de descréditos no es válida.', 'error');

  const alumno = cvAlumnos.find((item) => String(item.id) === String(alumnoId));
  if (!alumno || String(alumno.curso_id || '') !== String(cursoId)) {
    return setMensaje('El alumno seleccionado no pertenece al curso indicado.', 'error');
  }

  const requiereFirma = document.getElementById('cvRequiereFirma').checked;
  const payload = {
    alumno_id: alumnoId,
    curso_id: cursoId,
    fecha_hecho: fecha,
    gravedad,
    tipo_hecho: tipo,
    descreditos,
    descripcion,
    sancion_aplicada: document.getElementById('cvSancion').value.trim() || null,
    requiere_firma_familia: requiereFirma,
    visible_secretaria: document.getElementById('cvVisibleSecretaria').checked,
    estado: requiereFirma ? 'notificado' : 'pendiente',
    creado_por: cvPerfil.id || cvPerfil.user_id || null
  };

  const file = document.getElementById('cvArchivo').files?.[0];
  if (file) {
    validarArchivoCaso(file);
    payload.archivo_adjunto_path = await subirArchivoCaso(file, alumnoId);
    payload.archivo_adjunto_nombre = file.name;
  }

  try {
    const { error } = await supabaseClient.from('convivencia_casos').insert(payload);
    if (error) throw error;
    setMensaje('Caso registrado correctamente.', 'success');
    document.getElementById('formConvivencia').reset();
    document.getElementById('cvFecha').value = new Date().toISOString().slice(0, 10);
    await cargarCasos();
  } catch (error) {
    cvMensajeError(error, 'No se pudo registrar el caso.');
  }
}

function validarArchivoCaso(file) {
  const tipos = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
  if (!tipos.has(file.type)) throw new Error('El tipo de archivo no está permitido.');
  if (file.size > 10 * 1024 * 1024) throw new Error('El archivo supera el máximo permitido de 10 MB.');
}

async function subirArchivoCaso(file, alumnoId) {
  const cleanName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
  const path = `casos/${new Date().getFullYear()}/alumno_${alumnoId}/${Date.now()}_${cleanName}`;
  const { error } = await supabaseClient.storage.from(BUCKET_CV).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

async function cargarCasos() {
  let query = supabaseClient.from('convivencia_casos').select('*').order('fecha_hecho', { ascending: false });
  if (cvRol() === 'familia') {
    const ids = cvAlumnos.map((alumno) => alumno.id).filter(Boolean);
    if (!ids.length) {
      cvCasos = [];
      actualizarVistas();
      return;
    }
    query = query.in('alumno_id', ids).eq('requiere_firma_familia', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  cvCasos = (data || []).filter((caso) => CV_ESTADOS.has(caso.estado || 'pendiente'));
  actualizarVistas();
}

function actualizarVistas() {
  renderCasos();
  renderFirmaFamilia();
  cargarResumen();
  actualizarResumenCards();
}

function crearMeta(label, value) {
  const span = document.createElement('span');
  const strong = document.createElement('strong');
  strong.textContent = `${label}: `;
  span.append(strong, document.createTextNode(cvTexto(value)));
  return span;
}

function renderCasos() {
  const cont = document.getElementById('listaConvivencia');
  if (!cont) return;
  const estado = document.getElementById('filtroCvEstado')?.value || '';
  const gravedad = document.getElementById('filtroCvGravedad')?.value || '';
  const filtered = cvCasos.filter((caso) => (!estado || caso.estado === estado) && (!gravedad || caso.gravedad === gravedad));

  cont.replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'panel-card';
    const p = document.createElement('p');
    p.textContent = 'No hay casos para mostrar.';
    empty.appendChild(p);
    cont.appendChild(empty);
    return;
  }

  const template = document.getElementById('templateCvCard');
  filtered.forEach((caso) => {
    const node = template.content.cloneNode(true);
    const alumno = cvAlumnos.find((item) => String(item.id) === String(caso.alumno_id));
    const curso = cvCursos.find((item) => String(item.id) === String(caso.curso_id));

    node.querySelector('h3').textContent = alumno ? `${cvTexto(alumno.apellido, '')}, ${cvTexto(alumno.nombre, '')}` : 'Alumno sin identificar';
    node.querySelector('.cv-description').textContent = cvTexto(caso.descripcion, 'Sin descripción');
    const sev = node.querySelector('.cv-gravedad');
    sev.textContent = `${cvTexto(caso.gravedad, 'leve').toUpperCase()} · ${Number(caso.descreditos || 0)} descr.`;
    sev.dataset.severity = CV_GRAVEDADES.has(caso.gravedad) ? caso.gravedad : 'leve';
    node.querySelector('.cv-estado').textContent = cvTexto(caso.estado, 'pendiente').toUpperCase();

    const meta = node.querySelector('.cv-meta');
    meta.replaceChildren(
      crearMeta('Fecha', cvFecha(caso.fecha_hecho)),
      crearMeta('Curso', curso?.nombre || curso?.anio),
      crearMeta('Tipo', caso.tipo_hecho),
      crearMeta('Medida', caso.sancion_aplicada)
    );

    const actions = node.querySelector('.cv-actions');
    agregarBoton(actions, 'Constancia PDF', 'btn-secondary', () => exportarCasoConvivencia(caso));
    if (caso.archivo_adjunto_path) agregarBoton(actions, 'Abrir adjunto', 'btn-secondary', () => abrirArchivo(caso.archivo_adjunto_path));
    if (cvPuedeGestionar() && caso.requiere_firma_familia && ['notificado', 'pendiente', 'observado', 'firmado'].includes(caso.estado)) {
      agregarBoton(actions, 'Cerrar caso', 'btn-primary', () => cambiarEstado(caso.id, 'cerrado'));
    }
    cont.appendChild(node);
  });
}

function agregarBoton(container, text, className, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  button.addEventListener('click', handler);
  container.appendChild(button);
}

function renderFirmaFamilia() {
  const cont = document.getElementById('listaFirmaFamilia');
  if (!cont) return;
  const pendientes = cvCasos.filter((caso) => caso.requiere_firma_familia && ['notificado', 'observado'].includes(caso.estado));
  cont.replaceChildren();

  if (!pendientes.length) {
    const empty = document.createElement('div');
    empty.className = 'panel-card';
    const p = document.createElement('p');
    p.textContent = 'No tenés notificaciones pendientes de confirmación.';
    empty.appendChild(p);
    cont.appendChild(empty);
    return;
  }

  pendientes.forEach((caso) => {
    const alumno = cvAlumnos.find((item) => String(item.id) === String(caso.alumno_id));
    const article = document.createElement('article');
    article.className = 'cv-card';

    const top = document.createElement('div');
    top.className = 'cv-card-top';
    const severity = document.createElement('span');
    severity.className = 'cv-gravedad';
    severity.dataset.severity = CV_GRAVEDADES.has(caso.gravedad) ? caso.gravedad : 'leve';
    severity.textContent = cvTexto(caso.gravedad, 'leve').toUpperCase();
    const status = document.createElement('span');
    status.className = 'cv-estado';
    status.textContent = cvTexto(caso.estado, 'notificado').toUpperCase();
    top.append(severity, status);

    const title = document.createElement('h3');
    title.textContent = alumno ? `${cvTexto(alumno.apellido, '')}, ${cvTexto(alumno.nombre, '')}` : 'Alumno';
    const description = document.createElement('p');
    description.className = 'cv-description';
    description.textContent = cvTexto(caso.descripcion, 'Sin descripción');

    const meta = document.createElement('div');
    meta.className = 'cv-meta';
    meta.append(
      crearMeta('Fecha', cvFecha(caso.fecha_hecho)),
      crearMeta('Medida', caso.sancion_aplicada),
      crearMeta('Descréditos', Number(caso.descreditos || 0))
    );

    const actions = document.createElement('div');
    actions.className = 'cv-actions';
    agregarBoton(actions, 'Constancia PDF', 'btn-secondary', () => exportarCasoConvivencia(caso));
    if (caso.archivo_adjunto_path) agregarBoton(actions, 'Ver documento', 'btn-secondary', () => abrirArchivo(caso.archivo_adjunto_path));
    agregarBoton(actions, 'Confirmar lectura', 'btn-primary', () => firmarCaso(caso.id));

    article.append(top, title, description, meta, actions);
    cont.appendChild(article);
  });
}

async function firmarCaso(id) {
  if (cvRol() !== 'familia') return setMensaje('Esta acción corresponde al perfil familiar.', 'error');
  try {
    const caso = cvCasos.find((item) => String(item.id) === String(id));
    if (!caso || !['notificado', 'observado'].includes(caso.estado)) return setMensaje('La notificación ya fue procesada.', 'error');
    const { error } = await supabaseClient
      .from('convivencia_casos')
      .update({ estado: 'firmado', fecha_firma_familia: new Date().toISOString() })
      .eq('id', id)
      .in('alumno_id', cvAlumnos.map((alumno) => alumno.id));
    if (error) throw error;
    setMensaje('Lectura confirmada correctamente.', 'success');
    await cargarCasos();
  } catch (error) {
    cvMensajeError(error, 'No se pudo confirmar la lectura.');
  }
}

async function cambiarEstado(id, estado) {
  if (!cvPuedeGestionar() || !CV_ESTADOS.has(estado)) return setMensaje('No tenés permisos para realizar esta acción.', 'error');
  try {
    const { error } = await supabaseClient.from('convivencia_casos').update({ estado }).eq('id', id);
    if (error) throw error;
    setMensaje('Estado actualizado.', 'success');
    await cargarCasos();
  } catch (error) {
    cvMensajeError(error, 'No se pudo actualizar el estado.');
  }
}

async function abrirArchivo(path) {
  if (!path) return;
  try {
    const { data, error } = await supabaseClient.storage.from(BUCKET_CV).createSignedUrl(path, 60);
    if (error) throw error;
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  } catch (error) {
    cvMensajeError(error, 'No se pudo abrir el archivo adjunto.');
  }
}

function cargarResumen() {
  const tbody = document.getElementById('tablaResumenConvivencia');
  if (!tbody) return;
  const resumen = new Map();
  cvCasos.forEach((caso) => {
    const key = String(caso.alumno_id || 'sin');
    if (!resumen.has(key)) resumen.set(key, { alumno_id: key, casos: 0, descreditos: 0, pendientes: 0, ultimo: caso.estado, curso_id: caso.curso_id });
    const item = resumen.get(key);
    item.casos += 1;
    item.descreditos += Number(caso.descreditos || 0);
    if (['notificado', 'observado'].includes(caso.estado)) item.pendientes += 1;
    item.ultimo = caso.estado || item.ultimo;
    item.curso_id = caso.curso_id || item.curso_id;
  });

  tbody.replaceChildren();
  if (!resumen.size) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.textContent = 'No hay información registrada.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  [...resumen.values()].forEach((row) => {
    const alumno = cvAlumnos.find((item) => String(item.id) === row.alumno_id);
    const curso = cvCursos.find((item) => String(item.id) === String(row.curso_id));
    const tr = document.createElement('tr');
    [
      alumno ? `${cvTexto(alumno.apellido, '')}, ${cvTexto(alumno.nombre, '')}` : '-',
      curso?.nombre || curso?.anio || '-',
      row.casos,
      row.descreditos,
      row.pendientes,
      row.ultimo || '-'
    ].forEach((value) => {
      const td = document.createElement('td');
      td.textContent = String(value);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function actualizarResumenCards() {
  document.getElementById('sumCasosAbiertos').textContent = cvCasos.filter((caso) => ['pendiente', 'notificado', 'observado'].includes(caso.estado)).length;
  document.getElementById('sumPendientesFirma').textContent = cvCasos.filter((caso) => caso.requiere_firma_familia && ['notificado', 'observado'].includes(caso.estado)).length;
  document.getElementById('sumDescreditos').textContent = cvCasos.reduce((total, caso) => total + Number(caso.descreditos || 0), 0);
  document.getElementById('sumCasosCerrados').textContent = cvCasos.filter((caso) => ['cerrado', 'firmado'].includes(caso.estado)).length;
}

function exportarCasoConvivencia(caso) {
  const alumno = cvAlumnos.find((item) => String(item.id) === String(caso.alumno_id));
  const curso = cvCursos.find((item) => String(item.id) === String(caso.curso_id));
  const rows = [
    ['Alumno', alumno ? `${cvTexto(alumno.apellido, '')}, ${cvTexto(alumno.nombre, '')}` : '-'],
    ['Curso', curso?.nombre || curso?.anio || '-'],
    ['Fecha', cvFecha(caso.fecha_hecho)],
    ['Tipo', cvTexto(caso.tipo_hecho)],
    ['Gravedad', cvTexto(caso.gravedad).toUpperCase()],
    ['Descréditos', Number(caso.descreditos || 0)],
    ['Estado', cvTexto(caso.estado).toUpperCase()],
    ['Descripción', cvTexto(caso.descripcion)],
    ['Medida aplicada', cvTexto(caso.sancion_aplicada)],
    ['Requiere confirmación familiar', caso.requiere_firma_familia ? 'Sí' : 'No']
  ];
  cvAbrirDocumento('Constancia de convivencia', rows);
}

function exportarResumenConvivencia() {
  if (!cvPuedeGestionar()) return setMensaje('No tenés permisos para exportar el resumen institucional.', 'error');
  const rows = cvCasos.map((caso) => {
    const alumno = cvAlumnos.find((item) => String(item.id) === String(caso.alumno_id));
    const curso = cvCursos.find((item) => String(item.id) === String(caso.curso_id));
    return [
      alumno ? `${cvTexto(alumno.apellido, '')}, ${cvTexto(alumno.nombre, '')}` : '-',
      curso?.nombre || curso?.anio || '-',
      cvFecha(caso.fecha_hecho),
      cvTexto(caso.tipo_hecho),
      cvTexto(caso.gravedad),
      Number(caso.descreditos || 0),
      cvTexto(caso.estado)
    ];
  });
  cvAbrirTabla('Informe de convivencia', ['Alumno', 'Curso', 'Fecha', 'Tipo', 'Gravedad', 'Descréditos', 'Estado'], rows);
}

function cvEscapePrint(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function cvDocumentoBase(title, body) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${cvEscapePrint(title)}</title><style>body{font-family:Arial,sans-serif;color:#1f2937;margin:32px}h1{color:#a71919;border-bottom:3px solid #a71919;padding-bottom:10px}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #d1d5db;padding:8px;text-align:left;vertical-align:top}th{background:#f3f4f6}.meta{color:#64748b;font-size:12px;margin-bottom:20px}@media print{button{display:none}}</style></head><body><h1>${cvEscapePrint(title)}</h1><div class="meta">Generado por ADA · ${new Date().toLocaleString('es-AR')}</div>${body}<script>window.onload=()=>window.print();<\/script></body></html>`;
}

function cvAbrirDocumento(title, rows) {
  const body = `<table><tbody>${rows.map(([label, value]) => `<tr><th>${cvEscapePrint(label)}</th><td>${cvEscapePrint(value)}</td></tr>`).join('')}</tbody></table>`;
  cvAbrirVentana(cvDocumentoBase(title, body));
}

function cvAbrirTabla(title, headers, rows) {
  const body = `<table><thead><tr>${headers.map((header) => `<th>${cvEscapePrint(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((value) => `<td>${cvEscapePrint(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  cvAbrirVentana(cvDocumentoBase(title, body));
}

function cvAbrirVentana(html) {
  if (!window.ADA_PDF) return setMensaje('El motor PDF de ADA no está disponible. Recargá la página.', 'error');
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const title = parsed.title || parsed.querySelector('h1')?.textContent || 'Informe de convivencia';
  window.ADA_PDF.fromHTML(title, parsed.body?.innerHTML || html, {
    filename: `ADA_${String(title).replace(/[^a-zA-Z0-9_-]+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`
  });
}

function setMensaje(text, type = 'info') {
  const el = document.getElementById('mensajeConvivencia');
  if (!el) return;
  el.textContent = text;
  el.className = `form-message ${type}`;
}
