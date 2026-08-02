"use strict";

let perfilCierre = null;
let cursos = [];
let materias = [];
let cierres = [];
let boletines = [];
let actas = [];

const ROLES_GESTION = ["admin", "directivo", "secretaria"];
const ROLES_REAPERTURA = ["admin", "directivo"];

const $ = (id) => document.getElementById(id);
const value = (id) => $(id)?.value?.trim() || "";
const text = (id, contenido) => { const nodo = $(id); if (nodo) nodo.textContent = String(contenido ?? ""); };
const normalizar = (valor) => String(valor ?? "").trim();

function escapeHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mensaje(contenido, tipo = "info") {
  const nodo = $("mensajeCierres");
  if (!nodo) return;
  nodo.textContent = contenido;
  nodo.className = `form-message ${tipo}`;
}

function rolActual() {
  return normalizar(perfilCierre?.rol).toLowerCase();
}

function puedeGestionar() {
  return ROLES_GESTION.includes(rolActual());
}

function puedeReabrir() {
  return ROLES_REAPERTURA.includes(rolActual());
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    perfilCierre = await obtenerSesionPerfil();
    if (!perfilCierre) return;

    if (!puedeGestionar()) {
      mensaje("No tenés permisos para administrar cierres académicos.", "error");
      document.querySelectorAll("form, .gestion-cierres").forEach((nodo) => nodo.hidden = true);
      return;
    }

    enlazarEventos();
    await cargarCatalogos();
    await cargarTodo();
    mensaje("Información académica actualizada.", "success");
  } catch (error) {
    console.error("Error al iniciar cierres académicos", error);
    mensaje("No se pudo cargar la información académica. Intentá nuevamente.", "error");
  }
});

function enlazarEventos() {
  $("formCierre")?.addEventListener("submit", guardarCierre);
  $("btnActualizarCierres")?.addEventListener("click", cargarTodo);
  $("btnGenerarEstados")?.addEventListener("click", generarEstados);
  $("btnGenerarBoletines")?.addEventListener("click", generarBoletines);
  $("btnGenerarActa")?.addEventListener("click", generarActa);
  $("btnExportarCierres")?.addEventListener("click", exportarCierresPdf);
  $("btnExportarActa")?.addEventListener("click", exportarActaPdf);
}

async function cargarCatalogos() {
  [cursos, materias] = await Promise.all([
    consultaSegura("cursos", "*", "anio", true),
    consultaSegura("materias", "*", "nombre", true),
  ]);

  completarSelect("cierreCurso", cursos, etiquetaCurso, "Seleccionar curso");
  completarSelect("cierreMateria", materias, (m) => m.nombre || m.descripcion || "Materia", "Todas las materias", true);

  const responsable = perfilCierre?.nombre_completo
    || [perfilCierre?.nombre, perfilCierre?.apellido].filter(Boolean).join(" ")
    || perfilCierre?.email
    || "Responsable institucional";

  if ($("cierreResponsable")) $("cierreResponsable").value = responsable;
  if ($("cierreFecha")) $("cierreFecha").value = new Date().toISOString().slice(0, 10);
}

async function guardarCierre(evento) {
  evento.preventDefault();
  if (!puedeGestionar()) return mensaje("No tenés permisos para registrar cierres.", "error");

  const cursoId = value("cierreCurso");
  const materiaId = value("cierreMateria") || null;
  const instancia = value("cierreInstancia");
  const fechaCierre = value("cierreFecha");
  const estado = value("cierreEstado");

  if (!cursoId || !instancia || !fechaCierre || !estado) {
    return mensaje("Completá curso, instancia, fecha y estado.", "error");
  }

  const existente = cierres.find((cierre) =>
    String(cierre.curso_id) === cursoId
    && String(cierre.materia_id || "") === String(materiaId || "")
    && normalizar(cierre.instancia) === instancia
    && normalizar(cierre.estado) !== "abierto"
  );

  if (existente) {
    return mensaje("Ya existe un cierre vigente para ese curso, materia e instancia.", "error");
  }

  const payload = {
    curso_id: cursoId,
    materia_id: materiaId,
    instancia,
    fecha_cierre: fechaCierre,
    estado,
    observacion: value("cierreObservacion") || null,
    cerrado_por: perfilCierre?.id || null,
  };

  const { error } = await supabaseClient.from("cierres_academicos").insert(payload);
  if (error) {
    console.error("Error al registrar cierre", error);
    return mensaje("No se pudo registrar el cierre académico.", "error");
  }

  $("formCierre")?.reset();
  if ($("cierreFecha")) $("cierreFecha").value = new Date().toISOString().slice(0, 10);
  if ($("cierreResponsable")) $("cierreResponsable").value = perfilCierre?.nombre || perfilCierre?.email || "Responsable institucional";
  await cargarTodo();
  mensaje("Cierre académico registrado correctamente.", "success");
}

