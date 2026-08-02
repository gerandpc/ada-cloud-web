"use strict";

let perfilB = null;
let cursosB = [];
let alumnosB = [];
let materiasB = [];
let boletinesB = [];
let actasB = [];
let estadosB = [];

const ROLES_PERMITIDOS = ["admin", "directivo", "secretaria"];

function escB(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function normalizarRolB(value) {
  return String(value || "").trim().toLowerCase();
}

function mensajeTecnicoB(error, fallback) {
  console.error(error);
  return fallback;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    perfilB = await obtenerSesionPerfil();
    if (!perfilB) return;

    const rol = normalizarRolB(perfilB.rol);
    if (!ROLES_PERMITIDOS.includes(rol)) {
      window.location.replace("dashboard.html");
      return;
    }

    configurarPestanasB();
    vincularEventosB();
    await cargarCatalogosB();
    await cargarDatosB();
    msgB("Información académica actualizada.", "success");
  } catch (error) {
    msgB(mensajeTecnicoB(error, "No se pudo cargar la información académica."), "error");
  }
});

function configurarPestanasB() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab)?.classList.add("active");
    });
  });
}

function vincularEventosB() {
  document.getElementById("btnBuscarBoletines")?.addEventListener("click", cargarDatosB);
  document.getElementById("btnExportarBoletin")?.addEventListener("click", exportarVistaActivaPdfB);
  document.getElementById("btnExportarBoletinCsv")?.addEventListener("click", exportarVistaActivaCsvB);
}

async function cargarCatalogosB() {
  [cursosB, alumnosB, materiasB] = await Promise.all([
    consultaSeguraB("cursos", "*", "anio", true),
    consultaSeguraB("alumnos", "*", "apellido", true),
    consultaSeguraB("materias", "*", "nombre", true)
  ]);

  llenarSelectorB("boletinCurso", cursosB, (curso) => nombreCursoB(curso));
  llenarSelectorB("boletinAlumno", alumnosB, (alumno) => nombreAlumnoB(alumno));
}

async function cargarDatosB() {
  msgB("Actualizando información...", "info");

  [boletinesB, actasB, estadosB] = await Promise.all([
    consultaSeguraB("boletines_alumno", "*", "created_at", false),
    consultaSeguraB("actas_academicas", "*", "created_at", false),
    consultaSeguraB("estados_academicos_alumno", "*", "created_at", false)
  ]);

  renderizarB();
  msgB("Información académica actualizada.", "success");
}

function filtrosB() {
  return {
    cursoId: valorB("boletinCurso"),
    alumnoId: valorB("boletinAlumno"),
    instancia: valorB("boletinInstancia")
  };
}

function coincideB(registro, incluirAlumno = true) {
  const { cursoId, alumnoId, instancia } = filtrosB();
  return (!cursoId || String(registro.curso_id) === String(cursoId))
    && (!incluirAlumno || !alumnoId || String(registro.alumno_id) === String(alumnoId))
    && (!instancia || String(registro.instancia || "") === String(instancia));
}

function renderizarB() {
  const boletinesFiltrados = boletinesB.filter((registro) => coincideB(registro, true));
  const actasFiltradas = actasB.filter((registro) => coincideB(registro, false));
  const estadosFiltrados = estadosB.filter((registro) => coincideB(registro, true));

  renderizarBoletinesB(boletinesFiltrados);
  renderizarActasB(actasFiltradas);
  renderizarEstadosB(estadosFiltrados);
  actualizarResumenB(boletinesFiltrados, actasFiltradas, estadosFiltrados);
}

function renderizarBoletinesB(registros) {
  const tbody = document.getElementById("tablaBoletines");
  if (!tbody) return;

  tbody.innerHTML = registros.length
    ? registros.map((boletin) => `
      <tr>
        <td>${escB(nombreAlumnoPorIdB(boletin.alumno_id))}</td>
        <td>${escB(nombreCursoPorIdB(boletin.curso_id))}</td>
        <td>${escB(etiquetaInstanciaB(boletin.instancia))}</td>
        <td>${escB(formatearNotaB(boletin.promedio))}</td>
        <td><span class="status-pill ${claseEstadoB(boletin.estado)}">${escB(boletin.estado || "Sin estado")}</span></td>
        <td>${escB(fechaB(boletin.created_at || boletin.fecha_emision))}</td>
      </tr>`).join("")
    : '<tr><td colspan="6" class="empty-cell">No se encontraron boletines para los filtros seleccionados.</td></tr>';
}

