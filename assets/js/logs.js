let adaLogRows = [];

function logEsc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function logDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? logEsc(value) : date.toLocaleString("es-AR");
}

async function tryTable(table) {
  let result = await supabaseClient.from(table).select("*").order("created_at", { ascending: false }).limit(300);
  if (result.error) result = await supabaseClient.from(table).select("*").limit(300);
  if (result.error) throw result.error;
  return result.data || [];
}

function logPick(row, keys) {
  for (const key of keys) if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  return "";
}

function logRender() {
  const body = document.getElementById("logsBody");
  const q = (document.getElementById("logsSearch")?.value || "").toLowerCase().trim();
  const level = document.getElementById("logsLevel")?.value || "";
  const rows = adaLogRows.filter((row) => {
    const rowLevel = String(logPick(row, ["nivel", "level", "severity", "estado", "tipo"]) || "info").toLowerCase();
    if (level && rowLevel !== level) return false;
    return !q || JSON.stringify(row).toLowerCase().includes(q);
  });
  document.getElementById("logsCount").textContent = String(rows.length);
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty-cell">No hay logs disponibles.</td></tr>';
    return;
  }
  body.innerHTML = rows.map((row) => {
    const when = logPick(row, ["created_at", "creado_en", "fecha", "timestamp"]);
    const lvl = String(logPick(row, ["nivel", "level", "severity", "estado", "tipo"]) || "info").toLowerCase();
    const source = logPick(row, ["origen", "modulo", "servicio", "tabla", "__source"]);
    const message = logPick(row, ["mensaje", "message", "descripcion", "detalle", "evento"]);
    const user = logPick(row, ["email", "usuario", "user_id", "profile_id"]);
    return `<tr><td>${logDate(when)}</td><td><span class="status-chip log-${logEsc(lvl)}">${logEsc(lvl)}</span></td><td>${logEsc(source || "—")}</td><td>${logEsc(message || "—")}</td><td>${logEsc(user || "—")}</td></tr>`;
  }).join("");
}

async function logLoad() {
  const status = document.getElementById("logsMessage");
  status.textContent = "Cargando logs…";
  const tables = ["logs_sistema", "system_logs", "auditoria_accesos"];
  const rows = [];
  for (const table of tables) {
    try {
      const data = await tryTable(table);
      data.forEach((row) => rows.push({ ...row, __source: table }));
    } catch (error) {
      console.warn(`Tabla de logs no disponible: ${table}`, error);
    }
  }
  adaLogRows = rows.sort((a, b) => new Date(logPick(b,["created_at","creado_en","fecha","timestamp"]) || 0) - new Date(logPick(a,["created_at","creado_en","fecha","timestamp"]) || 0));
  logRender();
  status.textContent = adaLogRows.length ? `${adaLogRows.length} registros disponibles.` : "No se encontraron tablas de logs. La pantalla queda preparada para cuando se habiliten.";
}

document.addEventListener("DOMContentLoaded", async () => {
  const context = await adaRequirePageAccess(["admin"]);
  if (!context) return;
  document.getElementById("logsSearch")?.addEventListener("input", logRender);
  document.getElementById("logsLevel")?.addEventListener("change", logRender);
  document.getElementById("logsRefresh")?.addEventListener("click", logLoad);
  await logLoad();
});
