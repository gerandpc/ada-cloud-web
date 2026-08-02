const ADA_PERMISSION_ROLES = ["admin", "directivo", "secretaria", "docente", "preceptor", "alumno", "familia"];
const ADA_PERMISSION_LABELS = { admin:"Administrador", directivo:"Directivo", secretaria:"Secretaría", docente:"Docente", preceptor:"Preceptor", alumno:"Alumno", familia:"Familia" };
let adaPermissionRows = [];

function permissionEsc(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function permissionModuleForPage(page) {
  const entry = Object.entries(window.ADA_ROLE_MODULES || {}).flatMap(([role, modules]) => modules.map(module => ({ role, module })));
  const normalized = page.replace(/\.html$/i, "");
  const exact = entry.find(item => item.module === normalized || (item.module === "mi-docente" && normalized === "mi-espacio-docente") || (item.module === "mi-alumno" && normalized === "mi-espacio-alumno") || (item.module === "mi-familia" && normalized === "mi-espacio-familia") || (item.module === "mi-preceptor" && normalized === "mi-espacio-preceptor"));
  return exact?.module || normalized;
}

function permissionBuildRows() {
  const access = window.ADA_PAGE_ACCESS || {};
  adaPermissionRows = Object.entries(access).map(([page, roles]) => ({ page, module: permissionModuleForPage(page), roles: Array.isArray(roles) ? roles : [] })).sort((a,b) => a.page.localeCompare(b.page, "es"));
}

function permissionFilteredRows() {
  const query = (document.getElementById("permissionSearch")?.value || "").trim().toLowerCase();
  const role = document.getElementById("permissionRole")?.value || "";
  return adaPermissionRows.filter(row => (!query || `${row.page} ${row.module}`.toLowerCase().includes(query)) && (!role || row.roles.includes(role)));
}

function permissionRender() {
  const rows = permissionFilteredRows();
  const body = document.getElementById("permissionTableBody");
  if (!body) return;
  body.innerHTML = rows.length ? rows.map(row => `<tr><td>${permissionEsc(row.page)}</td><td>${permissionEsc(row.module)}</td>${ADA_PERMISSION_ROLES.map(role => `<td class="permission-cell"><span class="permission-state ${row.roles.includes(role) ? "allowed" : "denied"}" aria-label="${row.roles.includes(role) ? "Permitido" : "Denegado"}">${row.roles.includes(role) ? "✓" : "—"}</span></td>`).join("")}</tr>`).join("") : '<tr><td colspan="9" class="empty-cell">No hay permisos que coincidan con el filtro.</td></tr>';

  const summary = document.getElementById("permissionSummary");
  if (summary) summary.innerHTML = `<article><strong>${adaPermissionRows.length}</strong><span>páginas declaradas</span></article><article><strong>${rows.length}</strong><span>filas visibles</span></article><article><strong>${ADA_PERMISSION_ROLES.length}</strong><span>roles controlados</span></article>`;
}

function permissionCsv() {
  const rows = permissionFilteredRows();
  const lines = [["pagina","modulo",...ADA_PERMISSION_ROLES].join(",")];
  rows.forEach(row => lines.push([row.page,row.module,...ADA_PERMISSION_ROLES.map(role => row.roles.includes(role) ? "SI" : "NO")].map(v => `"${String(v).replaceAll('"','""')}"`).join(",")));
  const blob = new Blob(["\ufeff"+lines.join("\n")], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`ada-matriz-permisos-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
}

function permissionPdf() {
  if (!window.ADA_PDF) return alert("El motor PDF de ADA no está disponible. Recargá la página.");
  const rows = permissionFilteredRows();
  window.ADA_PDF.download({
    title: "Matriz de permisos ADA",
    subtitle: `Generado el ${new Date().toLocaleString("es-AR")}`,
    orientation: "landscape",
    filename: `ADA_Matriz_Permisos_${new Date().toISOString().slice(0,10)}.pdf`,
    sections: [{ table: { headers: ["Página","Módulo",...ADA_PERMISSION_ROLES.map(r=>ADA_PERMISSION_LABELS[r])], rows: rows.map(row=>[row.page,row.module,...ADA_PERMISSION_ROLES.map(role=>row.roles.includes(role)?"Sí":"No")]), options:{fontSize:6} } }]
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const ctx = await adaRequirePageAccess(["admin", "directivo"]);
  if (!ctx) return;
  const select = document.getElementById("permissionRole");
  ADA_PERMISSION_ROLES.forEach(role => select?.insertAdjacentHTML("beforeend", `<option value="${role}">${ADA_PERMISSION_LABELS[role]}</option>`));
  permissionBuildRows(); permissionRender();
  document.getElementById("permissionSearch")?.addEventListener("input", permissionRender);
  document.getElementById("permissionRole")?.addEventListener("change", permissionRender);
  document.getElementById("permissionExportCsv")?.addEventListener("click", permissionCsv);
  document.getElementById("permissionExportPdf")?.addEventListener("click", permissionPdf);
});
