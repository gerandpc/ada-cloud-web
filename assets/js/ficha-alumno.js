"use strict";

let fichaPerfil = null;
let fichaAlumnos = [];
let fichaCursos = [];
let fichaAlumnoActual = null;
let fichaDatosActuales = null;

const FICHA_ROLES = new Set(["admin", "directivo", "secretaria", "preceptor", "docente"]);

function fichaEsc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function fichaRol() {
  return String(fichaPerfil?.rol || "").trim().toLowerCase();
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    fichaPerfil = await obtenerSesionPerfil();
    if (!fichaPerfil) return;
    if (!FICHA_ROLES.has(fichaRol())) {
      setMensajeFicha("No tenés permisos para consultar fichas integrales.", "error");
      return;
    }

    setupFichaTabs();
    bindFichaEvents();
    await cargarCatalogosFicha();
    setMensajeFicha(
      fichaAlumnos.length
        ? "Seleccioná un alumno para consultar la ficha integral."
        : "No hay alumnos habilitados para tu perfil.",
      fichaAlumnos.length ? "info" : "error"
    );
  } catch (error) {
    console.error(error);
    setMensajeFicha("No se pudo cargar la ficha integral.", "error");
  }
});

function bindFichaEvents() {
  document.getElementById("btnCargarFicha")?.addEventListener("click", cargarFichaSeleccionada);
  document.getElementById("selectorAlumno")?.addEventListener("change", cargarFichaSeleccionada);
  document.getElementById("busquedaAlumno")?.addEventListener("input", filtrarAlumnosFicha);
  document.getElementById("btnExportarFicha")?.addEventListener("click", exportarFichaPDF);
}

function setupFichaTabs() {
  document.querySelectorAll(".ficha-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".ficha-tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".ficha-panel").forEach((panel) => panel.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab)?.classList.add("active");
    });
  });
}

async function cargarCatalogosFicha() {
  const [alumnosRes, cursosRes] = await Promise.all([
    safeSelect("alumnos", "id,nombre,apellido,email,documento,dni,curso_id,familia_id,activo,created_at", "apellido"),
    safeSelect("cursos", "id,nombre,anio,division,turno,nivel", "anio")
  ]);

  fichaAlumnos = (alumnosRes || []).filter((alumno) => alumno.activo !== false);
  fichaCursos = cursosRes || [];
  fichaAlumnos = await limitarAlumnosPorRol(fichaAlumnos);

  renderSelectorAlumnos(fichaAlumnos);
  if (fichaAlumnos.length === 1) {
    const selector = document.getElementById("selectorAlumno");
    if (selector) selector.value = fichaAlumnos[0].id;
    await cargarFichaSeleccionada();
  }
}

async function limitarAlumnosPorRol(alumnos) {
  const rol = fichaRol();
  if (["admin", "directivo", "secretaria"].includes(rol)) return alumnos;

  if (rol === "docente") {
    const asignados = await safeSelectWhere("v_docente_mis_alumnos", "alumno_id", "docente_id", fichaPerfil.id);
    const ids = new Set(asignados.map((item) => String(item.alumno_id || item.id || "")).filter(Boolean));
    return alumnos.filter((alumno) => ids.has(String(alumno.id)));
  }

  if (rol === "preceptor") {
    const asignados = await safeSelectWhere("v_preceptor_mis_alumnos", "alumno_id", "preceptor_id", fichaPerfil.id);
    if (asignados.length) {
      const ids = new Set(asignados.map((item) => String(item.alumno_id || item.id || "")).filter(Boolean));
      return alumnos.filter((alumno) => ids.has(String(alumno.id)));
    }
    if (fichaPerfil.curso_id) {
      return alumnos.filter((alumno) => String(alumno.curso_id || "") === String(fichaPerfil.curso_id));
    }
  }

  return alumnos;
}

function renderSelectorAlumnos(lista) {
  const select = document.getElementById("selectorAlumno");
  if (!select) return;

  select.replaceChildren();
  const initial = document.createElement("option");
  initial.value = "";
  initial.textContent = lista.length ? "Seleccionar alumno..." : "Sin alumnos disponibles";
  select.appendChild(initial);

  lista.forEach((alumno) => {
    const option = document.createElement("option");
    option.value = alumno.id;
    const documento = alumno.documento || alumno.dni || "";
    option.textContent = `${alumno.apellido || ""}, ${alumno.nombre || ""}${documento ? ` · ${documento}` : ""}`;
    select.appendChild(option);
  });
}

function filtrarAlumnosFicha() {
  const consulta = (document.getElementById("busquedaAlumno")?.value || "").toLowerCase().trim();
  const filtrados = fichaAlumnos.filter((alumno) =>
    `${alumno.apellido || ""} ${alumno.nombre || ""} ${alumno.documento || ""} ${alumno.dni || ""}`
      .toLowerCase()
      .includes(consulta)
  );
  renderSelectorAlumnos(filtrados);
}

