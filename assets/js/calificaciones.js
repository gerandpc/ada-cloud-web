"use strict";

let perfilCalif = null;
let alumnosAll = [];
let cursos = [];
let materias = [];
let planillasSecretaria = [];
let alumnos = [];
let libres = [];
let notas = {};
let mesas = {};

const PERIODOS = {
  primer_bimestre: { titulo: "Primer bimestre", cierre: "Bimestre" },
  primer_cuatrimestre: { titulo: "Primer cuatrimestre", cierre: "Primer cuatrimestre" },
  tercer_bimestre: { titulo: "Tercer bimestre", cierre: "Tercer bimestre" },
  segundo_cuatrimestre: { titulo: "Segundo cuatrimestre", cierre: "Segundo cuatrimestre" },
};

const columnas = Object.fromEntries(
  Object.keys(PERIODOS).map((periodo) => [periodo, crearColumnas(periodo)])
);

function crearColumnas(periodo) {
  return Array.from({ length: 6 }, (_, i) => ({
    id: `n${i + 1}`,
    nombre: `Nota ${i + 1}`,
    periodo,
  }));
}

document.addEventListener("DOMContentLoaded", iniciarCalificaciones);

async function iniciarCalificaciones() {
  try {
    perfilCalif = await obtenerSesionPerfil();
    if (!perfilCalif) return;

    configurarPestanas();
    configurarEventos();
    await cargarCatalogos();
    mensaje("Seleccioná un curso y una materia para cargar la planilla.", "info");
  } catch (error) {
    console.error(error);
    mensaje("No fue posible iniciar el módulo de calificaciones.", "error");
  }
}

function configurarEventos() {
  asignarClick("btnCargarPlanilla", cargarPlanilla);
  asignarClick("btnExportarExcel", exportarExcel);
  asignarClick("btnCompletarFormal", completarFormal);
  asignarClick("btnEnviarSecretaria", enviarSecretaria);

  document.querySelectorAll("[data-add-col]").forEach((boton) => {
    boton.addEventListener("click", () => {
      const periodo = boton.dataset.addCol;
      if (!columnas[periodo]) return;
      if (columnas[periodo].length >= 12) {
        mensaje("Cada período admite hasta 12 calificaciones.", "error");
        return;
      }
      columnas[periodo].push({
        id: `n${columnas[periodo].length + 1}`,
        nombre: `Nota ${columnas[periodo].length + 1}`,
        periodo,
      });
      renderizarTodo();
    });
  });

  document.querySelectorAll("[data-save-period]").forEach((boton) => {
    boton.addEventListener("click", guardarPlanilla);
  });

  document.getElementById("planillaFormalSelect")?.addEventListener("change", renderizarFormal);
}

function configurarPestanas() {
  document.querySelectorAll(".calif-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".calif-tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".calif-panel").forEach((panel) => panel.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab)?.classList.add("active");
    });
  });
}

async function cargarCatalogos() {
  [cursos, materias, alumnosAll, planillasSecretaria] = await Promise.all([
    consultaSegura("cursos"),
    consultaSegura("materias"),
    consultaSegura("alumnos"),
    consultaSegura("planillas_secretaria"),
  ]);

  completarSelect("cursoSelect", cursos, (item) => nombreCurso(item));
  completarSelect("materiaSelect", materias, (item) => item.nombre || item.descripcion || "Materia");
  completarSelect(
    "planillaFormalSelect",
    planillasSecretaria.filter((item) => ["habilitada", "en_carga", "observada"].includes(item.estado)),
    (item) => `${item.formato_planilla || "Planilla"} · ${formatearCatalogo(cursos, item.curso_id)} · ${formatearCatalogo(materias, item.materia_id)}`
  );

  const docente = document.getElementById("docenteNombre");
  if (docente) docente.value = perfilCalif.nombre || perfilCalif.email || "Docente";
}

async function cargarPlanilla() {
  const cursoId = valor("cursoSelect");
  const materiaId = valor("materiaSelect");

  if (!cursoId || !materiaId) {
    mensaje("Seleccioná un curso y una materia.", "error");
    return;
  }

  alumnos = alumnosAll.filter((alumno) => String(alumno.curso_id || "") === String(cursoId));
  notas = {};
  mesas = {};

  if (!alumnos.length) {
    renderizarTodo();
    mensaje("No hay estudiantes asignados al curso seleccionado.", "info");
    return;
  }

  [libres, registros] = await Promise.all([
    consultaFiltrada("alumnos_libres_materia", { curso_id: cursoId, materia_id: materiaId, estado: "activo" }),
    consultaFiltrada("planilla_docente_notas", { curso_id: cursoId, materia_id: materiaId }),
  ]);

  registros.forEach((registro) => {
    const clave = `${registro.alumno_id}_${registro.periodo}_${registro.columna_key}`;
    notas[clave] = registro.valor;
  });

  cargarMesasDesdeNotas();
  renderizarTodo();
  mensaje(`Planilla cargada: ${alumnos.length} estudiantes.`, "success");
}