async function cargarTodo() {
  mensaje("Actualizando información…", "info");
  [cierres, boletines, actas] = await Promise.all([
    consultaSegura("cierres_academicos", "*", "created_at"),
    consultaSegura("boletines_alumno", "*", "created_at"),
    consultaSegura("actas_academicas", "*", "created_at"),
  ]);
  renderizarCierres();
  actualizarIndicadores();
  mensaje("Información académica actualizada.", "success");
}

function renderizarCierres() {
  const cuerpo = $("tablaCierres");
  if (!cuerpo) return;
  cuerpo.replaceChildren();

  if (!cierres.length) {
    const fila = document.createElement("tr");
    const celda = document.createElement("td");
    celda.colSpan = 7;
    celda.textContent = "No hay cierres académicos registrados.";
    fila.appendChild(celda);
    cuerpo.appendChild(fila);
    return;
  }

  cierres.forEach((cierre) => {
    const fila = document.createElement("tr");
    agregarCelda(fila, etiquetaCursoPorId(cierre.curso_id));
    agregarCelda(fila, cierre.materia_id ? etiquetaMateriaPorId(cierre.materia_id) : "Todas las materias");
    agregarCelda(fila, etiquetaInstancia(cierre.instancia));
    agregarCelda(fila, formatearFecha(cierre.fecha_cierre));

    const estadoTd = document.createElement("td");
    const estado = document.createElement("span");
    estado.className = `status-pill ${claseEstado(cierre.estado)}`;
    estado.textContent = etiquetaEstado(cierre.estado);
    estadoTd.appendChild(estado);
    fila.appendChild(estadoTd);

    agregarCelda(fila, cierre.observacion || "Sin observaciones");

    const acciones = document.createElement("td");
    if (puedeReabrir() && normalizar(cierre.estado) === "cerrado") {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "btn-mini";
      boton.textContent = "Reabrir";
      boton.addEventListener("click", () => reabrirCierre(cierre.id));
      acciones.appendChild(boton);
    } else {
      acciones.textContent = "—";
    }
    fila.appendChild(acciones);
    cuerpo.appendChild(fila);
  });
}

function agregarCelda(fila, contenido) {
  const celda = document.createElement("td");
  celda.textContent = normalizar(contenido) || "—";
  fila.appendChild(celda);
}

async function reabrirCierre(id) {
  if (!puedeReabrir()) return mensaje("Solo Administración o Dirección pueden reabrir un cierre.", "error");
  if (!window.confirm("¿Confirmás la reapertura de este cierre académico?")) return;

  const { error } = await supabaseClient
    .from("cierres_academicos")
    .update({ estado: "abierto" })
    .eq("id", id);

  if (error) {
    console.error("Error al reabrir cierre", error);
    return mensaje("No se pudo reabrir el cierre académico.", "error");
  }

  await cargarTodo();
  mensaje("Cierre académico reabierto.", "success");
}

async function generarEstados() {
  const cursoId = value("cierreCurso");
  if (!cursoId) return mensaje("Seleccioná un curso.", "error");

  const alumnos = await consultaFiltrada("alumnos", { curso_id: cursoId });
  if (!alumnos.length) return mensaje("El curso seleccionado no tiene estudiantes asociados.", "error");

  const filas = alumnos.map((alumno) => ({
    alumno_id: alumno.id,
    curso_id: cursoId,
    materia_id: value("cierreMateria") || null,
    instancia: value("cierreInstancia"),
    estado_academico: "pendiente_revision",
    observacion: "Estado generado desde el cierre académico",
  }));

  const { error } = await supabaseClient
    .from("estados_academicos_alumno")
    .upsert(filas, { onConflict: "alumno_id,curso_id,materia_id,instancia" });

  if (error) {
    console.error("Error al actualizar estados", error);
    return mensaje("No se pudieron actualizar los estados académicos.", "error");
  }

  mensaje(`Se actualizaron ${filas.length} estados académicos.`, "success");
}

