(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const MANAGE = ["docente"];
  const REVIEW = ["admin", "directivo"];
  const READ = ["admin", "directivo", "docente", "alumno", "familia"];
  let ctx = null;
  let role = "";
  let rows = [];
  let courses = [];
  let subjects = [];
  let programs = [];
  let editId = null;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const text = (state) => ({borrador:"Borrador",pendiente:"En revisión",observado:"Observada",aprobado:"Aprobada"})[state] || state || "Borrador";
  const pillClass = (state) => state === "aprobado" ? "ok" : state === "pendiente" ? "warn" : state === "observado" ? "danger" : "";
  const canManage = () => MANAGE.includes(role);
  const canReview = () => REVIEW.includes(role);
  const isOwner = (row) => role === "docente" && row.docente_id === ctx?.perfil?.id;
  const canEdit = (row) => isOwner(row) && ["borrador", "observado"].includes(row.estado);

  function option(items, placeholder, label) {
    return `<option value="">${esc(placeholder)}</option>${items.map((item) => `<option value="${esc(item.id)}">${esc(label(item))}</option>`).join("")}`;
  }

  function message(value, ok = true) {
    const node = $("planMensaje");
    if (!node) return;
    node.textContent = value;
    node.className = `form-message ${ok ? "ok" : "error"}`;
  }

  async function loadBase() {
    const [courseRes, subjectRes, programRes] = await Promise.all([
      supabaseClient.from("cursos").select("id,nombre").eq("activo", true).order("nombre"),
      supabaseClient.from("materias").select("id,nombre,curso_id,cursos(id,nombre)").order("nombre"),
      supabaseClient.from("programas_materia").select("id,titulo,curso_id,materia_id,estado").eq("estado", "aprobado").order("titulo")
    ]);
    for (const result of [courseRes, subjectRes, programRes]) if (result.error) throw result.error;
    courses = courseRes.data || [];
    subjects = subjectRes.data || [];
    programs = programRes.data || [];
    const subjectLabel = (item) => `${item.nombre || "Materia"}${item.cursos?.nombre ? ` · ${item.cursos.nombre}` : ""}`;
    ["planCurso", "planFiltroCurso"].forEach((id) => { if ($(id)) $(id).innerHTML = option(courses, "Seleccionar curso", (item) => item.nombre); });
    ["planMateria", "planFiltroMateria"].forEach((id) => { if ($(id)) $(id).innerHTML = option(subjects, "Seleccionar materia", subjectLabel); });
    if ($("planPrograma")) $("planPrograma").innerHTML = option(programs, "Sin programa asociado", (item) => item.titulo);
    $("planAnio").value = new Date().getFullYear();
  }

  async function loadRows() {
    let query = supabaseClient
      .from("planificaciones_didacticas")
      .select("*, cursos(id,nombre), materias(id,nombre), docente:profiles!planificaciones_didacticas_docente_id_fkey(id,nombre,apellido,email), aprobador:profiles!planificaciones_didacticas_aprobado_por_fkey(id,nombre,apellido,email)")
      .order("actualizado_en", { ascending: false })
      .limit(500);
    if (role === "docente") query = query.eq("docente_id", ctx.perfil.id);
    if (["alumno", "familia"].includes(role)) query = query.eq("estado", "aprobado");
    const { data, error } = await query;
    if (error) throw error;
    rows = data || [];
    render();
  }

  function filteredRows() {
    const course = $("planFiltroCurso")?.value || "";
    const subject = $("planFiltroMateria")?.value || "";
    const state = $("planFiltroEstado")?.value || "";
    return rows.filter((row) => (!course || row.curso_id === course) && (!subject || row.materia_id === subject) && (!state || row.estado === state));
  }

  function render() {
    $("planKpiTotal").textContent = rows.length;
    $("planKpiBorrador").textContent = rows.filter((row) => row.estado === "borrador").length;
    $("planKpiPendiente").textContent = rows.filter((row) => row.estado === "pendiente").length;
    $("planKpiAprobado").textContent = rows.filter((row) => row.estado === "aprobado").length;
    const list = $("planLista");
    const visible = filteredRows();
    if (!visible.length) {
      list.innerHTML = '<div class="plan-empty">No hay planificaciones para los filtros seleccionados.</div>';
      return;
    }
    list.innerHTML = visible.map((row) => {
      const owner = [row.docente?.apellido, row.docente?.nombre].filter(Boolean).join(", ") || row.docente?.email || "";
      return `<article class="plan-card">
        <h3>${esc(row.titulo)}</h3>
        <p>${esc(row.contenidos || "Sin contenidos registrados.")}</p>
        <div class="plan-meta"><span class="plan-pill ${pillClass(row.estado)}">${esc(text(row.estado))}</span><span class="plan-pill">${esc(row.cursos?.nombre || "Curso")}</span><span class="plan-pill">${esc(row.materias?.nombre || "Materia")}</span><span class="plan-pill">${esc(row.periodo || "anual")}</span><span class="plan-pill">Versión ${esc(row.version)}</span>${canReview() && owner ? `<span class="plan-pill">${esc(owner)}</span>` : ""}</div>
        ${row.observaciones_revision ? `<div class="plan-review"><strong>Observación:</strong> ${esc(row.observaciones_revision)}</div>` : ""}
        <div class="plan-actions">
          <button type="button" class="btn-secondary" data-action="pdf" data-id="${esc(row.id)}">Exportar PDF</button>
          ${canEdit(row) ? `<button type="button" class="btn-secondary" data-action="edit" data-id="${esc(row.id)}">Editar</button><button type="button" class="btn-primary" data-action="send" data-id="${esc(row.id)}">Enviar a revisión</button>` : ""}
          ${isOwner(row) && row.estado === "aprobado" ? `<button type="button" class="btn-secondary" data-action="version" data-id="${esc(row.id)}">Nueva versión</button>` : ""}
          ${canReview() && row.estado === "pendiente" ? `<button type="button" class="btn-primary" data-action="approve" data-id="${esc(row.id)}">Aprobar</button><button type="button" class="btn-secondary" data-action="observe" data-id="${esc(row.id)}">Observar</button>` : ""}
        </div>
      </article>`;
    }).join("");
  }

  function openEditor(row = null) {
    if (!canManage()) return;
    editId = row?.id || null;
    $("planEditorTitle").textContent = editId ? "Editar planificación" : "Nueva planificación";
    $("planEditorPanel").classList.remove("plan-hidden");
    $("planCurso").value = row?.curso_id || "";
    $("planMateria").value = row?.materia_id || "";
    $("planPrograma").value = row?.programa_id || "";
    $("planAnio").value = row?.anio_lectivo || new Date().getFullYear();
    $("planPeriodo").value = row?.periodo || "anual";
    $("planVersion").value = row?.version || "1.00";
    $("planTitulo").value = row?.titulo || "";
    $("planPropositos").value = row?.propositos || "";
    $("planObjetivos").value = row?.objetivos || "";
    $("planContenidos").value = row?.contenidos || "";
    $("planEstrategias").value = row?.estrategias || "";
    $("planActividades").value = row?.actividades_previstas || "";
    $("planRecursos").value = row?.recursos || "";
    $("planEvaluacion").value = row?.evaluacion || "";
    $("planCronograma").value = row?.cronograma || "";
    $("planAdecuaciones").value = row?.adecuaciones || "";
    message("");
    $("planEditorPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeEditor() {
    editId = null;
    $("planForm").reset();
    $("planAnio").value = new Date().getFullYear();
    $("planVersion").value = "1.00";
    $("planEditorPanel").classList.add("plan-hidden");
  }

  function formPayload() {
    return {
      programa_id: $("planPrograma").value || null,
      curso_id: $("planCurso").value,
      materia_id: $("planMateria").value,
      docente_id: ctx.perfil.id,
      anio_lectivo: Number($("planAnio").value),
      periodo: $("planPeriodo").value,
      version: Number(String($("planVersion").value).replace(",", ".")) || 1,
      titulo: $("planTitulo").value.trim(),
      propositos: $("planPropositos").value.trim() || null,
      objetivos: $("planObjetivos").value.trim() || null,
      contenidos: $("planContenidos").value.trim(),
      estrategias: $("planEstrategias").value.trim() || null,
      actividades_previstas: $("planActividades").value.trim() || null,
      recursos: $("planRecursos").value.trim() || null,
      evaluacion: $("planEvaluacion").value.trim() || null,
      cronograma: $("planCronograma").value.trim() || null,
      adecuaciones: $("planAdecuaciones").value.trim() || null,
      estado: "borrador"
    };
  }

  async function save(event) {
    event.preventDefault();
    try {
      if (!canManage()) throw new Error("Tu rol no puede crear planificaciones.");
      const payload = formPayload();
      if (!payload.curso_id || !payload.materia_id || !payload.titulo || !payload.contenidos) throw new Error("Completá curso, materia, título y contenidos.");
      const result = editId
        ? await supabaseClient.from("planificaciones_didacticas").update(payload).eq("id", editId).eq("docente_id", ctx.perfil.id)
        : await supabaseClient.from("planificaciones_didacticas").insert(payload);
      if (result.error) throw result.error;
      message("Planificación guardada correctamente.");
      await loadRows();
      setTimeout(closeEditor, 500);
    } catch (error) {
      message(error.message || "No se pudo guardar la planificación.", false);
    }
  }

  async function changeState(id, state) {
    const row = rows.find((item) => item.id === id);
    if (!row) return;
    const patch = { estado: state };
    if (state === "pendiente") {
      if (!canEdit(row)) return;
      patch.observaciones_revision = null;
      patch.aprobado_por = null;
      patch.aprobado_en = null;
    } else if (state === "aprobado") {
      if (!canReview()) return;
      patch.aprobado_por = ctx.perfil.id;
      patch.aprobado_en = new Date().toISOString();
      patch.observaciones_revision = null;
    } else if (state === "observado") {
      if (!canReview()) return;
      const observation = window.prompt("Escribí la observación para el docente:", row.observaciones_revision || "");
      if (!observation?.trim()) return;
      patch.observaciones_revision = observation.trim();
      patch.aprobado_por = null;
      patch.aprobado_en = null;
    }
    const { error } = await supabaseClient.from("planificaciones_didacticas").update(patch).eq("id", id);
    if (error) throw error;
    await loadRows();
  }

  async function newVersion(id) {
    const row = rows.find((item) => item.id === id);
    if (!row || !isOwner(row) || row.estado !== "aprobado") return;
    const copy = { ...row };
    delete copy.id; delete copy.cursos; delete copy.materias; delete copy.docente; delete copy.aprobador; delete copy.creado_en; delete copy.actualizado_en;
    copy.estado = "borrador";
    copy.aprobado_por = null;
    copy.aprobado_en = null;
    copy.observaciones_revision = null;
    copy.version = Math.floor(Number(row.version || 1)) + 1;
    const { error } = await supabaseClient.from("planificaciones_didacticas").insert(copy);
    if (error) throw error;
    await loadRows();
  }

  function exportPdf(row) {
    if (!window.ADA_PDF) return alert("El motor PDF de ADA no está disponible. Recargá la página.");
    window.ADA_PDF.download({
      title: row.titulo || "Planificación didáctica",
      subtitle: `${row.cursos?.nombre || "Curso"} · ${row.materias?.nombre || "Materia"} · ${row.anio_lectivo || ""} · ${text(row.estado)} · Versión ${row.version || 1}`,
      filename: `ADA_Planificacion_${String(row.titulo || "didactica").replace(/[^a-zA-Z0-9_-]+/g,"_")}_${new Date().toISOString().slice(0,10)}.pdf`,
      sections: [
        { title: "Información general", keyValues: [["Curso",row.cursos?.nombre],["Materia",row.materias?.nombre],["Año lectivo",row.anio_lectivo],["Estado",text(row.estado)],["Versión",row.version]] },
        { title: "Propósitos", text: row.propositos },
        { title: "Objetivos", text: row.objetivos },
        { title: "Contenidos", text: row.contenidos },
        { title: "Estrategias de enseñanza", text: row.estrategias },
        { title: "Actividades previstas", text: row.actividades_previstas },
        { title: "Recursos", text: row.recursos },
        { title: "Evaluación", text: row.evaluacion },
        { title: "Cronograma", text: row.cronograma },
        { title: "Adecuaciones y accesibilidad", text: row.adecuaciones },
        { title: "Observaciones de revisión", text: row.observaciones_revision }
      ].filter(x => x.keyValues || x.text)
    });
  }

  async function onListClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const row = rows.find((item) => item.id === button.dataset.id);
    try {
      if (button.dataset.action === "pdf") exportPdf(row);
      if (button.dataset.action === "edit") openEditor(row);
      if (button.dataset.action === "send") await changeState(row.id, "pendiente");
      if (button.dataset.action === "approve") await changeState(row.id, "aprobado");
      if (button.dataset.action === "observe") await changeState(row.id, "observado");
      if (button.dataset.action === "version") await newVersion(row.id);
    } catch (error) {
      alert(error.message || "No se pudo completar la acción.");
    }
  }

  async function boot() {
    try {
      ctx = await adaRequirePageAccess(READ);
      if (!ctx) return;
      role = String(ctx.perfil.rol || "").toLowerCase();
      $("planBtnNueva").hidden = !canManage();
      await loadBase();
      await loadRows();
      $("planForm").addEventListener("submit", save);
      $("planBtnNueva").addEventListener("click", () => openEditor());
      $("planBtnCancelar").addEventListener("click", closeEditor);
      $("planBtnFiltrar").addEventListener("click", render);
      $("planBtnLimpiar").addEventListener("click", () => { $("planFiltroCurso").value = ""; $("planFiltroMateria").value = ""; $("planFiltroEstado").value = ""; render(); });
      $("planLista").addEventListener("click", onListClick);
    } catch (error) {
      $("planLista").innerHTML = `<div class="plan-empty">${esc(error.message || "No se pudieron cargar las planificaciones.")}</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", boot, { once: true });
})();