function cargarMesasDesdeNotas() {
  ["diciembre", "febrero"].forEach((instancia) => {
    alumnos.forEach((alumno) => {
      ["nota", "fecha", "obs"].forEach((campo) => {
        const claveNota = `${alumno.id}_${instancia}_${campo}`;
        mesas[claveNota] = notas[claveNota] || "";
      });
    });
  });
}

function renderizarTodo() {
  renderizarPeriodo("tablaPrimer", ["primer_bimestre", "primer_cuatrimestre"]);
  renderizarPeriodo("tablaSegundo", ["tercer_bimestre", "segundo_cuatrimestre"]);
  renderizarLibres();
  renderizarMesa("tablaDiciembre", "diciembre", alumnosDiciembre());
  renderizarMesa("tablaFebrero", "febrero", alumnosFebrero());
  renderizarFormal();
}

function renderizarPeriodo(contenedorId, periodos) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  if (!alumnos.length) {
    contenedor.innerHTML = '<div class="empty-state">No hay estudiantes para mostrar.</div>';
    return;
  }

  const cabeceraGrupos = periodos
    .map((periodo) => `<th class="group" colspan="${columnas[periodo].length + 2}">${escapar(PERIODOS[periodo].titulo)}</th>`)
    .join("");

  const cabeceraColumnas = periodos
    .map((periodo) => {
      const notasCabecera = columnas[periodo]
        .map((columna) => `<th>${escapar(columna.nombre)}<br><input type="checkbox" aria-label="Seleccionar ${escapar(columna.nombre)}" data-select-col="${periodo}_${columna.id}"></th>`)
        .join("");
      return `${notasCabecera}<th>Promedio</th><th>${escapar(PERIODOS[periodo].cierre)}</th>`;
    })
    .join("");

  const filas = alumnos
    .map((alumno) => {
      const celdas = periodos
        .map((periodo) => {
          const camposNotas = columnas[periodo]
            .map((columna) => {
              const clave = `${alumno.id}_${periodo}_${columna.id}`;
              return `<td><input type="number" min="1" max="10" step="0.01" inputmode="decimal" data-nota="${clave}" data-promedio-grupo="${alumno.id}_${periodo}" value="${escapar(notas[clave] || "")}"></td>`;
            })
            .join("");
          const claveCierre = `${alumno.id}_${periodo}_cierre`;
          return `${camposNotas}<td><output class="grade-average" data-promedio="${alumno.id}_${periodo}">${formatearNota(calcularPromedioAlumno(alumno.id, periodo))}</output></td><td><input type="number" min="1" max="10" step="0.01" inputmode="decimal" data-nota="${claveCierre}" value="${escapar(notas[claveCierre] || "")}"></td>`;
        })
        .join("");
      return `<tr><td>${escapar(nombreAlumno(alumno))}</td>${celdas}</tr>`;
    })
    .join("");

  contenedor.innerHTML = `<table class="grade-table"><thead><tr><th rowspan="2">Estudiante</th>${cabeceraGrupos}</tr><tr>${cabeceraColumnas}</tr></thead><tbody>${filas}</tbody></table>`;

  contenedor.querySelectorAll("[data-nota]").forEach((input) => {
    input.addEventListener("input", () => {
      normalizarNotaInput(input);
      notas[input.dataset.nota] = input.value;
      const grupo = input.dataset.promedioGrupo;
      if (grupo) actualizarPromedio(grupo);
    });
  });
}

function actualizarPromedio(grupo) {
  const [alumnoId, ...partes] = grupo.split("_");
  const periodo = partes.join("_");
  const output = document.querySelector(`[data-promedio="${cssEscape(grupo)}"]`);
  if (output) output.textContent = formatearNota(calcularPromedioAlumno(alumnoId, periodo));
}