async function cargarFichaSeleccionada() {
  const id = document.getElementById("selectorAlumno")?.value;
  if (!id) {
    fichaAlumnoActual = null;
    fichaDatosActuales = null;
    document.getElementById("fichaContenido")?.classList.add("hidden");
    return;
  }

  fichaAlumnoActual = fichaAlumnos.find((alumno) => String(alumno.id) === String(id));
  if (!fichaAlumnoActual) {
    setMensajeFicha("El alumno seleccionado no está habilitado para tu perfil.", "error");
    return;
  }

  setMensajeFicha("Cargando información...", "info");
  renderCabeceraAlumno(fichaAlumnoActual);

  const [notas, asistencia, actividades, documentacion, convivencia] = await Promise.all([
    cargarNotas(id), cargarAsistencia(id), cargarActividades(id), cargarDocumentacion(id), cargarConvivencia(id)
  ]);

  fichaDatosActuales = { notas, asistencia, actividades, documentacion, convivencia };
  document.getElementById("fichaContenido")?.classList.remove("hidden");
  renderResumen(fichaAlumnoActual, notas, asistencia, actividades, documentacion, convivencia);

  renderTabla("tablaNotas", notas, (nota) => `<tr><td>${fichaEsc(nota.materia_nombre || nota.materia || "-")}</td><td>${fichaEsc(nota.evaluacion_nombre || nota.evaluacion || "-")}</td><td>${fichaEsc(nota.nota ?? "-")}</td><td>${fichaEsc(fecha(nota.fecha || nota.created_at))}</td><td>${fichaEsc(nota.observacion || "")}</td></tr>`, 5);
  renderTabla("tablaAsistencia", asistencia, (registro) => `<tr><td>${fichaEsc(fecha(registro.fecha || registro.created_at))}</td><td>${fichaEsc(registro.estado || registro.estado_asistencia || "-")}</td><td>${fichaEsc(registro.materia_nombre || registro.clase || "-")}</td><td>${fichaEsc(registro.observacion || "")}</td></tr>`, 4);
  renderTabla("tablaActividades", actividades, (entrega) => `<tr><td>${fichaEsc(entrega.actividad_titulo || entrega.titulo || "-")}</td><td>${fichaEsc(entrega.materia_nombre || "-")}</td><td>${fichaEsc(entrega.estado || "-")}</td><td>${fichaEsc(fecha(entrega.fecha_entrega || entrega.created_at))}</td><td>${fichaEsc(entrega.calificacion ?? "-")}</td></tr>`, 5);
  renderTabla("tablaDocumentacion", documentacion, (doc) => `<tr><td>${fichaEsc(doc.titulo || doc.tipo_tramite || "-")}</td><td>${fichaEsc(doc.origen_area || doc.origen || "-")}</td><td>${fichaEsc(doc.estado || "-")}</td><td>${fichaEsc(fecha(doc.created_at || doc.fecha_envio))}</td><td>${fichaEsc(doc.observacion_revision || doc.observacion || "")}</td></tr>`, 5);
  renderTabla("tablaConvivencia", convivencia, (caso) => `<tr><td>${fichaEsc(fecha(caso.fecha_hecho || caso.created_at))}</td><td>${fichaEsc(caso.gravedad || "-")}</td><td>${fichaEsc(caso.descripcion || "-")}</td><td>${fichaEsc(caso.sancion_aplicada || "-")}</td><td>${fichaEsc(caso.descreditos || 0)}</td><td>${fichaEsc(caso.estado || "-")}</td></tr>`, 6);

  setMensajeFicha("Ficha cargada correctamente.", "success");
}

function renderCabeceraAlumno(alumno) {
  const curso = fichaCursos.find((item) => String(item.id) === String(alumno.curso_id));
  const nombre = `${alumno.apellido || ""}, ${alumno.nombre || ""}`.trim().replace(/^,/, "");
  setText("nombreAlumno", nombre || "Alumno");
  setText("avatarAlumno", (alumno.apellido || alumno.nombre || "A").charAt(0).toUpperCase());
  setText("datosAlumno", `${curso?.nombre || curso?.anio || "Curso no definido"} · ${alumno.email || alumno.documento || alumno.dni || "Sin contacto"}`);
  setText("badgeCurso", curso?.nombre || `${curso?.anio || ""} ${curso?.division || ""}`.trim() || "Sin curso");
  setText("badgeEstado", alumno.activo === false ? "Inactivo" : "Activo");
}

