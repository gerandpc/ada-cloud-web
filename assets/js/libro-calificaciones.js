let perfilLibro = null;
let libroCursos = [];
let libroMaterias = [];
let libroAlumnos = [];
let libroNotas = [];

const escapeHtmlLibro = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

document.addEventListener('DOMContentLoaded', async () => {
  try {
    perfilLibro = await obtenerSesionPerfil();
    if (!perfilLibro) return;
    document.getElementById('btnCargarLibro')?.addEventListener('click', cargarLibro);
    document.getElementById('btnExportarLibro')?.addEventListener('click', exportarLibro);
    await cargarCatalogosLibro();
    mensajeLibro('Seleccioná curso y materia.', 'info');
  } catch (error) {
    console.error(error);
    mensajeLibro(error.message || 'No se pudo iniciar el libro.', 'error');
  }
});

async function cargarCatalogosLibro() {
  [libroCursos, libroMaterias, libroAlumnos] = await Promise.all([
    consultaSeguraLibro('cursos'),
    consultaSeguraLibro('materias'),
    consultaSeguraLibro('alumnos')
  ]);
  completarSelectLibro('libroCurso', libroCursos, item => item.nombre || `${item.anio || ''} ${item.division || ''}`.trim() || 'Curso');
  completarSelectLibro('libroMateria', libroMaterias, item => item.nombre || item.descripcion || 'Materia');
}

async function cargarLibro() {
  const cursoId = document.getElementById('libroCurso')?.value;
  const materiaId = document.getElementById('libroMateria')?.value;
  const periodo = document.getElementById('libroPeriodo')?.value;
  if (!cursoId || !materiaId) return mensajeLibro('Seleccioná curso y materia.', 'error');

  let query = supabaseClient
    .from('planilla_docente_notas')
    .select('*')
    .eq('curso_id', cursoId)
    .eq('materia_id', materiaId);
  if (periodo) query = query.eq('periodo', periodo);

  const { data, error } = await query;
  if (error) return mensajeLibro(error.message, 'error');
  libroNotas = data || [];
  renderLibro(cursoId);
  mensajeLibro(`Libro cargado: ${libroNotas.length} registro(s).`, 'success');
}

function renderLibro(cursoId) {
  const contenedor = document.getElementById('tablaLibro');
  const alumnosCurso = libroAlumnos.filter(a => String(a.curso_id || '') === String(cursoId));
  if (!alumnosCurso.length) {
    contenedor.innerHTML = '<div class="libre-card">No hay alumnos asignados a este curso.</div>';
    return;
  }

  const periodos = [...new Set(libroNotas.map(n => n.periodo).filter(Boolean))];
  const columnas = [...new Set(libroNotas.map(n => `${n.periodo}__${n.columna_key}`).filter(Boolean))];
  const encabezados = columnas.map(c => c.split('__'));
  const body = alumnosCurso.map(alumno => {
    const celdas = encabezados.map(([periodo, columna]) => {
      const nota = libroNotas.find(n => String(n.alumno_id) === String(alumno.id) && n.periodo === periodo && n.columna_key === columna);
      return `<td>${escapeHtmlLibro(nota?.valor ?? '')}</td>`;
    }).join('');
    return `<tr><td>${escapeHtmlLibro(alumno.apellido || '')}, ${escapeHtmlLibro(alumno.nombre || '')}</td>${celdas}</tr>`;
  }).join('');

  contenedor.innerHTML = `<table class="grade-table"><thead><tr><th>Alumno</th>${encabezados.map(([p,c]) => `<th>${escapeHtmlLibro(etiquetaPeriodo(p))}<br>${escapeHtmlLibro(c)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
}

function etiquetaPeriodo(valor) {
  return ({
    primer_bimestre: 'Primer bimestre',
    primer_cuatrimestre: 'Primer cuatrimestre',
    tercer_bimestre: 'Tercer bimestre',
    segundo_cuatrimestre: 'Segundo cuatrimestre',
    diciembre: 'Diciembre',
    febrero: 'Febrero'
  })[valor] || valor || '-';
}

function exportarLibro() {
  const tabla = document.querySelector('#tablaLibro table');
  if (!tabla) return mensajeLibro('Primero cargá el libro.', 'error');
  const blob = new Blob([`<html><meta charset="utf-8"><body>${tabla.outerHTML}</body></html>`], { type: 'application/vnd.ms-excel' });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = 'libro_calificaciones_ADA.xls';
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

async function consultaSeguraLibro(tabla) {
  try {
    const { data, error } = await supabaseClient.from(tabla).select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn(tabla, error.message);
    return [];
  }
}

function completarSelectLibro(id, elementos, etiqueta) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = '<option value="">Seleccionar...</option>' + elementos.map(item => `<option value="${escapeHtmlLibro(item.id)}">${escapeHtmlLibro(etiqueta(item))}</option>`).join('');
}

function mensajeLibro(texto, tipo = 'info') {
  const elemento = document.getElementById('mensajeLibro');
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.className = `form-message ${tipo}`;
}