async function generarBoletines() {
  const cursoId = value("cierreCurso");
  const instancia = value("cierreInstancia");
  if (!cursoId) return mensaje("Seleccioná un curso.", "error");

  const alumnos = await consultaFiltrada("alumnos", { curso_id: cursoId });
  if (!alumnos.length) return mensaje("El curso seleccionado no tiene estudiantes asociados.", "error");

  const existentes = boletines.filter((boletin) =>
    String(boletin.curso_id) === cursoId && normalizar(boletin.instancia) === instancia
  );
  const idsExistentes = new Set(existentes.map((boletin) => String(boletin.alumno_id)));
  const pendientes = alumnos.filter((alumno) => !idsExistentes.has(String(alumno.id)));

  if (!pendientes.length) {
    return mensaje("Los boletines de ese curso e instancia ya fueron generados.", "info");
  }

  const filas = pendientes.map((alumno) => ({
    alumno_id: alumno.id,
    curso_id: cursoId,
    instancia,
    promedio: null,
    estado: "borrador",
    observacion: null,
    generado_por: perfilCierre?.id || null,
  }));

  const { error } = await supabaseClient.from("boletines_alumno").insert(filas);
  if (error) {
    console.error("Error al generar boletines", error);
    return mensaje("No se pudieron generar los boletines.", "error");
  }

  await cargarTodo();
  mensaje(`Se generaron ${filas.length} boletines en estado borrador.`, "success");
}

async function generarActa() {
  const cursoId = value("cierreCurso");
  const instancia = value("cierreInstancia");
  const materiaId = value("cierreMateria") || null;
  if (!cursoId) return mensaje("Seleccioná un curso.", "error");

  const duplicada = actas.some((acta) =>
    String(acta.curso_id) === cursoId
    && String(acta.materia_id || "") === String(materiaId || "")
    && normalizar(acta.instancia) === instancia
  );
  if (duplicada) return mensaje("Ya existe un acta para ese curso, materia e instancia.", "info");

  const payload = {
    curso_id: cursoId,
    materia_id: materiaId,
    instancia,
    fecha_acta: new Date().toISOString().slice(0, 10),
    estado: "generada",
    generada_por: perfilCierre?.id || null,
  };

  const { error } = await supabaseClient.from("actas_academicas").insert(payload);
  if (error) {
    console.error("Error al generar acta", error);
    return mensaje("No se pudo generar el acta académica.", "error");
  }

  await cargarTodo();
  mensaje("Acta académica generada correctamente.", "success");
}

function actualizarIndicadores() {
  text("kpiCierres", cierres.length);
  text("kpiBoletines", boletines.length);
  text("kpiActas", actas.length);
  text("kpiPendientes", cierres.filter((c) => normalizar(c.estado) !== "cerrado").length);
}

function completarSelect(id, elementos, etiqueta, opcionInicial, conservarInicial = false) {
  const select = $(id);
  if (!select) return;
  select.replaceChildren();

  const inicial = document.createElement("option");
  inicial.value = "";
  inicial.textContent = opcionInicial;
  select.appendChild(inicial);

  elementos.forEach((elemento) => {
    const opcion = document.createElement("option");
    opcion.value = elemento.id;
    opcion.textContent = etiqueta(elemento);
    select.appendChild(opcion);
  });

  if (conservarInicial) select.value = "";
}

function etiquetaCurso(curso) {
  return curso?.nombre || [curso?.anio, curso?.division].filter(Boolean).join(" ") || "Curso";
}
function etiquetaCursoPorId(id) {
  return etiquetaCurso(cursos.find((curso) => String(curso.id) === String(id)));
}
function etiquetaMateriaPorId(id) {
  const materia = materias.find((item) => String(item.id) === String(id));
  return materia?.nombre || materia?.descripcion || "Materia";
}
function etiquetaInstancia(instancia) {
  const etiquetas = {
    primer_bimestre: "Primer bimestre",
    primer_cuatrimestre: "Primer cuatrimestre",
    tercer_bimestre: "Tercer bimestre",
    segundo_cuatrimestre: "Segundo cuatrimestre",
    diciembre: "Diciembre",
    febrero: "Febrero",
    anual: "Cierre anual",
  };
  return etiquetas[instancia] || instancia || "—";
}
function etiquetaEstado(estado) {
  return ({ cerrado: "Cerrado", abierto: "Abierto", observado: "Observado" })[estado] || estado || "Sin estado";
}
function claseEstado(estado) {
  if (estado === "cerrado") return "closed";
  if (estado === "observado") return "warn";
  return "ok";
}
function formatearFecha(fecha) {
  if (!fecha) return "—";
  const date = new Date(`${fecha}T00:00:00`);
  return Number.isNaN(date.getTime()) ? fecha : date.toLocaleDateString("es-AR");
}

