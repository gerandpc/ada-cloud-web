let materiasCursos = [];
let materias = [];

function materiaQs(id) {
  return document.getElementById(id);
}

function materiaEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function materiaOptionHtml(items, placeholder = "Seleccionar") {
  return `<option value="">${materiaEscape(placeholder)}</option>` + items.map(item => `<option value="${materiaEscape(item.id)}">${materiaEscape(item.nombre)}</option>`).join("");
}

async function cargarMaterias() {
  try {
    await obtenerSesionPerfil();

    const [cursosRes, materiasRes] = await Promise.all([
      supabaseClient.from("cursos").select("id, nombre").eq("activo", true).order("nombre", { ascending: true }),
      supabaseClient.from("materias").select("*, cursos(nombre)").order("nombre", { ascending: true })
    ]);

    if (cursosRes.error) throw cursosRes.error;
    if (materiasRes.error) throw materiasRes.error;

    materiasCursos = cursosRes.data || [];
    materias = materiasRes.data || [];

    materiaQs("materiaCurso").innerHTML = materiaOptionHtml(materiasCursos);
    renderizarMaterias();
  } catch (error) {
    console.warn("Carga de materias detenida:", error.message);
    if (materiaQs("msgMateria") && !window.ADA_ACCESS_DENIED) {
      materiaQs("msgMateria").textContent = "No fue posible cargar las materias. Volvé a intentarlo o verificá tu conexión.";
    }
  }
}

function renderizarMaterias() {
  const cont = materiaQs("tablaMaterias");
  if (!cont) return;

  if (!materias.length) {
    cont.innerHTML = "<p class='helper-text'>No hay materias cargadas.</p>";
    return;
  }

  cont.innerHTML = `
    <table class="ada-table">
      <thead>
        <tr>
          <th>Materia</th>
          <th>Curso</th>
          <th>Carga horaria</th>
          <th>Tipo</th>
          <th>Descripción</th>
        </tr>
      </thead>
      <tbody>
        ${materias.map(m => `
          <tr>
            <td><strong>${materiaEscape(m.nombre || "-")}</strong></td>
            <td>${materiaEscape(m.cursos?.nombre || "-")}</td>
            <td>${materiaEscape(m.carga_horaria_semanal ?? m.carga_horaria ?? "-")}</td>
            <td>${materiaEscape(m.tipo || "-")}</td>
            <td>${materiaEscape(m.descripcion || "-")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function guardarMateria(event) {
  event.preventDefault();

  const payload = {
    curso_id: materiaQs("materiaCurso").value,
    nombre: materiaQs("materiaNombre").value.trim(),
    tipo: materiaQs("materiaTipo").value || null,
    descripcion: materiaQs("materiaDescripcion").value.trim() || null,
    activo: true
  };

  const carga = materiaQs("materiaCarga").value;
  if (carga !== "") payload.carga_horaria_semanal = Number(carga);

  materiaQs("msgMateria").textContent = "Guardando...";
  const { error } = await supabaseClient.from("materias").insert(payload);

  if (error) {
    materiaQs("msgMateria").textContent = "No fue posible guardar la materia. Verificá los datos e intentá nuevamente.";
    return;
  }

  materiaQs("msgMateria").textContent = "Materia guardada correctamente.";
  event.target.reset();
  await cargarMaterias();
}

document.getElementById("formMateria")?.addEventListener("submit", guardarMateria);
cargarMaterias();
