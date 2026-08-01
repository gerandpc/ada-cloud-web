// ADA Cloud Web - Bloque 20: espacio operativo de Secretaría

const secretariaState = { perfil: null };

function sec$(id) { return document.getElementById(id); }
function secText(id, value) { const el = sec$(id); if (el) el.textContent = value; }
function secEsc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function secDate(value) {
  if (!value) return "Sin fecha";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("es-AR");
}
function secMessage(text, type = "") {
  const el = sec$("mensajeSecretaria");
  if (!el) return;
  el.textContent = text || "";
  el.className = `form-message ${type}`.trim();
}

async function secCount(table, applyFilters) {
  try {
    let query = supabaseClient.from(table).select("id", { count: "exact", head: true });
    if (typeof applyFilters === "function") query = applyFilters(query);
    const { count, error } = await query;
    if (error) throw error;
    return Number(count || 0);
  } catch (error) {
    console.warn(`No se pudo contar ${table}:`, error.message);
    return null;
  }
}

async function secSelect(table, columns = "*", applyFilters) {
  try {
    let query = supabaseClient.from(table).select(columns);
    if (typeof applyFilters === "function") query = applyFilters(query);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn(`No se pudo consultar ${table}:`, error.message);
    return [];
  }
}

async function secLoadKpis() {
  const [alumnos, docentes, tramites, planillas] = await Promise.all([
    secCount("profiles", q => q.eq("rol", "alumno").eq("activo", true)),
    secCount("profiles", q => q.eq("rol", "docente").eq("activo", true)),
    secCount("documentacion_destinatarios", q => q.in("estado", ["pendiente", "observado", "devuelto"])),
    secCount("planillas_secretaria", q => q.neq("estado", "cerrada"))
  ]);

  secText("kpiSecretariaAlumnos", alumnos === null ? "—" : alumnos);
  secText("kpiSecretariaDocentes", docentes === null ? "—" : docentes);
  secText("kpiSecretariaTramites", tramites === null ? "—" : tramites);
  secText("kpiSecretariaPlanillas", planillas === null ? "—" : planillas);

  return { alumnos, docentes, tramites, planillas };
}

function secPriorityItem(title, detail, href, tone = "neutral") {
  return `
    <a class="secretaria-priority ${secEsc(tone)}" href="${secEsc(href)}">
      <span class="secretaria-priority-dot" aria-hidden="true"></span>
      <span><strong>${secEsc(title)}</strong><small>${secEsc(detail)}</small></span>
      <b aria-hidden="true">›</b>
    </a>`;
}

async function secLoadPriorities(kpis) {
  const container = sec$("secretariaPrioridades");
  if (!container) return;
  const items = [];

  if ((kpis.tramites || 0) > 0) {
    items.push(secPriorityItem(
      `${kpis.tramites} trámite${kpis.tramites === 1 ? "" : "s"} pendiente${kpis.tramites === 1 ? "" : "s"}`,
      "Revisar documentación, firmas o justificaciones.",
      "documentacion.html",
      "warning"
    ));
  }

  if ((kpis.planillas || 0) > 0) {
    items.push(secPriorityItem(
      `${kpis.planillas} planilla${kpis.planillas === 1 ? "" : "s"} abierta${kpis.planillas === 1 ? "" : "s"}`,
      "Controlar fechas, responsables y estado de cierre.",
      "planillas-secretaria.html",
      "info"
    ));
  }

  const cierresPendientes = await secCount("cierres_academicos", q => q.neq("estado", "cerrado"));
  if ((cierresPendientes || 0) > 0) {
    items.push(secPriorityItem(
      `${cierresPendientes} cierre${cierresPendientes === 1 ? "" : "s"} académico${cierresPendientes === 1 ? "" : "s"} pendiente${cierresPendientes === 1 ? "" : "s"}`,
      "Verificar estados antes de publicar boletines y actas.",
      "cierres-academicos.html",
      "danger"
    ));
  }

  if (!items.length) {
    items.push(secPriorityItem("Sin pendientes críticos", "La gestión administrativa se encuentra al día.", "reportes.html", "success"));
  }
  container.innerHTML = items.join("");
}

async function secLoadActivity() {
  const container = sec$("secretariaActividad");
  if (!container) return;

  const [planillas, comunicados, cierres] = await Promise.all([
    secSelect("planillas_secretaria", "id,estado,formato_planilla,fecha_desde,fecha_hasta,created_at", q => q.order("created_at", { ascending: false }).limit(5)),
    secSelect("comunicados", "id,titulo,estado,created_at", q => q.order("created_at", { ascending: false }).limit(5)),
    secSelect("cierres_academicos", "id,estado,instancia,fecha_cierre,created_at", q => q.order("created_at", { ascending: false }).limit(5))
  ]);

  const rows = [
    ...planillas.map(x => ({ tipo: "Planilla", detalle: x.formato_planilla || "Planilla académica", estado: x.estado || "sin estado", fecha: x.created_at || x.fecha_desde })),
    ...comunicados.map(x => ({ tipo: "Comunicado", detalle: x.titulo || "Comunicado institucional", estado: x.estado || "publicado", fecha: x.created_at })),
    ...cierres.map(x => ({ tipo: "Cierre", detalle: x.instancia || "Cierre académico", estado: x.estado || "sin estado", fecha: x.created_at || x.fecha_cierre }))
  ].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0)).slice(0, 10);

  if (!rows.length) {
    container.innerHTML = '<p class="form-message">No hay movimientos recientes disponibles.</p>';
    return;
  }

  container.innerHTML = `
    <table class="ada-table">
      <thead><tr><th>Tipo</th><th>Detalle</th><th>Estado</th><th>Fecha</th></tr></thead>
      <tbody>${rows.map(row => `
        <tr>
          <td>${secEsc(row.tipo)}</td>
          <td>${secEsc(row.detalle)}</td>
          <td><span class="status-pill">${secEsc(row.estado)}</span></td>
          <td>${secEsc(secDate(row.fecha))}</td>
        </tr>`).join("")}</tbody>
    </table>`;
}

async function secLoadAll() {
  secMessage("Actualizando información...");
  const kpis = await secLoadKpis();
  await Promise.all([secLoadPriorities(kpis), secLoadActivity()]);
  secMessage("Información actualizada.", "success");
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    secretariaState.perfil = await obtenerSesionPerfil();
    if (!secretariaState.perfil) return;

    const nombre = `${secretariaState.perfil.nombre || ""} ${secretariaState.perfil.apellido || ""}`.trim();
    secText("secretariaBienvenida", nombre ? `Hola, ${nombre}. Estos son los pendientes administrativos de hoy.` : "Estos son los pendientes administrativos de hoy.");

    sec$("btnActualizarSecretaria")?.addEventListener("click", secLoadAll);
    await secLoadAll();
  } catch (error) {
    console.error(error);
    secMessage(error.message || "No se pudo cargar el espacio de Secretaría.", "error");
  }
});
