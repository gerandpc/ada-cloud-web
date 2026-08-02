const qs = (id) => document.getElementById(id);
let perfilActual = null;
let rolActual = "";
let cursos = [];
let materias = [];
let alumnos = [];
let estados = [];
let alumnosCursoActual = [];
let asistenciaClaseActualId = null;
let cursosPermitidos = new Set();
let materiasPermitidas = new Set();
let historialActual = [];
let alertasActuales = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizarRol(value) {
  return String(value || "").trim().toLowerCase();
}

function option(items, placeholder = "Seleccionar", labelFn = (x) => x.nombre) {
  return `<option value="">${escapeHtml(placeholder)}</option>` + items.map((item) =>
    `<option value="${escapeHtml(item.id)}">${escapeHtml(labelFn(item))}</option>`
  ).join("");
}

function mostrarMensaje(id, texto, tipo = "info") {
  const el = qs(id);
  if (!el) return;
  el.textContent = texto;
  el.className = `form-message ${tipo}`;
}

function configurarTabs() {
  document.querySelectorAll(".attendance-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".attendance-tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".attendance-section").forEach((s) => s.classList.remove("active"));
      btn.classList.add("active");
      qs(`tab-${btn.dataset.tab}`)?.classList.add("active");
    });
  });
}

async function obtenerAsignaciones() {
  cursosPermitidos = new Set();
  materiasPermitidas = new Set();

  if (["admin", "directivo", "secretaria"].includes(rolActual)) return;

  if (rolActual === "docente") {
    const { data, error } = await supabaseClient
      .from("v_docente_mis_materias")
      .select("*")
      .eq("docente_id", perfilActual.id);
    if (error) {
      console.warn("No se pudieron cargar las asignaciones docentes:", error.message);
      return;
    }
    (data || []).forEach((row) => {
      if (row.curso_id) cursosPermitidos.add(String(row.curso_id));
      if (row.materia_id) materiasPermitidas.add(String(row.materia_id));
    });
  }

  if (rolActual === "preceptor") {
    const { data, error } = await supabaseClient
      .from("v_preceptor_cursos_resumen")
      .select("*");
    if (error) {
      console.warn("No se pudieron cargar los cursos de preceptoría:", error.message);
      return;
    }
    (data || []).forEach((row) => {
      if (row.curso_id) cursosPermitidos.add(String(row.curso_id));
      if (row.id) cursosPermitidos.add(String(row.id));
    });
  }
}

function aplicarPermisosCatalogos() {
  if (cursosPermitidos.size) {
    cursos = cursos.filter((c) => cursosPermitidos.has(String(c.id)));
  }
  if (rolActual === "docente" && materiasPermitidas.size) {
    materias = materias.filter((m) => materiasPermitidas.has(String(m.id)));
  }
  if (cursosPermitidos.size) {
    materias = materias.filter((m) => !m.curso_id || cursosPermitidos.has(String(m.curso_id)));
  }
}

async function cargarBase() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;
  perfilActual = contexto.perfil;
  rolActual = normalizarRol(perfilActual.rol);

  qs("asistenciaFecha").value = new Date().toISOString().slice(0, 10);
  qs("rolAsistencia").textContent = `Perfil activo: ${perfilActual.nombre || perfilActual.email || "Usuario"} · ${rolActual}`;

  await obtenerAsignaciones();

  const [cursosRes, materiasRes, alumnosRes, estadosRes] = await Promise.all([
    supabaseClient.from("cursos").select("id,nombre").order("nombre"),
    supabaseClient.from("materias").select("id,nombre,curso_id,cursos(nombre)").order("nombre"),
    supabaseClient.from("profiles").select("id,nombre,apellido,email,rol").eq("rol", "alumno").order("apellido"),
    supabaseClient.from("asistencia_estados").select("*").eq("activo", true).order("nombre")
  ]);

  for (const res of [cursosRes, materiasRes, alumnosRes, estadosRes]) {
    if (res.error) {
      mostrarMensaje("msgCargaAlumnos", `Error al cargar asistencia: ${res.error.message}`, "error");
      console.error(res.error);
      return;
    }
  }

  cursos = cursosRes.data || [];
  materias = materiasRes.data || [];
  alumnos = alumnosRes.data || [];
  estados = estadosRes.data || [];
  aplicarPermisosCatalogos();
  llenarSelects();
  actualizarResumen();
  await cargarSeguimientos();
}

