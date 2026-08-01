let adaAuditContext = null;
let adaAuditRows = [];

function auditEsc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function auditDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? auditEsc(value) : date.toLocaleString("es-AR");
}

function auditMessage(text, type = "info") {
  const el = document.getElementById("auditMessage");
  if (!el) return;
  el.textContent = text || "";
  el.className = `module-message ${type}`;
}

async function auditLoadTable(name, columns = "*") {
  const { data, error } = await supabaseClient
    .from(name)
    .select(columns)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data || [];
}

async function auditLoadFallback(name, columns = "*") {
  const { data, error } = await supabaseClient
    .from(name)
    .select(columns)
    .limit(500);
  if (error) throw error;
  return data || [];
}

async function auditLoad() {
  auditMessage("Cargando auditoría…");
  const sources = [
    { table: "auditoria_accesos", kind: "Acceso" },
    { table: "documentacion_auditoria", kind: "Documentación" }
  ];

  const all = [];
  for (const source of sources) {
    try {
      let rows;
      try { rows = await auditLoadTable(source.table); }
      catch (_) { rows = await auditLoadFallback(source.table); }
      rows.forEach((row) => all.push({ ...row, __source: source.table, __kind: source.kind }));
    } catch (error) {
      console.warn(`No se pudo leer ${source.table}:`, error);
    }
  }

  adaAuditRows = all.sort((a, b) => {
    const av = new Date(a.created_at || a.creado_en || a.fecha || 0).getTime();
    const bv = new Date(b.created_at || b.creado_en || b.fecha || 0).getTime();
    return bv - av;
  });
  auditRender();
  auditMessage(adaAuditRows.length ? `${adaAuditRows.length} eventos cargados.` : "No hay eventos disponibles.", "success");
}

function auditValue(row, keys) {
  for (const key of keys) if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  return "";
}

function auditRender() {
  const q = (document.getElementById("auditSearch")?.value || "").trim().toLowerCase();
  const source = document.getElementById("auditSource")?.value || "";
  const filtered = adaAuditRows.filter((row) => {
    if (source && row.__source !== source) return false;
    if (!q) return true;
    return JSON.stringify(row).toLowerCase().includes(q);
  });

  const body = document.getElementById("auditTableBody");
  const count = document.getElementById("auditCount");
  if (count) count.textContent = String(filtered.length);
  if (!body) return;

  if (!filtered.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty-cell">No hay registros para mostrar.</td></tr>';
    return;
  }

  body.innerHTML = filtered.map((row) => {
    const when = auditValue(row, ["created_at", "creado_en", "fecha", "updated_at"]);
    const user = auditValue(row, ["email", "usuario_email", "usuario", "profile_id", "user_id", "actor_id"]);
    const action = auditValue(row, ["accion", "evento", "tipo", "operacion", "estado"]);
    const entity = auditValue(row, ["entidad", "tabla", "modulo", "documento_id", "registro_id"]);
    const detail = auditValue(row, ["detalle", "descripcion", "observacion", "metadata", "datos"]);
    return `<tr>
      <td>${auditDate(when)}</td>
      <td><span class="status-chip">${auditEsc(row.__kind)}</span></td>
      <td>${auditEsc(user || "—")}</td>
      <td>${auditEsc(action || "—")}</td>
      <td>${auditEsc(entity || "—")}</td>
      <td class="audit-detail">${auditEsc(typeof detail === "object" ? JSON.stringify(detail) : (detail || "—"))}</td>
    </tr>`;
  }).join("");
}

function auditExportCsv() {
  const headers = ["origen", "fecha", "usuario", "accion", "entidad", "detalle"];
  const lines = [headers.join(",")];
  const quote = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  adaAuditRows.forEach((row) => {
    lines.push([
      row.__source,
      auditValue(row, ["created_at", "creado_en", "fecha", "updated_at"]),
      auditValue(row, ["email", "usuario_email", "usuario", "profile_id", "user_id", "actor_id"]),
      auditValue(row, ["accion", "evento", "tipo", "operacion", "estado"]),
      auditValue(row, ["entidad", "tabla", "modulo", "documento_id", "registro_id"]),
      JSON.stringify(auditValue(row, ["detalle", "descripcion", "observacion", "metadata", "datos"]))
    ].map(quote).join(","));
  });
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ada-auditoria-${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", async () => {
  adaAuditContext = await adaRequirePageAccess(["admin", "directivo"]);
  if (!adaAuditContext) return;
  document.getElementById("auditSearch")?.addEventListener("input", auditRender);
  document.getElementById("auditSource")?.addEventListener("change", auditRender);
  document.getElementById("auditRefresh")?.addEventListener("click", auditLoad);
  document.getElementById("auditExport")?.addEventListener("click", auditExportCsv);
  await auditLoad();
});
