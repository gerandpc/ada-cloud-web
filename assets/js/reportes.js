"use strict";

const qs = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
}[char]));

let contexto = null;
let cursos = [];
let alumnos = [];
let lastData = { asistencia: [], seguimiento: [], usuarios: [], documentos: [], estructura: [] };

function option(items, placeholder = "Todos", labelFn = (item) => item.nombre) {
  return `<option value="">${esc(placeholder)}</option>` + items.map((item) =>
    `<option value="${esc(item.id)}">${esc(labelFn(item))}</option>`
  ).join("");
}

function configurarTabs() {
  document.querySelectorAll(".report-tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".report-tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".report-section").forEach((section) => section.classList.remove("active"));
      button.classList.add("active");
      qs(`tab-${button.dataset.tab}`)?.classList.add("active");
    });
  });
}

function badge(text, className = "") {
  return `<span class="badge ${esc(className)}">${esc(text || "-")}</span>`;
}

function tabla(headers, rows) {
  if (!rows.length) return "<p class='helper-text'>No hay datos para mostrar con los filtros seleccionados.</p>";
  return `<table class="ada-table"><thead><tr>${headers.map((header) => `<th>${esc(header)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function mostrarError(targetId, message = "No fue posible generar el reporte.") {
  const target = qs(targetId);
  if (target) target.innerHTML = `<p class="form-message error">${esc(message)}</p>`;
}

function configurarVistaPorRol() {
  const rol = String(contexto?.perfil?.rol || "").toLowerCase();
  const institucional = ["admin", "directivo", "secretaria"].includes(rol);
  document.querySelectorAll('[data-report-scope="institucional"]').forEach((element) => {
    element.hidden = !institucional;
  });
  if (!institucional) {
    const active = document.querySelector(".report-tab.active[hidden]");
    if (active) document.querySelector('.report-tab[data-tab="asistencia"]')?.click();
  }
}

async function cargarBase() {
  contexto = await obtenerSesionPerfil();
  if (!contexto) return;
  configurarVistaPorRol();

  const rol = String(contexto.perfil?.rol || "").toLowerCase();
  const institucional = ["admin", "directivo", "secretaria"].includes(rol);

  const [cursosRes, alumnosRes] = await Promise.all([
    supabaseClient.from("cursos").select("id,nombre").order("nombre"),
    supabaseClient.from("profiles").select("id,nombre,apellido").eq("rol", "alumno").eq("activo", true).order("apellido")
  ]);

  cursos = cursosRes.data || [];
  alumnos = alumnosRes.data || [];
  qs("filtroAsistenciaCurso").innerHTML = option(cursos);
  qs("filtroSeguimientoCurso").innerHTML = option(cursos);
  const alumnoOptions = option(alumnos, "Todos", (alumno) => `${alumno.apellido || ""}, ${alumno.nombre || ""}`.trim());
  qs("filtroAsistenciaAlumno").innerHTML = alumnoOptions;
  qs("filtroSeguimientoAlumno").innerHTML = alumnoOptions;

  if (institucional) {
    const [usuariosRes, materiasRes, documentosRes] = await Promise.all([
      supabaseClient.from("profiles").select("id", { count: "exact", head: true }),
      supabaseClient.from("materias").select("id", { count: "exact", head: true }),
      supabaseClient.from("documentos").select("id", { count: "exact", head: true })
    ]);
    qs("statUsuarios").textContent = usuariosRes.count || 0;
    qs("statMaterias").textContent = materiasRes.count || 0;
    qs("statDocumentos").textContent = documentosRes.count || 0;
  }
  qs("statCursos").textContent = cursos.length;
}

async function reporteAsistencia() {
  const { data: rawData, error } = await supabaseClient.from("v_reporte_asistencia_detalle").select("*").order("fecha", { ascending: false }).limit(5000);
  if (error) {
    console.error(error);
    mostrarError("tablaAsistencia", "No fue posible consultar la asistencia.");
    return;
  }
  const curso = qs("filtroAsistenciaCurso").value;
  const alumno = qs("filtroAsistenciaAlumno").value;
  const desde = qs("filtroAsistenciaDesde").value;
  const hasta = qs("filtroAsistenciaHasta").value;
  let data = rawData || [];
  if (curso) data = data.filter((row) => row.curso_id === curso);
  if (alumno) data = data.filter((row) => row.alumno_id === alumno);
  if (desde) data = data.filter((row) => row.fecha >= desde);
  if (hasta) data = data.filter((row) => row.fecha <= hasta);
  lastData.asistencia = data;

  const total = data.length;
  const ausentes = data.filter((row) => row.computa_inasistencia).length;
  const presentes = data.filter((row) => row.estado_codigo === "presente").length;
  const tarde = data.filter((row) => row.estado_codigo === "tarde").length;
  const porcentaje = total ? Math.round((presentes / total) * 100) : 0;
  qs("resumenAsistencia").innerHTML = `<strong>Resumen</strong><br>Total: ${total} · Presentes: ${presentes} · Tardanzas: ${tarde} · Ausencias computables: ${ausentes} · Asistencia: ${porcentaje}%`;
  qs("tablaAsistencia").innerHTML = tabla(
    ["Fecha", "Alumno", "Curso", "Materia", "Estado", "Observación"],
    data.map((row) => `<tr><td>${esc(row.fecha || "-")}</td><td>${esc(`${row.alumno_apellido || ""}, ${row.alumno_nombre || ""}`)}</td><td>${esc(row.curso || "-")}</td><td>${esc(row.materia || "-")}</td><td>${badge(row.estado, row.computa_inasistencia ? "badge-red" : "badge-green")}</td><td>${esc(row.observacion || "-")}</td></tr>`)
  );
}

async function reporteSeguimiento() {
  const { data: rawData, error } = await supabaseClient.from("v_reporte_seguimiento_detalle").select("*").order("creado_en", { ascending: false }).limit(5000);
  if (error) {
    console.error(error);
    mostrarError("tablaSeguimiento", "No fue posible consultar los seguimientos.");
    return;
  }
  const curso = qs("filtroSeguimientoCurso").value;
  const alumno = qs("filtroSeguimientoAlumno").value;
  const prioridad = qs("filtroSeguimientoPrioridad").value;
  const tipo = qs("filtroSeguimientoTipo").value.trim().toLowerCase();
  let data = rawData || [];
  if (curso) data = data.filter((row) => row.curso_id === curso);
  if (alumno) data = data.filter((row) => row.alumno_id === alumno);
  if (prioridad) data = data.filter((row) => row.prioridad === prioridad);
  if (tipo) data = data.filter((row) => String(row.tipo || "").toLowerCase().includes(tipo));
  lastData.seguimiento = data;
  qs("tablaSeguimiento").innerHTML = tabla(
    ["Fecha", "Alumno", "Curso", "Tipo", "Prioridad", "Visible para familia", "Descripción"],
    data.map((row) => `<tr><td>${esc(row.creado_en ? new Date(row.creado_en).toLocaleDateString("es-AR") : "-")}</td><td>${esc(`${row.alumno_apellido || ""}, ${row.alumno_nombre || ""}`)}</td><td>${esc(row.curso || "-")}</td><td>${badge(row.tipo, "badge-blue")}</td><td>${badge(row.prioridad, row.prioridad === "alta" ? "badge-red" : row.prioridad === "media" ? "badge-yellow" : "badge-green")}</td><td>${row.visible_familia ? "Sí" : "No"}</td><td>${esc(row.descripcion || "-")}</td></tr>`)
  );
}

async function reporteUsuarios() {
  const { data, error } = await supabaseClient.from("profiles").select("nombre,apellido,email,rol,activo,creado_en").order("rol").order("apellido");
  if (error) {
    console.error(error);
    mostrarError("tablaUsuariosReporte", "No fue posible consultar los usuarios.");
    return;
  }
  lastData.usuarios = data || [];
  qs("tablaUsuariosReporte").innerHTML = tabla(
    ["Usuario", "Correo", "Rol", "Estado", "Creado"],
    lastData.usuarios.map((user) => `<tr><td>${esc(`${user.apellido || ""}, ${user.nombre || ""}`)}</td><td>${esc(user.email || "")}</td><td>${badge(user.rol, "badge-blue")}</td><td>${user.activo ? badge("Activo", "badge-green") : badge("Inactivo", "badge-red")}</td><td>${esc(user.creado_en ? new Date(user.creado_en).toLocaleDateString("es-AR") : "-")}</td></tr>`)
  );
}

async function reporteDocumentos() {
  const { data, error } = await supabaseClient.from("documentos").select("titulo,tipo_documento,puede_usarse_ia,puede_descargarse,visible_general,nombre_archivo_original,mime_type,tamanio_bytes,creado_en,activo").order("creado_en", { ascending: false });
  if (error) {
    console.error(error);
    mostrarError("tablaDocumentosReporte", "No fue posible consultar los documentos.");
    return;
  }
  lastData.documentos = data || [];
  qs("tablaDocumentosReporte").innerHTML = tabla(
    ["Documento", "Tipo", "IA", "Descarga", "Visible general", "Archivo", "Estado"],
    lastData.documentos.map((documento) => `<tr><td>${esc(documento.titulo || "-")}</td><td>${esc(documento.tipo_documento || "-")}</td><td>${documento.puede_usarse_ia ? "Sí" : "No"}</td><td>${documento.puede_descargarse ? "Sí" : "No"}</td><td>${documento.visible_general ? "Sí" : "No"}</td><td>${esc(documento.nombre_archivo_original || "-")}<br><small>${esc(documento.mime_type || "")} ${documento.tamanio_bytes ? `${Math.round(documento.tamanio_bytes / 1024)} KB` : ""}</small></td><td>${documento.activo ? badge("Activo", "badge-green") : badge("Inactivo", "badge-red")}</td></tr>`)
  );
}

async function reporteEstructura() {
  const { data, error } = await supabaseClient.from("materias").select("nombre,carga_horaria_semanal,tipo_materia,cursos(nombre,niveles(nombre),anios_grados(nombre),divisiones(nombre),modalidades(nombre))").order("nombre");
  if (error) {
    console.error(error);
    mostrarError("tablaEstructuraReporte", "No fue posible consultar la estructura académica.");
    return;
  }
  lastData.estructura = (data || []).map((materia) => ({
    curso: materia.cursos?.nombre || "",
    nivel: materia.cursos?.niveles?.nombre || "",
    anio: materia.cursos?.anios_grados?.nombre || "",
    division: materia.cursos?.divisiones?.nombre || "",
    modalidad: materia.cursos?.modalidades?.nombre || "",
    materia: materia.nombre,
    carga_horaria_semanal: materia.carga_horaria_semanal,
    tipo_materia: materia.tipo_materia
  }));
  qs("tablaEstructuraReporte").innerHTML = tabla(
    ["Curso", "Nivel", "Año", "División", "Modalidad", "Materia", "Carga", "Tipo"],
    lastData.estructura.map((row) => `<tr><td>${esc(row.curso)}</td><td>${esc(row.nivel)}</td><td>${esc(row.anio)}</td><td>${esc(row.division)}</td><td>${esc(row.modalidad || "-")}</td><td>${esc(row.materia)}</td><td>${esc(row.carga_horaria_semanal || "-")} hs</td><td>${esc(row.tipo_materia || "-")}</td></tr>`)
  );
}

function downloadCSV(filename, rows) {
  if (!rows?.length) {
    alert("Primero generá un reporte con información para exportar.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function extraerTabla(elemento) {
  const table = elemento?.querySelector?.("table") || (elemento?.tagName === "TABLE" ? elemento : null);
  if (!table) return null;
  const headers = [...table.querySelectorAll("thead th")].map((cell) => cell.textContent.trim());
  const rows = [...table.querySelectorAll("tbody tr")].map((row) =>
    [...row.querySelectorAll("td")].map((cell) => cell.textContent.replace(/\s+/g, " ").trim())
  );
  return headers.length ? { headers, rows } : null;
}

function exportarPDF(title, selectors) {
  const blocks = selectors.map((selector) => document.querySelector(selector)).filter((element) => element && element.textContent.trim());
  if (!blocks.length) {
    alert("Primero generá el reporte que querés exportar.");
    return;
  }
  if (!window.ADA_PDF?.create) {
    alert("El motor PDF de ADA no está disponible. Recargá la página e intentá nuevamente.");
    return;
  }

  const pdf = window.ADA_PDF.create({
    title,
    subtitle: `Generado ${new Date().toLocaleString("es-AR")}`,
    filename: `${title.replace(/[^a-z0-9]+/gi, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`,
    institution: "ADA Cloud"
  });

  pdf.heading("Síntesis del reporte", 1);
  blocks.forEach((element) => {
    const tablaDetectada = extraerTabla(element);
    if (tablaDetectada) {
      pdf.table(tablaDetectada.headers, tablaDetectada.rows, { fontSize: tablaDetectada.headers.length >= 6 ? 6.8 : 8 });
      return;
    }
    const texto = element.textContent.replace(/\s+/g, " ").trim();
    if (texto) pdf.paragraph(texto);
  });
  pdf.note("Documento generado automáticamente por ADA Cloud. Los datos deben interpretarse conforme a los criterios institucionales vigentes.");
  pdf.download();
}

function bindEvents() {
  qs("btnReporteAsistencia")?.addEventListener("click", reporteAsistencia);
  qs("btnExportAsistencia")?.addEventListener("click", () => downloadCSV("reporte_asistencia.csv", lastData.asistencia));
  qs("btnPDFAsistencia")?.addEventListener("click", () => exportarPDF("Reporte de asistencia", ["#resumenAsistencia", "#tablaAsistencia"]));

  qs("btnReporteSeguimiento")?.addEventListener("click", reporteSeguimiento);
  qs("btnExportSeguimiento")?.addEventListener("click", () => downloadCSV("reporte_seguimiento.csv", lastData.seguimiento));
  qs("btnPDFSeguimiento")?.addEventListener("click", () => exportarPDF("Reporte de seguimiento", ["#tablaSeguimiento"]));

  qs("btnReporteUsuarios")?.addEventListener("click", reporteUsuarios);
  qs("btnExportUsuarios")?.addEventListener("click", () => downloadCSV("reporte_usuarios.csv", lastData.usuarios));
  qs("btnPDFUsuarios")?.addEventListener("click", () => exportarPDF("Reporte de usuarios", ["#tablaUsuariosReporte"]));

  qs("btnReporteDocumentos")?.addEventListener("click", reporteDocumentos);
  qs("btnExportDocumentos")?.addEventListener("click", () => downloadCSV("reporte_documentos.csv", lastData.documentos));
  qs("btnPDFDocumentos")?.addEventListener("click", () => exportarPDF("Reporte de documentos", ["#tablaDocumentosReporte"]));

  qs("btnReporteEstructura")?.addEventListener("click", reporteEstructura);
  qs("btnExportEstructura")?.addEventListener("click", () => downloadCSV("reporte_estructura_academica.csv", lastData.estructura));
  qs("btnPDFEstructura")?.addEventListener("click", () => exportarPDF("Estructura académica", ["#tablaEstructuraReporte"]));
}

configurarTabs();
bindEvents();
cargarBase();