function llenarSelects() {
  const cursoOptions = option(cursos, "Seleccionar curso");
  ["asistenciaCurso", "historialCurso", "seguimientoCurso"].forEach((id) => {
    if (qs(id)) qs(id).innerHTML = cursoOptions;
  });

  const alumnoOptions = option(alumnos, "Seleccionar alumno", (a) => `${a.apellido || ""}, ${a.nombre || ""}`);
  ["historialAlumno", "seguimientoAlumno"].forEach((id) => {
    if (qs(id)) qs(id).innerHTML = alumnoOptions;
  });

  qs("asistenciaMateria").innerHTML = option(
    materias,
    "Sin materia / jornada",
    (m) => `${m.nombre} - ${m.cursos?.nombre || ""}`
  );
}

function actualizarResumen() {
  qs("statCursosAsistencia").textContent = cursos.length;
  qs("statMateriasAsistencia").textContent = materias.length;
  qs("statAlumnosAsistencia").textContent = alumnos.length;
}

function materiasDelCurso(cursoId) {
  return materias.filter((m) => !m.curso_id || String(m.curso_id) === String(cursoId));
}

function actualizarMateriasCurso() {
  const cursoId = qs("asistenciaCurso").value;
  const lista = cursoId ? materiasDelCurso(cursoId) : materias;
  qs("asistenciaMateria").innerHTML = option(
    lista,
    "Sin materia / jornada",
    (m) => `${m.nombre}${m.cursos?.nombre ? ` - ${m.cursos.nombre}` : ""}`
  );
}

async function cargarAlumnosCurso() {
  const cursoId = qs("asistenciaCurso").value;
  const fecha = qs("asistenciaFecha").value;
  if (!cursoId || !fecha) {
    mostrarMensaje("msgCargaAlumnos", "Seleccioná curso y fecha.", "error");
    return;
  }
  if (cursosPermitidos.size && !cursosPermitidos.has(String(cursoId))) {
    mostrarMensaje("msgCargaAlumnos", "No tenés permiso para registrar asistencia en este curso.", "error");
    return;
  }

  mostrarMensaje("msgCargaAlumnos", "Cargando alumnos...", "info");
  const { data, error } = await supabaseClient
    .from("alumno_cursos")
    .select("alumno_id, profiles(id,nombre,apellido,email)")
    .eq("curso_id", cursoId)
    .eq("activo", true)
    .order("creado_en");

  if (error) {
    mostrarMensaje("msgCargaAlumnos", `Error: ${error.message}`, "error");
    console.error(error);
    return;
  }

  alumnosCursoActual = (data || []).map((r) => r.profiles).filter(Boolean);
  if (!alumnosCursoActual.length) {
    qs("listaAlumnosAsistencia").innerHTML = "<p class='helper-text attendance-empty'>No hay alumnos asignados a este curso.</p>";
    mostrarMensaje("msgCargaAlumnos", "Sin alumnos asignados.", "info");
    return;
  }

  renderAlumnosAsistencia();
  mostrarMensaje("msgCargaAlumnos", `${alumnosCursoActual.length} alumno/s cargados.`, "success");
}

function renderAlumnosAsistencia() {
  qs("listaAlumnosAsistencia").innerHTML = alumnosCursoActual.map((alumno) => `
    <div class="student-attendance-row" data-alumno-id="${escapeHtml(alumno.id)}">
      <strong>${escapeHtml(alumno.apellido || "")}, ${escapeHtml(alumno.nombre || "")}</strong>
      <select class="estado-asistencia" data-alumno-id="${escapeHtml(alumno.id)}" required>
        ${estados.map((estado) => `
          <option value="${escapeHtml(estado.id)}" data-codigo="${escapeHtml(estado.codigo)}" ${estado.codigo === "presente" ? "selected" : ""}>
            ${escapeHtml(estado.nombre)}
          </option>`).join("")}
      </select>
      <input type="text" class="observacion-asistencia" data-alumno-id="${escapeHtml(alumno.id)}" maxlength="300" placeholder="Observación">
    </div>`).join("");
}