function calcularPromedioAlumno(alumnoId, periodo) {
  const valores = columnas[periodo]
    .map((columna) => Number(notas[`${alumnoId}_${periodo}_${columna.id}`]))
    .filter((numero) => Number.isFinite(numero) && numero >= 1 && numero <= 10);
  if (!valores.length) return null;
  return valores.reduce((suma, valorNota) => suma + valorNota, 0) / valores.length;
}

function renderizarLibres() {
  const contenedor = document.getElementById("listaLibres");
  if (!contenedor) return;

  if (!libres.length) {
    contenedor.innerHTML = '<div class="libre-card">No hay estudiantes libres en esta materia.</div>';
    return;
  }

  contenedor.innerHTML = libres
    .map((registro) => {
      const alumno = alumnosAll.find((item) => String(item.id) === String(registro.alumno_id));
      return `<article class="libre-card"><h3>${escapar(alumno ? nombreAlumno(alumno) : "Estudiante")}</h3><p>${escapar(registro.motivo || "Sin observaciones")}</p><span class="status-pill warn">Libre</span></article>`;
    })
    .join("");
}

function alumnosDiciembre() {
  const idsLibres = new Set(libres.map((registro) => String(registro.alumno_id)));
  return alumnos.filter((alumno) => {
    if (idsLibres.has(String(alumno.id))) return true;
    const cierres = ["primer_cuatrimestre", "segundo_cuatrimestre"]
      .map((periodo) => Number(notas[`${alumno.id}_${periodo}_cierre`]))
      .filter(Number.isFinite);
    return cierres.length > 0 && cierres.some((nota) => nota < 6);
  });
}

function alumnosFebrero() {
  return alumnosDiciembre().filter((alumno) => {
    const notaDiciembre = Number(mesas[`${alumno.id}_diciembre_nota`] || notas[`${alumno.id}_diciembre_nota`]);
    return !Number.isFinite(notaDiciembre) || notaDiciembre < 6;
  });
}

function renderizarMesa(contenedorId, instancia, lista) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  const filas = lista.length
    ? lista
        .map((alumno) => {
          const nota = mesas[`${alumno.id}_${instancia}_nota`] || "";
          const fecha = mesas[`${alumno.id}_${instancia}_fecha`] || "";
          const observacion = mesas[`${alumno.id}_${instancia}_obs`] || "";
          return `<tr><td>${escapar(nombreAlumno(alumno))}</td><td><span class="status-pill warn">Pendiente</span></td><td><input type="number" min="1" max="10" step="0.01" data-mesa="${instancia}_${alumno.id}_nota" value="${escapar(nota)}"></td><td><input type="date" data-mesa="${instancia}_${alumno.id}_fecha" value="${escapar(fecha)}"></td><td><input class="wide-input" data-mesa="${instancia}_${alumno.id}_obs" value="${escapar(observacion)}"></td></tr>`;
        })
        .join("")
    : '<tr><td colspan="5">No hay estudiantes para esta instancia.</td></tr>';

  contenedor.innerHTML = `<table class="grade-table"><thead><tr><th>Estudiante</th><th>Condición</th><th>Nota</th><th>Fecha</th><th>Observación</th></tr></thead><tbody>${filas}</tbody></table>`;

  contenedor.querySelectorAll("[data-mesa]").forEach((input) => {
    input.addEventListener("input", () => {
      const [, alumnoId, campo] = input.dataset.mesa.split("_");
      if (campo === "nota") normalizarNotaInput(input);
      mesas[`${alumnoId}_${instancia}_${campo}`] = input.value;
      if (instancia === "diciembre") renderizarMesa("tablaFebrero", "febrero", alumnosFebrero());
    });
  });
}