function renderResumen(alumno, notas, asistencia, actividades, documentos, convivencia) {
  const promedio = calcularPromedio(notas);
  const inasistencias = asistencia.filter((item) => /aus|inas/.test(`${item.estado || item.estado_asistencia || ""}`.toLowerCase())).length;
  const entregasPendientes = actividades.filter((item) => ["pendiente", "sin_entregar", "observado"].includes(`${item.estado || ""}`.toLowerCase())).length;
  const documentosPendientes = documentos.filter((item) => ["pendiente", "observado", "vencido", "notificado"].includes(`${item.estado || ""}`.toLowerCase())).length;
  const descreditos = convivencia.reduce((total, item) => total + Number(item.descreditos || 0), 0);

  setText("kpiPromedio", promedio || "-");
  setText("kpiInasistencias", inasistencias);
  setText("kpiEntregas", entregasPendientes);
  setText("kpiDocumentos", documentosPendientes);
  setText("kpiDescreditos", descreditos);
  setText("kpiConvivencia", convivencia.length);

  const curso = fichaCursos.find((item) => String(item.id) === String(alumno.curso_id));
  renderDetalles("resumenDatos", [
    ["Nombre", alumno.nombre || "-"], ["Apellido", alumno.apellido || "-"],
    ["Documento", alumno.documento || alumno.dni || "-"], ["Curso", curso?.nombre || "-"],
    ["Email", alumno.email || "-"]
  ]);

  renderDetalles("resumenFamilia", [
    ["Vínculo familiar", alumno.familia_id ? "Registrado" : "Sin vínculo registrado"],
    ["Consulta de responsables", "Disponible en el módulo Familias"]
  ]);

  const alertas = [];
  if (descreditos > 0) alertas.push(["danger", `Tiene ${descreditos} descrédito/s acumulado/s.`]);
  if (documentosPendientes > 0) alertas.push(["warn", `Tiene ${documentosPendientes} documento/s pendiente/s.`]);
  if (entregasPendientes > 0) alertas.push(["warn", `Tiene ${entregasPendientes} entrega/s pendiente/s.`]);
  if (inasistencias > 0) alertas.push(["warn", `Registra ${inasistencias} inasistencia/s.`]);
  renderAlertas(alertas);
}

function renderDetalles(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.replaceChildren();
  items.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "detail-item";
    const strong = document.createElement("strong");
    strong.textContent = label;
    const span = document.createElement("span");
    span.textContent = String(value ?? "-");
    row.append(strong, span);
    container.appendChild(row);
  });
}

function renderAlertas(alertas) {
  const container = document.getElementById("resumenAlertas");
  if (!container) return;
  container.replaceChildren();
  const lista = alertas.length ? alertas : [["", "Sin alertas críticas registradas."]];
  lista.forEach(([tipo, texto]) => {
    const item = document.createElement("div");
    item.className = `alert-pill${tipo ? ` ${tipo}` : ""}`;
    item.textContent = texto;
    container.appendChild(item);
  });
}

async function cargarNotas(alumnoId) {
  return await safeSelectWhere("calificaciones", "*", "alumno_id", alumnoId, "created_at");
}

async function cargarAsistencia(alumnoId) {
  let datos = await safeSelectWhere("asistencia_registros", "*", "alumno_id", alumnoId, "created_at");
  if (!datos.length) datos = await safeSelectWhere("asistencias", "*", "alumno_id", alumnoId, "created_at");
  return datos;
}

async function cargarActividades(alumnoId) {
  let datos = await safeSelectWhere("entregas_actividades", "*", "alumno_id", alumnoId, "created_at");
  if (!datos.length) datos = await safeSelectWhere("entregas", "*", "alumno_id", alumnoId, "created_at");
  return datos;
}

async function cargarDocumentacion(alumnoId) {
  let datos = await safeSelectWhere("documentacion_destinatarios", "*", "alumno_id", alumnoId, "created_at");
  if (!datos.length) datos = await safeSelectWhere("documentacion_devoluciones", "*", "alumno_id", alumnoId, "created_at");
  return datos;
}

async function cargarConvivencia(alumnoId) {
  return await safeSelectWhere("convivencia_casos", "*", "alumno_id", alumnoId, "fecha_hecho");
}

async function safeSelect(table, columns = "*", orderCol = null) {
  try {
    let query = supabaseClient.from(table).select(columns);
    if (orderCol) query = query.order(orderCol, { ascending: true });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn(`No se pudo leer ${table}.`);
    return [];
  }
}

