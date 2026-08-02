const qs = (id) => document.getElementById(id);
let perfilActual = null;
let cursos = [];
let misComunicados = [];
let lecturas = [];
let gestionComunicados = [];

const ROLES_GESTION = ["admin", "directivo", "secretaria", "preceptor"];
const ROLES_PUBLICACION_GENERAL = ["admin", "directivo", "secretaria"];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mensajeUsuario(error, fallback = "No se pudo completar la operación.") {
  if (error) console.error(error);
  return fallback;
}

function puedeGestionarGeneral() {
  return ROLES_PUBLICACION_GENERAL.includes(perfilActual?.rol);
}

function getSelectedValues(select) {
  return Array.from(select.selectedOptions).map(o => o.value).filter(Boolean);
}

function configurarTabs() {
  document.querySelectorAll(".comms-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".comms-tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".comms-section").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
      qs("tab-" + btn.dataset.tab)?.classList.add("active");
    });
  });
}

function badge(text, cls = "") {
  return `<span class="comms-badge ${cls}">${escapeHtml(text || "-")}</span>`;
}

function prioridadClass(p) {
  if (p === "alta") return "comms-priority-alta";
  if (p === "baja") return "comms-priority-baja";
  return "comms-priority-media";
}

function tabla(headers, rows) {
  if (!rows.length) return "<p class='helper-text'>No hay datos para mostrar.</p>";
  return `<table class="ada-table"><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function formatearFecha(fecha) {
  if (!fecha) return "-";
  const d = new Date(`${fecha}T00:00:00`);
  return Number.isNaN(d.getTime()) ? escapeHtml(fecha) : d.toLocaleDateString("es-AR");
}

function esVigente(c) {
  const hoy = new Date().toISOString().slice(0, 10);
  return c.activo !== false && c.publicado === true && (!c.visible_desde || c.visible_desde <= hoy) && (!c.visible_hasta || c.visible_hasta >= hoy);
}

async function cargarBase() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;
  perfilActual = contexto.perfil;

  const hoy = new Date().toISOString().slice(0, 10);
  qs("comDesde").value = hoy;

  const [cursosRes, totalRes, activosRes] = await Promise.all([
    supabaseClient.from("cursos").select("id,nombre").order("nombre"),
    supabaseClient.from("comunicados").select("id", { count: "exact", head: true }),
    supabaseClient.from("comunicados").select("id", { count: "exact", head: true }).eq("activo", true).eq("publicado", true)
  ]);

  cursos = cursosRes.data || [];
  qs("comCursos").innerHTML = cursos.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nombre)}</option>`).join("");

  qs("statTotal").textContent = totalRes.count || 0;
  qs("statActivos").textContent = activosRes.count || 0;

  if (!ROLES_GESTION.includes(perfilActual.rol)) {
    document.querySelector('[data-tab="nuevo"]')?.remove();
    document.querySelector('[data-tab="gestion"]')?.remove();
    qs("tab-nuevo")?.remove();
    qs("tab-gestion")?.remove();
  } else if (!puedeGestionarGeneral()) {
    document.querySelectorAll('#comRoles option').forEach(option => {
      if (["admin", "directivo", "secretaria"].includes(option.value)) option.remove();
    });
    const ayuda = qs("ayudaDestinatarios");
    if (ayuda) ayuda.textContent = "Seleccioná al menos un curso. Preceptoría puede comunicar novedades a los cursos bajo su seguimiento.";
  }

  await cargarMisComunicados();
  await cargarGestion();
}