function renderizarFormal() {
  const cabecera = document.getElementById("cabeceraFormalDocente");
  const tabla = document.getElementById("tablaFormalDocente");
  if (!cabecera || !tabla) return;

  const planilla = planillasSecretaria.find((item) => String(item.id) === String(valor("planillaFormalSelect")));
  if (!planilla) {
    cabecera.innerHTML = "<p>No hay una planilla formal seleccionada.</p>";
    tabla.innerHTML = "";
    return;
  }

  cabecera.innerHTML = `<div class="header-grid">
    ${campoSoloLectura("Curso", formatearCatalogo(cursos, planilla.curso_id))}
    ${campoSoloLectura("Materia", formatearCatalogo(materias, planilla.materia_id))}
    ${campoSoloLectura("Docente", document.getElementById("docenteNombre")?.value || "-")}
    ${campoSoloLectura("Estado", planilla.estado || "-")}
    ${campoSoloLectura("Fecha desde", planilla.fecha_desde || "-")}
    ${campoSoloLectura("Fecha hasta", planilla.fecha_hasta || "-")}
    ${campoSoloLectura("Formato", planilla.formato_planilla || "-")}
  </div>`;

  const columnasFormales = ["N1", "N2", "N3", "N4", "Bim.", "N1", "N2", "N3", "N4", "1° Cuat.", "N1", "N2", "N3", "N4", "3° Bim.", "N1", "N2", "N3", "N4", "2° Cuat.", "Dic. nota", "Dic. fecha", "Feb. nota", "Feb. fecha"];
  const filas = alumnos
    .map((alumno) => `<tr><td>${escapar(nombreAlumno(alumno))}</td>${columnasFormales.map((columna, indice) => `<td><input ${columna.includes("fecha") ? 'type="date"' : 'type="number" min="1" max="10" step="0.01"'} data-formal="${alumno.id}_${indice}"></td>`).join("")}</tr>`)
    .join("");

  tabla.innerHTML = `<table class="grade-table"><thead><tr><th>Estudiante</th>${columnasFormales.map((columna) => `<th>${escapar(columna)}</th>`).join("")}</tr></thead><tbody>${filas}</tbody></table>`;
}

function completarFormal() {
  const seleccionadas = [...document.querySelectorAll("[data-select-col]:checked")];
  if (!seleccionadas.length) {
    mensaje("Seleccioná al menos una columna de calificaciones.", "error");
    return;
  }

  alumnos.forEach((alumno) => {
    seleccionadas.slice(0, 20).forEach((seleccion, indice) => {
      const separador = seleccion.dataset.selectCol.lastIndexOf("_");
      const periodo = seleccion.dataset.selectCol.slice(0, separador);
      const columna = seleccion.dataset.selectCol.slice(separador + 1);
      const origen = document.querySelector(`[data-nota="${cssEscape(`${alumno.id}_${periodo}_${columna}`)}"]`);
      const destino = document.querySelector(`[data-formal="${cssEscape(`${alumno.id}_${indice}`)}"]`);
      if (origen && destino) destino.value = origen.value;
    });
  });

  mensaje("La planilla formal fue completada con las columnas seleccionadas.", "success");
}

async function guardarPlanilla() {
  const cursoId = valor("cursoSelect");
  const materiaId = valor("materiaSelect");
  if (!cursoId || !materiaId || !alumnos.length) {
    mensaje("Primero cargá una planilla válida.", "error");
    return;
  }

  document.querySelectorAll("[data-nota]").forEach((input) => {
    notas[input.dataset.nota] = input.value;
  });

  document.querySelectorAll("[data-mesa]").forEach((input) => {
    const [instancia, alumnoId, campo] = input.dataset.mesa.split("_");
    notas[`${alumnoId}_${instancia}_${campo}`] = input.value;
  });

  const filas = Object.entries(notas)
    .filter(([, valorNota]) => valorNota !== "" && valorNota !== null && valorNota !== undefined)
    .map(([clave, valorNota]) => {
      const partes = clave.split("_");
      const alumnoId = partes.shift();
      const columna = partes.pop();
      const periodo = partes.join("_");
      return {
        curso_id: cursoId,
        materia_id: materiaId,
        docente_id: perfilCalif.id,
        alumno_id: alumnoId,
        periodo,
        columna_key: columna,
        valor: String(valorNota),
      };
    });

  if (!filas.length) {
    mensaje("No hay calificaciones para guardar.", "info");
    return;
  }

  const { error } = await supabaseClient
    .from("planilla_docente_notas")
    .upsert(filas, { onConflict: "curso_id,materia_id,alumno_id,periodo,columna_key" });

  if (error) {
    console.error(error);
    mensaje("No fue posible guardar la planilla.", "error");
    return;
  }

  mensaje("Calificaciones guardadas correctamente.", "success");
}

