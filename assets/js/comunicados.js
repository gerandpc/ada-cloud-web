
const qs = (id) => document.getElementById(id);
let perfilActual = null;
let cursos = [];
let misComunicados = [];
let lecturas = [];

function getSelectedValues(select) {
  return Array.from(select.selectedOptions).map(o => o.value).filter(Boolean);
}

function configurarTabs() {
  document.querySelectorAll(".comms-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".comms-tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".comms-section").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
      qs("tab-" + btn.dataset.tab).classList.add("active");
    });
  });
}

function badge(text, cls="") {
  return `<span class="comms-badge ${cls}">${text || "-"}</span>`;
}

function prioridadClass(p) {
  if (p === "alta") return "comms-priority-alta";
  if (p === "baja") return "comms-priority-baja";
  return "comms-priority-media";
}

function tabla(headers, rows) {
  if (!rows.length) return "<p class='helper-text'>No hay datos para mostrar.</p>";
  return `<table class="ada-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

async function cargarBase() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;
  perfilActual = contexto.perfil;

  const hoy = new Date().toISOString().slice(0,10);
  qs("comDesde").value = hoy;

  const [cursosRes, totalRes, activosRes] = await Promise.all([
    supabaseClient.from("cursos").select("id,nombre").order("nombre"),
    supabaseClient.from("comunicados").select("id", { count: "exact", head: true }),
    supabaseClient.from("comunicados").select("id", { count: "exact", head: true }).eq("activo", true).eq("publicado", true)
  ]);

  cursos = cursosRes.data || [];
  qs("comCursos").innerHTML = cursos.map(c => `<option value="${c.id}">${c.nombre}</option>`).join("");

  qs("statTotal").textContent = totalRes.count || 0;
  qs("statActivos").textContent = activosRes.count || 0;

  if (!["admin","directivo","secretaria","preceptor"].includes(perfilActual.rol)) {
    document.querySelector('[data-tab="nuevo"]').style.display = "none";
    document.querySelector('[data-tab="gestion"]').style.display = "none";
  }

  await cargarMisComunicados();
  await cargarGestion();
}

async function cargarMisComunicados() {
  const [comRes, lectRes] = await Promise.all([
    supabaseClient.from("v_comunicados_habilitados").select("*").order("creado_en", { ascending:false }),
    supabaseClient.from("comunicado_lecturas").select("*").eq("usuario_id", perfilActual.id)
  ]);

  if (comRes.error) {
    qs("listaMisComunicados").innerHTML = `<p class="form-message">Error: ${comRes.error.message}</p>`;
    console.error(comRes.error);
    return;
  }

  misComunicados = comRes.data || [];
  lecturas = lectRes.data || [];
  const leidosIds = new Set(lecturas.map(l => l.comunicado_id));

  qs("statMios").textContent = misComunicados.length;
  qs("statLeidos").textContent = misComunicados.filter(c => leidosIds.has(c.id)).length;

  if (!misComunicados.length) {
    qs("listaMisComunicados").innerHTML = "<p class='helper-text'>No hay comunicados disponibles para tu perfil.</p>";
    return;
  }

  qs("listaMisComunicados").innerHTML = misComunicados.map(c => `
    <div class="comms-card">
      <h3>${c.titulo}</h3>
      <div class="comms-meta">
        ${badge(c.tipo)}
        ${badge(c.prioridad, prioridadClass(c.prioridad))}
        ${badge(leidosIds.has(c.id) ? "Leído" : "No leído")}
        ${c.visible_hasta ? badge("Hasta " + c.visible_hasta) : ""}
      </div>
      <p>${c.contenido}</p>
      <button class="btn-secondary" onclick="marcarLeido('${c.id}')">Marcar como leído</button>
    </div>
  `).join("");
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
    alert("Error al marcar lectura: " + error.message);
    console.error(error);
    return;
  }

  await cargarMisComunicados();
}

window.marcarLeido = marcarLeido;

async function cargarGestion() {
  if (!["admin","directivo","secretaria","preceptor"].includes(perfilActual.rol)) return;

  const { data, error } = await supabaseClient
    .from("comunicados")
    .select("*, profiles(nombre,apellido)")
    .order("creado_en", { ascending:false });

  if (error) {
    qs("tablaGestionComunicados").innerHTML = `<p class="form-message">Error: ${error.message}</p>`;
    console.error(error);
    return;
  }

  qs("tablaGestionComunicados").innerHTML = tabla(
    ["Título","Tipo","Prioridad","Publicado","Vigencia","Creado por"],
    (data || []).map(c => `
      <tr>
        <td><strong>${c.titulo}</strong><br><small>${c.contenido.slice(0,120)}${c.contenido.length > 120 ? "..." : ""}</small></td>
        <td>${c.tipo || "-"}</td>
        <td>${badge(c.prioridad, prioridadClass(c.prioridad))}</td>
        <td>${c.publicado ? "Sí" : "No"}</td>
        <td>${c.visible_desde || "-"} / ${c.visible_hasta || "sin fin"}</td>
        <td>${c.profiles?.apellido || ""}, ${c.profiles?.nombre || ""}</td>
      </tr>
    `)
  );
}

qs("formComunicado").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!["admin","directivo","secretaria","preceptor"].includes(perfilActual.rol)) {
    qs("msgComunicado").textContent = "No tenés permisos para crear comunicados.";
    return;
  }

  qs("msgComunicado").textContent = "Guardando comunicado...";

  const roles = getSelectedValues(qs("comRoles"));
  const cursosSel = getSelectedValues(qs("comCursos"));

  const payload = {
    titulo: qs("comTitulo").value.trim(),
    contenido: qs("comContenido").value.trim(),
    tipo: qs("comTipo").value,
    prioridad: qs("comPrioridad").value,
    visible_desde: qs("comDesde").value || null,
    visible_hasta: qs("comHasta").value || null,
    publicado: qs("comPublicado").checked,
    creado_por: perfilActual.id,
    activo: true
  };

  const { data: comunicado, error } = await supabaseClient
    .from("comunicados")
    .insert(payload)
    .select()
    .single();

  if (error) {
    qs("msgComunicado").textContent = "Error: " + error.message;
    console.error(error);
    return;
  }

  const inserts = [];

  if (roles.length) {
    inserts.push(supabaseClient.from("comunicado_roles").insert(roles.map(rol => ({ comunicado_id: comunicado.id, rol }))));
  }

  if (cursosSel.length) {
    inserts.push(supabaseClient.from("comunicado_cursos").insert(cursosSel.map(curso_id => ({ comunicado_id: comunicado.id, curso_id }))));
  }

  const results = await Promise.all(inserts);
  const relError = results.find(r => r.error)?.error;

  if (relError) {
    qs("msgComunicado").textContent = "Comunicado creado, pero hubo error en destinatarios: " + relError.message;
    console.error(relError);
    return;
  }

  qs("msgComunicado").textContent = "Comunicado publicado correctamente.";
  e.target.reset();
  qs("comDesde").value = new Date().toISOString().slice(0,10);

  await cargarMisComunicados();
  await cargarGestion();
});

configurarTabs();
cargarBase();