function marcarTodos(codigo) {
  document.querySelectorAll(".estado-asistencia").forEach((select) => {
    const opcion = [...select.options].find((o) => o.dataset.codigo === codigo);
    if (opcion) select.value = opcion.value;
  });
}

async function guardarAsistencia(event) {
  event.preventDefault();
  const cursoId = qs("asistenciaCurso").value;
  const materiaId = qs("asistenciaMateria").value || null;
  const fecha = qs("asistenciaFecha").value;
  const observacionGeneral = qs("asistenciaObservacionGeneral").value.trim();

  if (!cursoId || !fecha || !alumnosCursoActual.length) {
    mostrarMensaje("msgGuardarAsistencia", "Seleccioná curso, fecha y cargá alumnos.", "error");
    return;
  }
  if (cursosPermitidos.size && !cursosPermitidos.has(String(cursoId))) {
    mostrarMensaje("msgGuardarAsistencia", "No tenés permiso para modificar este curso.", "error");
    return;
  }
  if (rolActual === "docente" && materiaId && materiasPermitidas.size && !materiasPermitidas.has(String(materiaId))) {
    mostrarMensaje("msgGuardarAsistencia", "La materia seleccionada no está asignada a tu perfil.", "error");
    return;
  }

  mostrarMensaje("msgGuardarAsistencia", "Guardando asistencia...", "info");
  const { data: clase, error: claseError } = await supabaseClient
    .from("asistencia_clases")
    .upsert({
      curso_id: cursoId,
      materia_id: materiaId,
      fecha,
      responsable_id: perfilActual.id,
      observacion_general: observacionGeneral
    }, { onConflict: "curso_id,materia_id,fecha" })
    .select()
    .single();

  if (claseError) {
    mostrarMensaje("msgGuardarAsistencia", `Error al crear la clase: ${claseError.message}`, "error");
    console.error(claseError);
    return;
  }

  asistenciaClaseActualId = clase.id;
  const registros = alumnosCursoActual.map((alumno) => ({
    asistencia_clase_id: asistenciaClaseActualId,
    alumno_id: alumno.id,
    estado_id: document.querySelector(`.estado-asistencia[data-alumno-id="${CSS.escape(String(alumno.id))}"]`).value,
    observacion: document.querySelector(`.observacion-asistencia[data-alumno-id="${CSS.escape(String(alumno.id))}"]`).value.trim(),
    creado_por: perfilActual.id,
    actualizado_en: new Date().toISOString()
  }));

  const { error: regError } = await supabaseClient
    .from("asistencia_registros")
    .upsert(registros, { onConflict: "asistencia_clase_id,alumno_id" });

  if (regError) {
    mostrarMensaje("msgGuardarAsistencia", `Error al guardar registros: ${regError.message}`, "error");
    console.error(regError);
    return;
  }

  mostrarMensaje("msgGuardarAsistencia", "Asistencia guardada correctamente.", "success");
}

function estadoPill(codigo, nombre) {
  return `<span class="estado-pill estado-${escapeHtml(codigo || "presente")}">${escapeHtml(nombre || "-")}</span>`;
}