async function enviarSecretaria() {
  const planillaId = valor("planillaFormalSelect");
  if (!planillaId) {
    mensaje("Seleccioná una planilla formal habilitada.", "error");
    return;
  }
  if (!alumnos.length) {
    mensaje("No hay estudiantes cargados para enviar.", "error");
    return;
  }

  const filas = alumnos.map((alumno) => {
    const datos = {};
    document.querySelectorAll(`[data-formal^="${cssEscape(`${alumno.id}_`)}"]`).forEach((input) => {
      datos[input.dataset.formal.replace(`${alumno.id}_`, "")] = input.value || null;
    });
    return { planilla_id: planillaId, alumno_id: alumno.id, datos, estado: "enviada" };
  });

  const { error } = await supabaseClient
    .from("planilla_secretaria_detalle")
    .upsert(filas, { onConflict: "planilla_id,alumno_id" });

  if (error) {
    console.error(error);
    mensaje("No fue posible enviar la planilla a Secretaría.", "error");
    return;
  }

  const { error: errorEstado } = await supabaseClient
    .from("planillas_secretaria")
    .update({ estado: "enviada" })
    .eq("id", planillaId);

  if (errorEstado) {
    console.error(errorEstado);
    mensaje("Las notas fueron enviadas, pero no se pudo actualizar el estado de la planilla.", "error");
    return;
  }

  mensaje("Planilla enviada a Secretaría correctamente.", "success");
}

function exportarExcel() {
  const tabla = document.querySelector(".calif-panel.active table");
  if (!tabla) {
    mensaje("No hay una planilla disponible para exportar.", "error");
    return;
  }

  const copia = tabla.cloneNode(true);
  copia.querySelectorAll("input").forEach((input) => {
    const texto = document.createTextNode(input.value || "");
    input.replaceWith(texto);
  });
  copia.querySelectorAll("output").forEach((output) => {
    output.replaceWith(document.createTextNode(output.textContent || ""));
  });

  const contenido = `<!doctype html><html><head><meta charset="utf-8"></head><body>${copia.outerHTML}</body></html>`;
  const blob = new Blob([contenido], { type: "application/vnd.ms-excel;charset=utf-8" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = `calificaciones_${sanitizarNombreArchivo(nombreCurso(cursos.find((item) => String(item.id) === String(valor("cursoSelect"))) || {}))}.xls`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

async function consultaSegura(tabla) {
  try {
    const { data, error } = await supabaseClient.from(tabla).select("*");
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn(`No se pudo consultar ${tabla}:`, error.message);
    return [];
  }
}

async function consultaFiltrada(tabla, filtros) {
  try {
    let consulta = supabaseClient.from(tabla).select("*");
    Object.entries(filtros).forEach(([campo, filtro]) => {
      if (filtro !== "" && filtro !== null && filtro !== undefined) consulta = consulta.eq(campo, filtro);
    });
    const { data, error } = await consulta;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn(`No se pudo consultar ${tabla}:`, error.message);
    return [];
  }
}

function completarSelect(id, elementos, etiqueta) {
  const select = document.getElementById(id);
  if (!select) return;
  select.replaceChildren(new Option("Seleccionar...", ""));
  elementos.forEach((item) => select.add(new Option(etiqueta(item), item.id)));
}

function normalizarNotaInput(input) {
  if (input.value === "") return;
  const numero = Number(input.value);
  if (!Number.isFinite(numero)) {
    input.value = "";
    return;
  }
  if (numero < 1) input.value = "1";
  if (numero > 10) input.value = "10";
}

function nombreAlumno(alumno) {
  return `${alumno.apellido || ""}, ${alumno.nombre || ""}`.replace(/^,\s*/, "").trim() || "Estudiante";
}

function nombreCurso(curso) {
  return curso.nombre || `${curso.anio || ""} ${curso.division || ""}`.trim() || "Curso";
}

function formatearCatalogo(catalogo, id) {
  const item = catalogo.find((registro) => String(registro.id) === String(id));
  if (!item) return "-";
  return item.nombre || `${item.anio || ""} ${item.division || ""}`.trim() || "-";
}

function campoSoloLectura(etiqueta, contenido) {
  return `<label>${escapar(etiqueta)}<input readonly value="${escapar(contenido)}"></label>`;
}

function valor(id) {
  return document.getElementById(id)?.value || "";
}

function asignarClick(id, funcion) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.addEventListener("click", funcion);
}

function mensaje(texto, tipo = "info") {
  const elemento = document.getElementById("mensajeCalificaciones");
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.className = `form-message ${tipo}`;
}

function formatearNota(valorNota) {
  return Number.isFinite(valorNota) ? valorNota.toFixed(2).replace(".00", "") : "-";
}

function escapar(valorTexto) {
  return String(valorTexto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cssEscape(valorTexto) {
  return window.CSS?.escape ? CSS.escape(String(valorTexto)) : String(valorTexto).replace(/(["\\])/g, "\\$1");
}

function sanitizarNombreArchivo(valorTexto) {
  return String(valorTexto || "ADA").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "_");
}
