(function(){
  "use strict";

  const ALLOWED_ROLES = new Set(["admin", "directivo", "secretaria", "preceptor"]);
  let perfil = null;
  let alumnos = [];
  let cursos = [];
  let materias = [];
  let registros = [];

  const $ = (id) => document.getElementById(id);
  const text = (value) => String(value ?? "").trim();

  function setMessage(message, type = "info") {
    const el = $("mensajeLibres");
    if (!el) return;
    el.textContent = message;
    el.className = `form-message ${type}`;
  }

  function createOption(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }

  function fillSelect(id, items, labelFn) {
    const select = $(id);
    if (!select) return;
    select.replaceChildren(createOption("", "Seleccionar..."));
    items.forEach((item) => select.appendChild(createOption(item.id, labelFn(item))));
  }

  async function fetchTable(table, query = "*") {
    const { data, error } = await supabaseClient.from(table).select(query);
    if (error) throw error;
    return data || [];
  }

  function courseLabel(course) {
    return text(course?.nombre) || [course?.anio, course?.division].filter(Boolean).join(" ") || "Curso";
  }

  function studentLabel(student) {
    return [text(student?.apellido), text(student?.nombre)].filter(Boolean).join(", ") || "Alumno";
  }

  function subjectLabel(subject) {
    return text(subject?.nombre) || text(subject?.descripcion) || "Materia";
  }

  function statusLabel(status) {
    return ({ activo: "Activo", regularizado: "Regularizado", anulado: "Anulado" })[status] || text(status) || "Sin estado";
  }

  function statusClass(status) {
    if (status === "regularizado") return "ok";
    if (status === "anulado") return "muted";
    return "warn";
  }

  function findById(list, id) {
    return list.find((item) => String(item.id) === String(id));
  }

  function buildCard(record) {
    const student = findById(alumnos, record.alumno_id);
    const course = findById(cursos, record.curso_id);
    const subject = findById(materias, record.materia_id);

    const article = document.createElement("article");
    article.className = "libre-card";

    const h3 = document.createElement("h3");
    h3.textContent = studentLabel(student);
    article.appendChild(h3);

    const details = [
      ["Curso", courseLabel(course)],
      ["Materia", subjectLabel(subject)],
      ["Fecha", record.fecha ? new Intl.DateTimeFormat("es-AR").format(new Date(`${record.fecha}T00:00:00`)) : "No informada"],
      ["Motivo", text(record.motivo) || "No informado"],
      ["Observación", text(record.observacion) || "Sin observaciones"]
    ];

    details.forEach(([label, value]) => {
      const p = document.createElement("p");
      const strong = document.createElement("strong");
      strong.textContent = `${label}: `;
      p.append(strong, document.createTextNode(value));
      article.appendChild(p);
    });

    const status = document.createElement("span");
    status.className = `status-pill ${statusClass(record.estado)}`;
    status.textContent = statusLabel(record.estado);
    article.appendChild(status);

    return article;
  }

  function render() {
    const container = $("listaLibresMateria");
    if (!container) return;
    container.replaceChildren();

    if (!registros.length) {
      const empty = document.createElement("div");
      empty.className = "libre-card";
      empty.textContent = "No hay estudiantes registrados como libres por materia.";
      container.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    registros
      .slice()
      .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")))
      .forEach((record) => fragment.appendChild(buildCard(record)));
    container.appendChild(fragment);
  }

  async function loadRecords() {
    try {
      registros = await fetchTable("alumnos_libres_materia");
      render();
      setMessage(`${registros.length} registro${registros.length === 1 ? "" : "s"} disponible${registros.length === 1 ? "" : "s"}.`, "success");
    } catch (error) {
      console.error("No se pudieron cargar los libres por materia", error);
      registros = [];
      render();
      setMessage("No fue posible cargar los registros. Intentá nuevamente.", "error");
    }
  }

  function duplicateExists(payload) {
    return registros.some((item) =>
      String(item.alumno_id) === String(payload.alumno_id) &&
      String(item.curso_id) === String(payload.curso_id) &&
      String(item.materia_id) === String(payload.materia_id) &&
      item.estado === "activo"
    );
  }

  async function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    const payload = {
      alumno_id: $("libreAlumno").value,
      curso_id: $("libreCurso").value,
      materia_id: $("libreMateria").value,
      fecha: $("libreFecha").value,
      motivo: text($("libreMotivo").value),
      estado: $("libreEstado").value,
      observacion: text($("libreObservacion").value) || null,
      creado_por: perfil.id
    };

    if (!payload.alumno_id || !payload.curso_id || !payload.materia_id || !payload.fecha || !payload.motivo) {
      setMessage("Completá todos los campos obligatorios.", "error");
      return;
    }
    if (payload.motivo.length > 300 || (payload.observacion && payload.observacion.length > 1500)) {
      setMessage("El motivo o la observación supera la extensión permitida.", "error");
      return;
    }
    if (payload.estado === "activo" && duplicateExists(payload)) {
      setMessage("Ya existe un registro activo para este estudiante, curso y materia.", "error");
      return;
    }

    submit.disabled = true;
    setMessage("Guardando registro...", "info");
    try {
      const { error } = await supabaseClient.from("alumnos_libres_materia").insert(payload);
      if (error) throw error;
      form.reset();
      $("libreFecha").valueAsDate = new Date();
      await loadRecords();
      setMessage("El registro fue guardado correctamente.", "success");
    } catch (error) {
      console.error("No se pudo guardar el libre por materia", error);
      setMessage("No fue posible guardar el registro. Verificá los datos e intentá nuevamente.", "error");
    } finally {
      submit.disabled = false;
    }
  }

  function exportPdf() {
    if (!registros.length) {
      setMessage("No hay registros para exportar.", "error");
      return;
    }
    if (!window.ADAExport?.openDocument) {
      setMessage("El servicio de exportación no está disponible.", "error");
      return;
    }
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
    const rows = registros.map((record) => {
      const student = findById(alumnos, record.alumno_id);
      const course = findById(cursos, record.curso_id);
      const subject = findById(materias, record.materia_id);
      return `<tr><td>${esc(studentLabel(student))}</td><td>${esc(courseLabel(course))}</td><td>${esc(subjectLabel(subject))}</td><td>${esc(record.fecha || "-")}</td><td>${esc(record.motivo || "-")}</td><td>${esc(statusLabel(record.estado))}</td><td>${esc(record.observacion || "-")}</td></tr>`;
    }).join("");
    window.ADAExport.openDocument("Informe de estudiantes libres por materia", `<table><thead><tr><th>Estudiante</th><th>Curso</th><th>Materia</th><th>Fecha</th><th>Motivo</th><th>Estado</th><th>Observación</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  async function init() {
    try {
      perfil = await obtenerSesionPerfil();
      if (!perfil) return;
      if (!ALLOWED_ROLES.has(perfil.rol)) {
        location.replace("dashboard.html");
        return;
      }

      $("formLibreMateria")?.addEventListener("submit", save);
      $("exportarLibresPdf")?.addEventListener("click", exportPdf);
      $("libreFecha").valueAsDate = new Date();

      setMessage("Cargando información...", "info");
      [alumnos, cursos, materias] = await Promise.all([
        fetchTable("alumnos"),
        fetchTable("cursos"),
        fetchTable("materias")
      ]);

      fillSelect("libreAlumno", alumnos, studentLabel);
      fillSelect("libreCurso", cursos, courseLabel);
      fillSelect("libreMateria", materias, subjectLabel);
      await loadRecords();
    } catch (error) {
      console.error("No se pudo iniciar Libres por materia", error);
      setMessage("No fue posible iniciar el módulo. Intentá nuevamente.", "error");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