function renderMisComunicados() {
  const leidosIds = new Set(lecturas.map(l => l.comunicado_id));
  const texto = (qs("filtroComunicados")?.value || "").trim().toLowerCase();
  const prioridad = qs("filtroPrioridad")?.value || "";
  const soloNoLeidos = Boolean(qs("soloNoLeidos")?.checked);

  const filtrados = misComunicados.filter(c => {
    const coincideTexto = !texto || `${c.titulo || ""} ${c.contenido || ""} ${c.tipo || ""}`.toLowerCase().includes(texto);
    const coincidePrioridad = !prioridad || c.prioridad === prioridad;
    const coincideLectura = !soloNoLeidos || !leidosIds.has(c.id);
    return coincideTexto && coincidePrioridad && coincideLectura;
  });

  qs("statMios").textContent = misComunicados.length;
  qs("statLeidos").textContent = misComunicados.filter(c => leidosIds.has(c.id)).length;
  qs("statPendientes").textContent = misComunicados.filter(c => !leidosIds.has(c.id)).length;

  if (!filtrados.length) {
    qs("listaMisComunicados").innerHTML = "<p class='helper-text'>No hay comunicados que coincidan con los filtros.</p>";
    return;
  }

  qs("listaMisComunicados").innerHTML = filtrados.map(c => {
    const leido = leidosIds.has(c.id);
    return `
      <article class="comms-card ${leido ? "is-read" : "is-unread"}">
        <div class="comms-card-head">
          <div>
            <h3>${escapeHtml(c.titulo)}</h3>
            <div class="comms-meta">
              ${badge(c.tipo)}
              ${badge(c.prioridad, prioridadClass(c.prioridad))}
              ${badge(leido ? "Leído" : "No leído", leido ? "comms-read" : "comms-unread")}
              ${c.visible_hasta ? badge("Hasta " + formatearFecha(c.visible_hasta)) : ""}
            </div>
          </div>
          ${!leido ? '<span class="comms-dot" title="Pendiente de lectura"></span>' : ""}
        </div>
        <p>${escapeHtml(c.contenido)}</p>
        <div class="comms-actions">
          <button class="btn-secondary" type="button" data-action="exportar-comunicado" data-id="${escapeHtml(c.id)}">Exportar PDF</button>
          <button class="btn-secondary" type="button" data-action="leer" data-id="${escapeHtml(c.id)}" ${leido ? "disabled" : ""}>${leido ? "Leído" : "Marcar como leído"}</button>
        </div>
      </article>`;
  }).join("");
}

async function cargarMisComunicados() {
  const [comRes, lectRes] = await Promise.all([
    supabaseClient.from("v_comunicados_habilitados").select("*").order("creado_en", { ascending: false }),
    supabaseClient.from("comunicado_lecturas").select("*").eq("usuario_id", perfilActual.id)
  ]);

  if (comRes.error) {
    qs("listaMisComunicados").innerHTML = `<p class="form-message">${escapeHtml(mensajeUsuario(comRes.error, "No se pudieron cargar los comunicados."))}</p>`;
    return;
  }

  misComunicados = (comRes.data || []).filter(esVigente);
  lecturas = lectRes.data || [];
  renderMisComunicados();
}

async function marcarLeido(comunicadoId) {
  const { error } = await supabaseClient
    .from("comunicado_lecturas")
    .upsert({
      comunicado_id: comunicadoId,
      usuario_id: perfilActual.id,
      leido_en: new Date().toISOString()
    }, { onConflict: "comunicado_id,usuario_id" });

  if (error) {
    alert(mensajeUsuario(error, "No se pudo registrar la lectura."));
    return;
  }

  await cargarMisComunicados();
}

window.marcarLeido = marcarLeido;

function renderGestion() {
  if (!ROLES_GESTION.includes(perfilActual.rol)) return;
  const texto = (qs("filtroGestion")?.value || "").trim().toLowerCase();
  const estado = qs("filtroEstadoGestion")?.value || "";

  const filtrados = gestionComunicados.filter(c => {
    const coincideTexto = !texto || `${c.titulo || ""} ${c.contenido || ""} ${c.tipo || ""}`.toLowerCase().includes(texto);
    const vigente = esVigente(c);
    const coincideEstado = !estado || (estado === "vigente" && vigente) || (estado === "borrador" && !c.publicado) || (estado === "archivado" && c.activo === false) || (estado === "vencido" && c.publicado && c.activo !== false && !vigente);
    return coincideTexto && coincideEstado;
  });

  qs("tablaGestionComunicados").innerHTML = tabla(
    ["Título", "Tipo", "Prioridad", "Estado", "Vigencia", "Creado por", "Acciones"],
    filtrados.map(c => {
      const estadoTexto = c.activo === false ? "Archivado" : (!c.publicado ? "Borrador" : (esVigente(c) ? "Vigente" : "Vencido"));
      const puedeEditar = ["admin", "directivo", "secretaria"].includes(perfilActual.rol);
      return `
        <tr>
          <td><strong>${escapeHtml(c.titulo)}</strong><br><small>${escapeHtml((c.contenido || "").slice(0, 120))}${(c.contenido || "").length > 120 ? "…" : ""}</small></td>
          <td>${escapeHtml(c.tipo || "-")}</td>
          <td>${badge(c.prioridad, prioridadClass(c.prioridad))}</td>
          <td>${badge(estadoTexto, `estado-${estadoTexto.toLowerCase()}`)}</td>
          <td>${formatearFecha(c.visible_desde)} / ${c.visible_hasta ? formatearFecha(c.visible_hasta) : "sin fin"}</td>
          <td>${escapeHtml(c.profiles?.apellido || "")}${c.profiles?.apellido ? ", " : ""}${escapeHtml(c.profiles?.nombre || "")}</td>
          <td class="comms-table-actions">
            <button class="btn-secondary btn-compact" type="button" data-action="exportar-comunicado" data-id="${escapeHtml(c.id)}">PDF</button>
            ${puedeEditar && c.activo !== false ? `<button class="btn-secondary btn-compact" type="button" data-action="publicacion" data-id="${escapeHtml(c.id)}" data-value="${!c.publicado}">${c.publicado ? "Despublicar" : "Publicar"}</button>` : ""}
            ${puedeEditar && c.activo !== false ? `<button class="btn-secondary btn-compact danger" type="button" data-action="archivar" data-id="${escapeHtml(c.id)}">Archivar</button>` : ""}
          </td>
        </tr>`;
    })
  );
}