function renderizarActasB(registros) {
  const tbody = document.getElementById("tablaActas");
  if (!tbody) return;

  tbody.innerHTML = registros.length
    ? registros.map((acta) => `
      <tr>
        <td>${escB(nombreCursoPorIdB(acta.curso_id))}</td>
        <td>${escB(acta.materia_id ? nombreMateriaPorIdB(acta.materia_id) : "Todas las materias")}</td>
        <td>${escB(etiquetaInstanciaB(acta.instancia))}</td>
        <td>${escB(fechaB(acta.fecha_acta || acta.created_at))}</td>
        <td><span class="status-pill ${claseEstadoB(acta.estado)}">${escB(acta.estado || "Sin estado")}</span></td>
        <td><button class="btn-mini" type="button" data-acta-id="${escB(acta.id)}">Generar PDF</button></td>
      </tr>`).join("")
    : '<tr><td colspan="6" class="empty-cell">No se encontraron actas para los filtros seleccionados.</td></tr>';

  tbody.querySelectorAll("[data-acta-id]").forEach((boton) => {
    boton.addEventListener("click", () => exportarActaPdfB(boton.dataset.actaId));
  });
}

function renderizarEstadosB(registros) {
  const tbody = document.getElementById("tablaEstados");
  if (!tbody) return;

  tbody.innerHTML = registros.length
    ? registros.map((estado) => `
      <tr>
        <td>${escB(nombreAlumnoPorIdB(estado.alumno_id))}</td>
        <td>${escB(estado.materia_id ? nombreMateriaPorIdB(estado.materia_id) : "-")}</td>
        <td><span class="status-pill ${claseEstadoAcademicoB(estado.estado_academico)}">${escB(estado.estado_academico || "Sin estado")}</span></td>
        <td>${escB(etiquetaInstanciaB(estado.instancia))}</td>
        <td>${escB(formatearNotaB(estado.nota_final))}</td>
        <td>${escB(estado.observacion || "")}</td>
      </tr>`).join("")
    : '<tr><td colspan="6" class="empty-cell">No se encontraron estados académicos para los filtros seleccionados.</td></tr>';
}

function actualizarResumenB(boletines, actas, estados) {
  const resumen = document.getElementById("resumenBoletinesActas");
  if (!resumen) return;

  const aprobados = estados.filter((item) => normalizarRolB(item.estado_academico).includes("aprob")).length;
  resumen.innerHTML = `
    <article><strong>${boletines.length}</strong><span>Boletines</span></article>
    <article><strong>${actas.length}</strong><span>Actas</span></article>
    <article><strong>${estados.length}</strong><span>Estados académicos</span></article>
    <article><strong>${aprobados}</strong><span>Estados aprobados</span></article>`;
}

function exportarVistaActivaPdfB() {
  const panelActivo = document.querySelector(".tab-panel.active");
  const tabla = panelActivo?.querySelector("table");
  if (!tabla || !tabla.querySelector("tbody tr:not(.empty-cell)")) {
    msgB("No hay información disponible para generar el documento.", "error");
    return;
  }

  const titulo = panelActivo.querySelector("h2")?.textContent?.trim() || "Información académica";
  const filtros = descripcionFiltrosB();
  const contenido = `<p><strong>Filtros:</strong> ${escB(filtros)}</p>${limpiarTablaParaDocumentoB(tabla)}`;

  if (window.ADAExport?.openDocument) {
    window.ADAExport.openDocument(titulo, contenido);
  } else {
    msgB("No se pudo iniciar la generación del PDF.", "error");
  }
}

function exportarActaPdfB(actaId) {
  const acta = actasB.find((item) => String(item.id) === String(actaId));
  if (!acta) {
    msgB("No se encontró el acta seleccionada.", "error");
    return;
  }

  const filas = [
    ["Curso", nombreCursoPorIdB(acta.curso_id)],
    ["Materia", acta.materia_id ? nombreMateriaPorIdB(acta.materia_id) : "Todas las materias"],
    ["Instancia", etiquetaInstanciaB(acta.instancia)],
    ["Fecha", fechaB(acta.fecha_acta || acta.created_at)],
    ["Estado", acta.estado || "Sin estado"],
    ["Observaciones", acta.observaciones || acta.observacion || "-"]
  ];

  const contenido = `<table>${filas.map(([etiqueta, valor]) => `<tr><th>${escB(etiqueta)}</th><td>${escB(valor)}</td></tr>`).join("")}</table>`;
  window.ADAExport?.openDocument("Acta académica", contenido);
}

