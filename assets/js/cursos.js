let niveles = [];
let anios = [];
let divisiones = [];
let modalidades = [];
let cursos = [];
let institucionId = null;

function qs(id) {
  return document.getElementById(id);
}

function optionHtml(items, placeholder = "Seleccionar") {
  return `<option value="">${placeholder}</option>` + items.map(item => `<option value="${item.id}">${item.nombre}</option>`).join("");
}

function renderTable(containerId, headers, rows) {
  const container = qs(containerId);
  if (!rows || rows.length === 0) {
    container.innerHTML = "<p class='helper-text'>No hay registros cargados.</p>";
    return;
  }

  container.innerHTML = `
    <table class="ada-table">
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;
}

function configurarTabs() {
  document.querySelectorAll(".academic-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".academic-tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".academic-section").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
      qs("tab-" + btn.dataset.tab).classList.add("active");
    });
  });
}

async function cargarDatos() {
  await obtenerSesionPerfil();

  const inst = await supabaseClient.from("instituciones").select("id").limit(1).maybeSingle();
  institucionId = inst.data?.id || null;

  const [nivelesRes, aniosRes, divisionesRes, modalidadesRes, cursosRes] = await Promise.all([
    supabaseClient.from("niveles").select("*").order("orden", { ascending: true }),
    supabaseClient.from("anios_grados").select("*, niveles(nombre)").order("numero", { ascending: true }),
    supabaseClient.from("divisiones").select("*").order("nombre", { ascending: true }),
    supabaseClient.from("modalidades").select("*").order("nombre", { ascending: true }),
    supabaseClient.from("cursos").select("*, niveles(nombre), anios_grados(nombre), divisiones(nombre), modalidades(nombre)").order("nombre", { ascending: true })
  ]);

  for (const res of [nivelesRes, aniosRes, divisionesRes, modalidadesRes, cursosRes]) {
    if (res.error) {
      console.error(res.error);
      alert("Error al cargar estructura académica: " + res.error.message);
      return;
    }
  }

  niveles = nivelesRes.data || [];
  anios = aniosRes.data || [];
  divisiones = divisionesRes.data || [];
  modalidades = modalidadesRes.data || [];
  cursos = cursosRes.data || [];

  qs("countNiveles").textContent = niveles.length;
  qs("countAnios").textContent = anios.length;
  qs("countDivisiones").textContent = divisiones.length;
  qs("countCursos").textContent = cursos.length;

  llenarSelects();
  renderizarTablas();
}

function llenarSelects() {
  qs("anioNivel").innerHTML = optionHtml(niveles);
  qs("cursoNivel").innerHTML = optionHtml(niveles);
  qs("cursoDivision").innerHTML = optionHtml(divisiones);
  qs("cursoModalidad").innerHTML = optionHtml(modalidades, "Sin modalidad");

  actualizarAniosCurso();
}

function actualizarAniosCurso() {
  const nivelId = qs("cursoNivel").value;
  const filtrados = nivelId ? anios.filter(a => a.nivel_id === nivelId) : anios;
  qs("cursoAnio").innerHTML = optionHtml(filtrados);
}

function sugerirNombreCurso() {
  const nivel = niveles.find(n => n.id === qs("cursoNivel").value)?.nombre || "";
  const anio = anios.find(a => a.id === qs("cursoAnio").value)?.nombre || "";
  const division = divisiones.find(d => d.id === qs("cursoDivision").value)?.nombre || "";
  const modalidad = modalidades.find(m => m.id === qs("cursoModalidad").value)?.nombre || "";

  const partes = [anio, division ? division : "", modalidad ? `- ${modalidad}` : "", nivel ? `(${nivel})` : ""].filter(Boolean);
  qs("cursoNombre").value = partes.join(" ").replace(/\s+/g, " ").trim();
}

function renderizarTablas() {
  renderTable("tablaNiveles", ["Nombre", "Orden", "Descripción", "Estado"], niveles.map(n => `
    <tr><td>${n.nombre}</td><td>${n.orden ?? "-"}</td><td>${n.descripcion || "-"}</td><td>${n.activo ? "<span class='status-ok'>Activo</span>" : "<span class='status-off'>Inactivo</span>"}</td></tr>
  `));

  renderTable("tablaAnios", ["Nivel", "Año / grado", "Número", "Descripción"], anios.map(a => `
    <tr><td>${a.niveles?.nombre || "-"}</td><td>${a.nombre}</td><td>${a.numero ?? "-"}</td><td>${a.descripcion || "-"}</td></tr>
  `));

  renderTable("tablaDivisiones", ["División", "Descripción", "Estado"], divisiones.map(d => `
    <tr><td><span class="inline-badge">${d.nombre}</span></td><td>${d.descripcion || "-"}</td><td>${d.activo ? "<span class='status-ok'>Activa</span>" : "<span class='status-off'>Inactiva</span>"}</td></tr>
  `));

  renderTable("tablaModalidades", ["Modalidad", "Descripción", "Estado"], modalidades.map(m => `
    <tr><td>${m.nombre}</td><td>${m.descripcion || "-"}</td><td>${m.activo ? "<span class='status-ok'>Activa</span>" : "<span class='status-off'>Inactiva</span>"}</td></tr>
  `));

  renderTable("tablaCursos", ["Curso", "Nivel", "Año", "División", "Modalidad", "Turno"], cursos.map(c => `
    <tr>
      <td><strong>${c.nombre}</strong></td>
      <td>${c.niveles?.nombre || "-"}</td>
      <td>${c.anios_grados?.nombre || "-"}</td>
      <td>${c.divisiones?.nombre || "-"}</td>
      <td>${c.modalidades?.nombre || "-"}</td>
      <td>${c.turno || "-"}</td>
    </tr>
  `));
}

async function insertar(tabla, payload, msgId) {
  qs(msgId).textContent = "Guardando...";
  const { error } = await supabaseClient.from(tabla).insert(payload);
  if (error) {
    qs(msgId).textContent = "Error: " + error.message;
    console.error(error);
    return;
  }
  qs(msgId).textContent = "Guardado correctamente.";
  await cargarDatos();
}

function configurarForms() {
  qs("cursoNivel").addEventListener("change", () => {
    actualizarAniosCurso();
    sugerirNombreCurso();
  });
  ["cursoAnio", "cursoDivision", "cursoModalidad"].forEach(id => qs(id).addEventListener("change", sugerirNombreCurso));

  qs("formNivel").addEventListener("submit", async e => {
    e.preventDefault();
    await insertar("niveles", {
      nombre: qs("nivelNombre").value.trim(),
      descripcion: qs("nivelDescripcion").value.trim(),
      orden: qs("nivelOrden").value ? Number(qs("nivelOrden").value) : null
    }, "msgNivel");
    e.target.reset();
  });

  qs("formAnio").addEventListener("submit", async e => {
    e.preventDefault();
    await insertar("anios_grados", {
      nivel_id: qs("anioNivel").value,
      nombre: qs("anioNombre").value.trim(),
      numero: qs("anioNumero").value ? Number(qs("anioNumero").value) : null,
      descripcion: qs("anioDescripcion").value.trim()
    }, "msgAnio");
    e.target.reset();
  });

  qs("formDivision").addEventListener("submit", async e => {
    e.preventDefault();
    await insertar("divisiones", {
      nombre: qs("divisionNombre").value.trim().toUpperCase(),
      descripcion: qs("divisionDescripcion").value.trim()
    }, "msgDivision");
    e.target.reset();
  });

  qs("formModalidad").addEventListener("submit", async e => {
    e.preventDefault();
    await insertar("modalidades", {
      nombre: qs("modalidadNombre").value.trim(),
      descripcion: qs("modalidadDescripcion").value.trim()
    }, "msgModalidad");
    e.target.reset();
  });

  qs("formCurso").addEventListener("submit", async e => {
    e.preventDefault();
    await insertar("cursos", {
      institucion_id: institucionId,
      nivel_id: qs("cursoNivel").value,
      anio_grado_id: qs("cursoAnio").value,
      division_id: qs("cursoDivision").value,
      modalidad_id: qs("cursoModalidad").value || null,
      turno: qs("cursoTurno").value,
      nombre: qs("cursoNombre").value.trim()
    }, "msgCurso");
    e.target.reset();
  });
}

configurarTabs();
configurarForms();
cargarDatos();