async function cargarGestion() {
  if (!ROLES_GESTION.includes(perfilActual.rol)) return;

  const { data, error } = await supabaseClient
    .from("comunicados")
    .select("*, profiles(nombre,apellido)")
    .order("creado_en", { ascending: false });

  if (error) {
    qs("tablaGestionComunicados").innerHTML = `<p class="form-message">${escapeHtml(mensajeUsuario(error, "No se pudo cargar la gestión de comunicados."))}</p>`;
    return;
  }

  gestionComunicados = data || [];
  renderGestion();
}

async function cambiarPublicacion(id, publicado) {
  if (!["admin", "directivo", "secretaria"].includes(perfilActual.rol)) return;
  const { error } = await supabaseClient.from("comunicados").update({ publicado }).eq("id", id);
  if (error) return alert(mensajeUsuario(error, "No se pudo actualizar el comunicado."));
  await Promise.all([cargarGestion(), cargarMisComunicados()]);
}

async function archivarComunicado(id) {
  if (!["admin", "directivo", "secretaria"].includes(perfilActual.rol)) return;
  if (!confirm("¿Archivar este comunicado? Dejará de mostrarse a los destinatarios.")) return;
  const { error } = await supabaseClient.from("comunicados").update({ activo: false, publicado: false }).eq("id", id);
  if (error) return alert(mensajeUsuario(error, "No se pudo archivar el comunicado."));
  await Promise.all([cargarGestion(), cargarMisComunicados()]);
}

window.cambiarPublicacion = cambiarPublicacion;
window.archivarComunicado = archivarComunicado;