function exportarVistaActivaCsvB() {
  const panelActivo = document.querySelector(".tab-panel.active");
  const tabla = panelActivo?.querySelector("table");
  if (!tabla) {
    msgB("No hay información disponible para exportar.", "error");
    return;
  }

  const filas = [...tabla.querySelectorAll("tr")].map((fila) => [...fila.querySelectorAll("th,td")]
    .slice(0, -1)
    .map((celda) => `"${String(celda.textContent || "").trim().replace(/"/g, '""')}"`)
    .join(","));

  if (filas.length <= 1) {
    msgB("No hay registros disponibles para exportar.", "error");
    return;
  }

  const blob = new Blob(["\ufeff" + filas.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = `ada_boletines_actas_${new Date().toISOString().slice(0, 10)}.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

function limpiarTablaParaDocumentoB(tabla) {
  const clon = tabla.cloneNode(true);
  clon.querySelectorAll("button").forEach((boton) => boton.remove());
  clon.querySelectorAll("tr").forEach((fila) => {
    const ultima = fila.lastElementChild;
    if (ultima && /acciones/i.test(tabla.querySelector("thead th:last-child")?.textContent || "")) ultima.remove();
  });
  return clon.outerHTML;
}

function descripcionFiltrosB() {
  const curso = document.getElementById("boletinCurso")?.selectedOptions?.[0]?.textContent || "Todos";
  const alumno = document.getElementById("boletinAlumno")?.selectedOptions?.[0]?.textContent || "Todos";
  const instancia = document.getElementById("boletinInstancia")?.selectedOptions?.[0]?.textContent || "Todas";
  return `Curso: ${curso} · Alumno: ${alumno} · Instancia: ${instancia}`;
}

function llenarSelectorB(id, registros, etiqueta) {
  const selector = document.getElementById(id);
  if (!selector) return;
  selector.textContent = "";
  selector.append(new Option("Todos", ""));
  registros.forEach((registro) => selector.append(new Option(etiqueta(registro), registro.id)));
}

function valorB(id) {
  return document.getElementById(id)?.value || "";
}

function nombreCursoB(curso) {
  return curso?.nombre || `${curso?.anio || ""} ${curso?.division || ""}`.trim() || "Curso sin nombre";
}

function nombreCursoPorIdB(id) {
  return nombreCursoB(cursosB.find((item) => String(item.id) === String(id)));
}

function nombreAlumnoB(alumno) {
  return `${alumno?.apellido || ""}, ${alumno?.nombre || ""}`.replace(/^,\s*/, "").trim() || "Alumno sin nombre";
}

function nombreAlumnoPorIdB(id) {
  const alumno = alumnosB.find((item) => String(item.id) === String(id));
  return alumno ? nombreAlumnoB(alumno) : "Alumno no disponible";
}

function nombreMateriaPorIdB(id) {
  const materia = materiasB.find((item) => String(item.id) === String(id));
  return materia?.nombre || "Materia no disponible";
}

function etiquetaInstanciaB(value) {
  const etiquetas = {
    primer_bimestre: "Primer bimestre",
    segundo_bimestre: "Segundo bimestre",
    tercer_bimestre: "Tercer bimestre",
    cuarto_bimestre: "Cuarto bimestre",
    primer_cuatrimestre: "Primer cuatrimestre",
    segundo_cuatrimestre: "Segundo cuatrimestre",
    diciembre: "Diciembre",
    febrero: "Febrero",
    anual: "Anual"
  };
  return etiquetas[value] || value || "-";
}

function formatearNotaB(value) {
  if (value === null || value === undefined || value === "") return "-";
  const numero = Number(value);
  return Number.isFinite(numero) ? numero.toLocaleString("es-AR", { maximumFractionDigits: 2 }) : String(value);
}

function fechaB(value) {
  if (!value) return "-";
  const fecha = new Date(value);
  return Number.isNaN(fecha.getTime()) ? String(value) : fecha.toLocaleDateString("es-AR");
}

function claseEstadoB(value) {
  const estado = normalizarRolB(value);
  if (estado.includes("emit") || estado.includes("public") || estado.includes("aprob") || estado.includes("cerr")) return "ok";
  if (estado.includes("observ") || estado.includes("pend") || estado.includes("revis")) return "warn";
  return "neutral";
}

function claseEstadoAcademicoB(value) {
  const estado = normalizarRolB(value);
  if (estado.includes("aprob") || estado.includes("promoc")) return "ok";
  if (estado.includes("desaprob") || estado.includes("libre")) return "danger";
  return "warn";
}

async function consultaSeguraB(tabla, columnas = "*", orden = null, ascendente = true) {
  try {
    let consulta = supabaseClient.from(tabla).select(columnas).limit(5000);
    if (orden) consulta = consulta.order(orden, { ascending: ascendente });
    const { data, error } = await consulta;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn(`No se pudo consultar ${tabla}:`, error);
    return [];
  }
}

function msgB(texto, tipo = "info") {
  const elemento = document.getElementById("mensajeBoletines");
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.className = `form-message ${tipo}`;
}