async function buscarHistorial() {
  qs("tablaHistorial").innerHTML = "<p class='helper-text'>Buscando registros...</p>";
  let query = supabaseClient
    .from("asistencia_registros")
    .select("*, profiles(nombre,apellido), asistencia_estados(nombre,codigo,computa_inasistencia), asistencia_clases(fecha, cursos(id,nombre), materias(id,nombre))")
    .order("creado_en", { ascending: false })
    .limit(2000);

  const alumnoId = qs("historialAlumno").value;
  if (alumnoId) query = query.eq("alumno_id", alumnoId);

  const { data, error } = await query;
  if (error) {
    qs("tablaHistorial").innerHTML = "<p class='form-message error'>No se pudo cargar el historial de asistencia.</p>";
    console.error(error);
    historialActual = [];
    actualizarResumenHistorial([]);
    return;
  }

  let rows = data || [];
  const cursoId = qs("historialCurso").value;
  const desde = qs("historialDesde").value;
  const hasta = qs("historialHasta").value;

  if (cursosPermitidos.size) {
    rows = rows.filter((r) => cursosPermitidos.has(String(r.asistencia_clases?.cursos?.id || "")));
  }
  if (cursoId) rows = rows.filter((r) => String(r.asistencia_clases?.cursos?.id || "") === String(cursoId));
  if (desde) rows = rows.filter((r) => r.asistencia_clases?.fecha >= desde);
  if (hasta) rows = rows.filter((r) => r.asistencia_clases?.fecha <= hasta);

  historialActual = rows;
  actualizarResumenHistorial(rows);

  if (!rows.length) {
    qs("tablaHistorial").innerHTML = "<p class='helper-text'>No hay registros para los filtros seleccionados.</p>";
    return;
  }

  qs("tablaHistorial").innerHTML = `<table class="ada-table"><thead><tr><th>Fecha</th><th>Alumno</th><th>Curso</th><th>Materia</th><th>Estado</th><th>Observación</th></tr></thead><tbody>${rows.map((r) => `
    <tr>
      <td>${escapeHtml(r.asistencia_clases?.fecha || "-")}</td>
      <td>${escapeHtml(r.profiles?.apellido || "")}, ${escapeHtml(r.profiles?.nombre || "")}</td>
      <td>${escapeHtml(r.asistencia_clases?.cursos?.nombre || "-")}</td>
      <td>${escapeHtml(r.asistencia_clases?.materias?.nombre || "-")}</td>
      <td>${estadoPill(r.asistencia_estados?.codigo, r.asistencia_estados?.nombre)}</td>
      <td>${escapeHtml(r.observacion || "-")}</td>
    </tr>`).join("")}</tbody></table>`;
}

function calcularMetricasAsistencia(rows) {
  const total = rows.length;
  const ausencias = rows.filter((r) => r.asistencia_estados?.computa_inasistencia).length;
  const presentes = Math.max(total - ausencias, 0);
  const porcentaje = total ? Math.round((presentes / total) * 1000) / 10 : 0;
  return { total, ausencias, presentes, porcentaje };
}

function actualizarResumenHistorial(rows) {
  const metricas = calcularMetricasAsistencia(rows);
  if (qs("historialTotal")) qs("historialTotal").textContent = metricas.total;
  if (qs("historialPresentes")) qs("historialPresentes").textContent = metricas.presentes;
  if (qs("historialAusencias")) qs("historialAusencias").textContent = metricas.ausencias;
  if (qs("historialPorcentaje")) qs("historialPorcentaje").textContent = `${metricas.porcentaje}%`;
}

function exportarHistorialAsistencia() {
  if (!historialActual.length) {
    alert("Primero buscá un historial para exportar.");
    return;
  }
  const metricas = calcularMetricasAsistencia(historialActual);
  const filtros = [
    qs("historialCurso")?.selectedOptions?.[0]?.textContent,
    qs("historialAlumno")?.selectedOptions?.[0]?.textContent,
    qs("historialDesde")?.value ? `Desde ${qs("historialDesde").value}` : "",
    qs("historialHasta")?.value ? `Hasta ${qs("historialHasta").value}` : ""
  ].filter((v) => v && !v.toLowerCase().includes("seleccionar")).join(" · ");
  const resumen = `<section><h2>Resumen</h2><table><tr><th>Registros</th><th>Presentes</th><th>Ausencias</th><th>Asistencia</th></tr><tr><td>${metricas.total}</td><td>${metricas.presentes}</td><td>${metricas.ausencias}</td><td>${metricas.porcentaje}%</td></tr></table>${filtros ? `<p>${escapeHtml(filtros)}</p>` : ""}</section>`;
  const tabla = qs("tablaHistorial")?.innerHTML || "";
  window.ADAExport?.openDocument("Informe de asistencia", resumen + tabla);
}