qs("formComunicado")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!ROLES_GESTION.includes(perfilActual.rol)) {
    qs("msgComunicado").textContent = "No tenés permisos para crear comunicados.";
    return;
  }

  const titulo = qs("comTitulo").value.trim();
  const contenido = qs("comContenido").value.trim();
  if (titulo.length < 4 || contenido.length < 10) {
    qs("msgComunicado").textContent = "Completá un título y un contenido más descriptivo.";
    return;
  }

  if (qs("comHasta").value && qs("comDesde").value && qs("comHasta").value < qs("comDesde").value) {
    qs("msgComunicado").textContent = "La fecha final no puede ser anterior a la fecha inicial.";
    return;
  }

  qs("msgComunicado").textContent = "Guardando comunicado...";

  const roles = getSelectedValues(qs("comRoles"));
  const cursosSel = getSelectedValues(qs("comCursos"));

  if (!roles.length && !cursosSel.length) {
    qs("msgComunicado").textContent = "Seleccioná al menos un rol o un curso destinatario.";
    return;
  }

  if (!puedeGestionarGeneral() && !cursosSel.length) {
    qs("msgComunicado").textContent = "Preceptoría debe seleccionar al menos un curso destinatario.";
    return;
  }

  if (!puedeGestionarGeneral() && roles.some(rol => ["admin", "directivo", "secretaria"].includes(rol))) {
    qs("msgComunicado").textContent = "No tenés permisos para seleccionar esos destinatarios.";
    return;
  }

  const payload = {
    titulo,
    contenido,
    tipo: qs("comTipo").value,
    prioridad: qs("comPrioridad").value,
    visible_desde: qs("comDesde").value || null,
    visible_hasta: qs("comHasta").value || null,
    publicado: qs("comPublicado").checked,
    creado_por: perfilActual.id,
    activo: true
  };

  const { data: comunicado, error } = await supabaseClient.from("comunicados").insert(payload).select().single();
  if (error) {
    qs("msgComunicado").textContent = mensajeUsuario(error, "No se pudo guardar el comunicado.");
    return;
  }

  const inserts = [];
  if (roles.length) inserts.push(supabaseClient.from("comunicado_roles").insert(roles.map(rol => ({ comunicado_id: comunicado.id, rol }))));
  if (cursosSel.length) inserts.push(supabaseClient.from("comunicado_cursos").insert(cursosSel.map(curso_id => ({ comunicado_id: comunicado.id, curso_id }))));

  const results = await Promise.all(inserts);
  const relError = results.find(r => r.error)?.error;
  if (relError) {
    await supabaseClient.from("comunicados").delete().eq("id", comunicado.id);
    qs("msgComunicado").textContent = mensajeUsuario(relError, "No se pudo completar la asignación de destinatarios. El comunicado no fue publicado.");
    return;
  }

  qs("msgComunicado").textContent = payload.publicado ? "Comunicado publicado correctamente." : "Borrador guardado correctamente.";
  e.target.reset();
  qs("comDesde").value = new Date().toISOString().slice(0, 10);
  await Promise.all([cargarMisComunicados(), cargarGestion()]);
});

function exportarComunicado(id) {
  const comunicado = [...misComunicados, ...gestionComunicados].find(item => item.id === id);
  if (!comunicado || !window.ADAExport) return;
  const cuerpo = `
    <table>
      <tr><th>Título</th><td>${escapeHtml(comunicado.titulo)}</td></tr>
      <tr><th>Tipo</th><td>${escapeHtml(comunicado.tipo || "-")}</td></tr>
      <tr><th>Prioridad</th><td>${escapeHtml(comunicado.prioridad || "-")}</td></tr>
      <tr><th>Vigencia</th><td>${formatearFecha(comunicado.visible_desde)}${comunicado.visible_hasta ? ` al ${formatearFecha(comunicado.visible_hasta)}` : ""}</td></tr>
    </table>
    <h2>Contenido</h2>
    <p>${escapeHtml(comunicado.contenido).replace(/\n/g, "<br>")}</p>`;
  ADAExport.openDocument(comunicado.titulo || "Comunicado institucional", cuerpo);
}

function exportarListadoComunicados() {
  if (!window.ADAExport) return;
  const fuente = ROLES_GESTION.includes(perfilActual?.rol) ? gestionComunicados : misComunicados;
  if (!fuente.length) return alert("No hay comunicados para exportar.");
  const filas = fuente.map(c => `<tr><td>${escapeHtml(c.titulo)}</td><td>${escapeHtml(c.tipo || "-")}</td><td>${escapeHtml(c.prioridad || "-")}</td><td>${formatearFecha(c.visible_desde)}</td><td>${escapeHtml(c.publicado ? "Publicado" : "Borrador")}</td></tr>`).join("");
  ADAExport.openDocument("Listado de comunicados", `<table><thead><tr><th>Título</th><th>Tipo</th><th>Prioridad</th><th>Desde</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table>`);
}

document.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]");
  if (!action) return;
  const id = action.dataset.id;
  if (action.dataset.action === "leer") marcarLeido(id);
  if (action.dataset.action === "publicacion") cambiarPublicacion(id, action.dataset.value === "true");
  if (action.dataset.action === "archivar") archivarComunicado(id);
  if (action.dataset.action === "exportar-comunicado") exportarComunicado(id);
});

qs("btnExportarComunicados")?.addEventListener("click", exportarListadoComunicados);

["filtroComunicados", "filtroPrioridad", "soloNoLeidos"].forEach(id => qs(id)?.addEventListener("input", renderMisComunicados));
["filtroGestion", "filtroEstadoGestion"].forEach(id => qs(id)?.addEventListener("input", renderGestion));

configurarTabs();
cargarBase();