async function consultaSegura(tabla, columnas = "*", orden = null, ascendente = false) {
  try {
    let consulta = supabaseClient.from(tabla).select(columnas);
    if (orden) consulta = consulta.order(orden, { ascending: ascendente });
    const { data, error } = await consulta;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn(`No se pudo consultar ${tabla}`, error);
    return [];
  }
}

async function consultaFiltrada(tabla, filtros) {
  try {
    let consulta = supabaseClient.from(tabla).select("*");
    Object.entries(filtros).forEach(([campo, filtro]) => {
      if (filtro !== null && filtro !== undefined && filtro !== "") consulta = consulta.eq(campo, filtro);
    });
    const { data, error } = await consulta;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn(`No se pudo consultar ${tabla}`, error);
    return [];
  }
}

function exportarCierresPdf() {
  if (!cierres.length) return mensaje("No hay cierres para exportar.", "info");
  const filas = cierres.map((cierre) => [
    etiquetaCursoPorId(cierre.curso_id),
    cierre.materia_id ? etiquetaMateriaPorId(cierre.materia_id) : "Todas las materias",
    etiquetaInstancia(cierre.instancia),
    formatearFecha(cierre.fecha_cierre),
    etiquetaEstado(cierre.estado),
    cierre.observacion || "",
  ]);
  imprimirDocumento("Informe de cierres académicos", ["Curso", "Materia", "Instancia", "Fecha", "Estado", "Observación"], filas);
}

function exportarActaPdf() {
  const cursoId = value("cierreCurso");
  if (!cursoId) return mensaje("Seleccioná un curso para generar el acta en PDF.", "error");
  const materiaId = value("cierreMateria");
  const instancia = value("cierreInstancia");
  const filas = cierres
    .filter((cierre) => String(cierre.curso_id) === cursoId)
    .filter((cierre) => !materiaId || String(cierre.materia_id || "") === materiaId)
    .filter((cierre) => !instancia || normalizar(cierre.instancia) === instancia)
    .map((cierre) => [
      etiquetaCursoPorId(cierre.curso_id),
      cierre.materia_id ? etiquetaMateriaPorId(cierre.materia_id) : "Todas las materias",
      etiquetaInstancia(cierre.instancia),
      formatearFecha(cierre.fecha_cierre),
      etiquetaEstado(cierre.estado),
      cierre.observacion || "",
    ]);
  imprimirDocumento(
    `Acta académica — ${etiquetaCursoPorId(cursoId)}`,
    ["Curso", "Materia", "Instancia", "Fecha", "Estado", "Observación"],
    filas.length ? filas : [[etiquetaCursoPorId(cursoId), materiaId ? etiquetaMateriaPorId(materiaId) : "Todas las materias", etiquetaInstancia(instancia), new Date().toLocaleDateString("es-AR"), "Sin cierre registrado", ""]]
  );
}

function imprimirDocumento(titulo, encabezados, filas) {
  if (!window.ADA_PDF) return mensaje("El motor PDF de ADA no está disponible. Recargá la página.", "error");
  const institucion = normalizar(perfilCierre?.institucion_nombre || perfilCierre?.institucion || "ADA Cloud");
  window.ADA_PDF.download({
    title: titulo,
    subtitle: `${institucion} · Emitido el ${new Date().toLocaleString("es-AR")}`,
    institution: institucion,
    orientation: "landscape",
    filename: `ADA_${String(titulo).replace(/[^a-zA-Z0-9_-]+/g,"_")}_${new Date().toISOString().slice(0,10)}.pdf`,
    sections: [{ table: { headers: encabezados, rows: filas, options:{fontSize:7} } }],
    note: "Documento académico generado por ADA Cloud."
  });
}