async function guardarSeguimiento(event) {
  event.preventDefault();
  const alumnoId = qs("seguimientoAlumno").value;
  const cursoId = qs("seguimientoCurso").value || null;
  if (!alumnoId) {
    mostrarMensaje("msgSeguimiento", "Seleccioná un alumno.", "error");
    return;
  }
  if (cursoId && cursosPermitidos.size && !cursosPermitidos.has(String(cursoId))) {
    mostrarMensaje("msgSeguimiento", "No tenés permiso para registrar seguimientos en ese curso.", "error");
    return;
  }

  mostrarMensaje("msgSeguimiento", "Guardando seguimiento...", "info");
  const { error } = await supabaseClient.from("seguimiento_alumnos").insert({
    alumno_id: alumnoId,
    curso_id: cursoId,
    tipo: qs("seguimientoTipo").value,
    prioridad: qs("seguimientoPrioridad").value,
    descripcion: qs("seguimientoDescripcion").value.trim(),
    visible_familia: qs("seguimientoVisibleFamilia").checked,
    creado_por: perfilActual.id,
    activo: true
  });

  if (error) {
    mostrarMensaje("msgSeguimiento", `Error: ${error.message}`, "error");
    console.error(error);
    return;
  }
  mostrarMensaje("msgSeguimiento", "Seguimiento guardado correctamente.", "success");
  event.target.reset();
  await cargarSeguimientos();
}

async function cargarSeguimientos() {
  const { data, error } = await supabaseClient
    .from("seguimiento_alumnos")
    .select("*, alumno:profiles!seguimiento_alumnos_alumno_id_fkey(nombre,apellido,email), cursos(id,nombre), creador:profiles!seguimiento_alumnos_creado_por_fkey(nombre,apellido)")
    .order("creado_en", { ascending: false })
    .limit(100);

  if (error) {
    qs("listaSeguimientos").innerHTML = `<p class="form-message error">${escapeHtml(error.message)}</p>`;
    console.error(error);
    return;
  }

  let rows = data || [];
  if (cursosPermitidos.size) {
    rows = rows.filter((s) => cursosPermitidos.has(String(s.cursos?.id || s.curso_id || "")));
  }
  if (!rows.length) {
    qs("listaSeguimientos").innerHTML = "<p class='helper-text'>Todavía no hay seguimientos registrados.</p>";
    return;
  }

  qs("listaSeguimientos").innerHTML = rows.map((s) => `
    <div class="follow-card">
      <h3>${escapeHtml(s.alumno?.apellido || "")}, ${escapeHtml(s.alumno?.nombre || "")}</h3>
      <p><span class="badge">${escapeHtml(s.tipo)}</span> <span class="badge">${escapeHtml(s.prioridad)}</span> ${s.visible_familia ? "<span class='badge'>Visible familia</span>" : ""}</p>
      <p>${escapeHtml(s.descripcion)}</p>
      <small>Curso: ${escapeHtml(s.cursos?.nombre || "-")} · Cargado por: ${escapeHtml(s.creador?.apellido || "")}, ${escapeHtml(s.creador?.nombre || "")}</small>
    </div>`).join("");
}