async function safeSelectWhere(table, columns, field, value, orderCol = null) {
  try {
    let query = supabaseClient.from(table).select(columns).eq(field, value);
    if (orderCol) query = query.order(orderCol, { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn(`No se pudo leer ${table}.`);
    return [];
  }
}

function renderTabla(id, rows, rowFn, colspan) {
  const tbody = document.getElementById(id);
  if (!tbody) return;
  tbody.innerHTML = rows?.length
    ? rows.map(rowFn).join("")
    : `<tr><td colspan="${colspan}">Sin datos registrados.</td></tr>`;
}

function calcularPromedio(notas) {
  const valores = notas.map((item) => Number(item.nota)).filter((valor) => Number.isFinite(valor));
  if (!valores.length) return "";
  return (valores.reduce((total, valor) => total + valor, 0) / valores.length).toFixed(2);
}

function fecha(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString("es-AR");
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value ?? "");
}

function setMensajeFicha(text, type = "info") {
  const element = document.getElementById("mensajeFicha");
  if (!element) return;
  element.textContent = text;
  element.className = `form-message ${type}`;
}

function exportarFichaPDF() {
  if (!fichaAlumnoActual || !fichaDatosActuales) {
    setMensajeFicha("Primero cargá una ficha para generar el informe.", "error");
    return;
  }
  if (!window.ADAExport?.openDocument) {
    setMensajeFicha("No se pudo iniciar la exportación del informe.", "error");
    return;
  }

  const curso = fichaCursos.find((item) => String(item.id) === String(fichaAlumnoActual.curso_id));
  const nombre = `${fichaAlumnoActual.apellido || ""}, ${fichaAlumnoActual.nombre || ""}`.trim().replace(/^,/, "");
  const { notas, asistencia, actividades, documentacion, convivencia } = fichaDatosActuales;
  const tabla = (titulo, encabezados, filas) => `
    <h2>${fichaEsc(titulo)}</h2>
    <table><thead><tr>${encabezados.map((item) => `<th>${fichaEsc(item)}</th>`).join("")}</tr></thead>
    <tbody>${filas.length ? filas.join("") : `<tr><td colspan="${encabezados.length}">Sin datos registrados.</td></tr>`}</tbody></table>`;

  const body = `
    <table>
      <tr><th>Alumno</th><td>${fichaEsc(nombre || "-")}</td></tr>
      <tr><th>Documento</th><td>${fichaEsc(fichaAlumnoActual.documento || fichaAlumnoActual.dni || "-")}</td></tr>
      <tr><th>Curso</th><td>${fichaEsc(curso?.nombre || "-")}</td></tr>
      <tr><th>Promedio</th><td>${fichaEsc(calcularPromedio(notas) || "-")}</td></tr>
    </table>
    ${tabla("Calificaciones", ["Materia", "Evaluación", "Nota", "Fecha"], notas.map((item) => `<tr><td>${fichaEsc(item.materia_nombre || item.materia || "-")}</td><td>${fichaEsc(item.evaluacion_nombre || item.evaluacion || "-")}</td><td>${fichaEsc(item.nota ?? "-")}</td><td>${fichaEsc(fecha(item.fecha || item.created_at))}</td></tr>`))}
    ${tabla("Asistencia", ["Fecha", "Estado", "Clase", "Observación"], asistencia.map((item) => `<tr><td>${fichaEsc(fecha(item.fecha || item.created_at))}</td><td>${fichaEsc(item.estado || item.estado_asistencia || "-")}</td><td>${fichaEsc(item.materia_nombre || item.clase || "-")}</td><td>${fichaEsc(item.observacion || "")}</td></tr>`))}
    ${tabla("Actividades y entregas", ["Actividad", "Materia", "Estado", "Calificación"], actividades.map((item) => `<tr><td>${fichaEsc(item.actividad_titulo || item.titulo || "-")}</td><td>${fichaEsc(item.materia_nombre || "-")}</td><td>${fichaEsc(item.estado || "-")}</td><td>${fichaEsc(item.calificacion ?? "-")}</td></tr>`))}
    ${tabla("Documentación", ["Trámite", "Estado", "Fecha", "Observación"], documentacion.map((item) => `<tr><td>${fichaEsc(item.titulo || item.tipo_tramite || "-")}</td><td>${fichaEsc(item.estado || "-")}</td><td>${fichaEsc(fecha(item.created_at || item.fecha_envio))}</td><td>${fichaEsc(item.observacion_revision || item.observacion || "")}</td></tr>`))}
    ${tabla("Convivencia", ["Fecha", "Gravedad", "Hecho", "Estado"], convivencia.map((item) => `<tr><td>${fichaEsc(fecha(item.fecha_hecho || item.created_at))}</td><td>${fichaEsc(item.gravedad || "-")}</td><td>${fichaEsc(item.descripcion || "-")}</td><td>${fichaEsc(item.estado || "-")}</td></tr>`))}`;

  window.ADAExport.openDocument(`Ficha integral — ${nombre || "Alumno"}`, body);
}