async function calcularAlertas() {
  qs("resultadoAlertas").innerHTML = "<p class='helper-text'>Calculando alertas...</p>";
  const { data, error } = await supabaseClient
    .from("asistencia_registros")
    .select("alumno_id, profiles(nombre,apellido), asistencia_estados(computa_inasistencia), asistencia_clases(fecha,cursos(id,nombre))")
    .order("creado_en", { ascending: false })
    .limit(3000);

  if (error) {
    qs("resultadoAlertas").innerHTML = "<div class='alert-box alert-red'>No se pudieron calcular las alertas de asistencia.</div>";
    console.error(error);
    alertasActuales = [];
    return;
  }

  const resumen = {};
  (data || []).forEach((r) => {
    const cursoRegistro = String(r.asistencia_clases?.cursos?.id || "");
    if (cursosPermitidos.size && !cursosPermitidos.has(cursoRegistro)) return;
    const id = String(r.alumno_id || "");
    if (!id) return;
    if (!resumen[id]) {
      resumen[id] = {
        alumno: `${r.profiles?.apellido || ""}, ${r.profiles?.nombre || ""}`.trim(),
        curso: r.asistencia_clases?.cursos?.nombre || "-",
        total: 0,
        ausencias: 0
      };
    }
    resumen[id].total += 1;
    if (r.asistencia_estados?.computa_inasistencia) resumen[id].ausencias += 1;
  });

  alertasActuales = Object.values(resumen)
    .map((item) => ({ ...item, porcentajeAusencia: item.total ? Math.round((item.ausencias / item.total) * 1000) / 10 : 0 }))
    .filter((item) => item.ausencias > 0)
    .sort((a, b) => b.porcentajeAusencia - a.porcentajeAusencia || b.ausencias - a.ausencias);

  if (!alertasActuales.length) {
    qs("resultadoAlertas").innerHTML = "<div class='alert-box alert-green'><strong>Sin alertas.</strong><br>No se detectan ausencias computables cargadas.</div>";
    return;
  }

  qs("resultadoAlertas").innerHTML = alertasActuales.map((item) => {
    const clase = item.porcentajeAusencia >= 20 ? "alert-red" : item.porcentajeAusencia >= 10 ? "alert-yellow" : "alert-green";
    const nivel = item.porcentajeAusencia >= 20 ? "Riesgo alto" : item.porcentajeAusencia >= 10 ? "Atención" : "Seguimiento";
    return `<div class="alert-box ${clase}"><strong>${escapeHtml(item.alumno)}</strong><br>${escapeHtml(item.curso)} · ${item.ausencias} ausencia/s de ${item.total} registros (${item.porcentajeAusencia}%) · ${nivel}</div>`;
  }).join("");
}

function exportarAlertasAsistencia() {
  if (!alertasActuales.length) {
    alert("Primero calculá las alertas para exportarlas.");
    return;
  }
  const rows = alertasActuales.map((item) => `<tr><td>${escapeHtml(item.alumno)}</td><td>${escapeHtml(item.curso)}</td><td>${item.total}</td><td>${item.ausencias}</td><td>${item.porcentajeAusencia}%</td><td>${item.porcentajeAusencia >= 20 ? "Alto" : item.porcentajeAusencia >= 10 ? "Medio" : "Bajo"}</td></tr>`).join("");
  const body = `<table><thead><tr><th>Alumno</th><th>Curso</th><th>Registros</th><th>Ausencias</th><th>% ausencia</th><th>Nivel</th></tr></thead><tbody>${rows}</tbody></table>`;
  window.ADAExport?.openDocument("Alertas de asistencia", body);
}

configurarTabs();
qs("asistenciaCurso")?.addEventListener("change", actualizarMateriasCurso);
qs("btnCargarAlumnos")?.addEventListener("click", cargarAlumnosCurso);
qs("btnTodosPresentes")?.addEventListener("click", () => marcarTodos("presente"));
qs("btnTodosAusentes")?.addEventListener("click", () => marcarTodos("ausente"));
qs("formGuardarAsistencia")?.addEventListener("submit", guardarAsistencia);
qs("btnBuscarHistorial")?.addEventListener("click", buscarHistorial);
qs("formSeguimiento")?.addEventListener("submit", guardarSeguimiento);
qs("btnCalcularAlertas")?.addEventListener("click", calcularAlertas);
qs("btnExportarHistorial")?.addEventListener("click", exportarHistorialAsistencia);
qs("btnExportarAlertas")?.addEventListener("click", exportarAlertasAsistencia);
cargarBase();
