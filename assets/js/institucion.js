"use strict";

const formInstitucion = document.getElementById("formInstitucion");
const mensajeInstitucion = document.getElementById("mensajeInstitucion");
const nombreInput = document.getElementById("nombre");
const descripcionInput = document.getElementById("descripcion");
const nivelInput = document.getElementById("nivel");
const gestionInput = document.getElementById("gestion");
const localidadInput = document.getElementById("localidad");
const provinciaInput = document.getElementById("provincia");
const exportarInstitucionBtn = document.getElementById("exportarInstitucionBtn");

let institucionActualId = null;
let institucionActual = null;
let contextoInstitucion = null;

function texto(valor, alternativo = "-") {
  const limpio = String(valor ?? "").trim();
  return limpio || alternativo;
}

function mostrarMensaje(textoMensaje, tipo = "") {
  if (!mensajeInstitucion) return;
  mensajeInstitucion.textContent = textoMensaje;
  mensajeInstitucion.className = `form-message${tipo ? ` ${tipo}` : ""}`;
}

function crearFila(etiqueta, valor, valorHtml = null) {
  const tr = document.createElement("tr");
  const th = document.createElement("th");
  const td = document.createElement("td");
  th.textContent = etiqueta;
  if (valorHtml instanceof Node) td.appendChild(valorHtml);
  else td.textContent = texto(valor);
  tr.append(th, td);
  return tr;
}

function renderInstitucion(data) {
  let contenedor = document.getElementById("vistaInstitucion");
  if (!contenedor) {
    contenedor = document.createElement("section");
    contenedor.id = "vistaInstitucion";
    contenedor.className = "panel-card";
    formInstitucion.insertAdjacentElement("afterend", contenedor);
  }

  contenedor.replaceChildren();
  const titulo = document.createElement("h2");
  titulo.textContent = "Ficha institucional";

  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  const table = document.createElement("table");
  table.className = "ada-table";
  const tbody = document.createElement("tbody");

  tbody.append(
    crearFila("Nombre", data.nombre),
    crearFila("Nivel", data.nivel),
    crearFila("Gestión", data.gestion),
    crearFila("Localidad", data.localidad),
    crearFila("Provincia", data.provincia),
    crearFila("Descripción", data.descripcion)
  );

  const estado = document.createElement("span");
  estado.className = data.activo ? "status-ok" : "status-off";
  estado.textContent = data.activo ? "Activa" : "Inactiva";
  tbody.appendChild(crearFila("Estado", "", estado));

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  contenedor.append(titulo, tableWrap);
}

function configurarEdicionPorRol() {
  const rol = contextoInstitucion?.perfil?.rol;
  const puedeEditar = ["admin", "directivo"].includes(rol);
  formInstitucion.querySelectorAll("input, select, textarea, button[type='submit']").forEach((control) => {
    control.disabled = !puedeEditar;
  });

  const ayuda = document.getElementById("ayudaInstitucion");
  if (ayuda) {
    ayuda.textContent = puedeEditar
      ? "Actualizá los datos generales que identifican a la institución."
      : "Consulta de datos institucionales. La edición está reservada a Administración y Dirección.";
  }
}

function exportarInstitucion() {
  if (!institucionActual) {
    alert("No hay información institucional cargada para exportar.");
    return;
  }
  if (!window.ADAExport?.openDocument) {
    alert("No se pudo iniciar la generación del documento.");
    return;
  }

  const esc = (valor) => String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[caracter]));
  const fila = (etiqueta, valor) => `<tr><th>${esc(etiqueta)}</th><td>${esc(texto(valor))}</td></tr>`;
  const cuerpo = `<table>
    ${fila("Nombre", institucionActual.nombre)}
    ${fila("Nivel educativo", institucionActual.nivel)}
    ${fila("Tipo de gestión", institucionActual.gestion)}
    ${fila("Localidad", institucionActual.localidad)}
    ${fila("Provincia", institucionActual.provincia)}
    ${fila("Descripción institucional", institucionActual.descripcion)}
    ${fila("Estado", institucionActual.activo ? "Activa" : "Inactiva")}
  </table>`;

  window.ADAExport.openDocument("Ficha institucional", cuerpo);
}

async function cargarInstitucion() {
  try {
    contextoInstitucion = await obtenerSesionPerfil();
    if (!contextoInstitucion) return;
    configurarEdicionPorRol();

    mostrarMensaje("Cargando información institucional...");
    const { data, error } = await supabaseClient
      .from("instituciones")
      .select("id,nombre,descripcion,nivel,gestion,localidad,provincia,activo,creado_en")
      .order("creado_en", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      mostrarMensaje("No hay una institución configurada.", "warning");
      exportarInstitucionBtn?.setAttribute("disabled", "disabled");
      return;
    }

    institucionActual = data;
    institucionActualId = data.id;
    nombreInput.value = data.nombre || "";
    descripcionInput.value = data.descripcion || "";
    nivelInput.value = data.nivel || "";
    gestionInput.value = data.gestion || "";
    localidadInput.value = data.localidad || "";
    provinciaInput.value = data.provincia || "";

    mostrarMensaje("Información institucional actualizada.", "success");
    exportarInstitucionBtn?.removeAttribute("disabled");
    renderInstitucion(data);
  } catch (error) {
    console.error("No se pudo cargar la institución", error);
    mostrarMensaje("No se pudo cargar la información institucional. Intentá nuevamente.", "error");
  }
}

formInstitucion?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const rol = contextoInstitucion?.perfil?.rol;
  if (!["admin", "directivo"].includes(rol)) {
    mostrarMensaje("No tenés permisos para modificar la institución.", "error");
    return;
  }

  const nombre = nombreInput.value.trim();
  if (nombre.length < 3) {
    mostrarMensaje("Ingresá un nombre institucional válido.", "error");
    nombreInput.focus();
    return;
  }

  const payload = {
    nombre,
    descripcion: descripcionInput.value.trim(),
    nivel: nivelInput.value.trim(),
    gestion: gestionInput.value.trim(),
    localidad: localidadInput.value.trim(),
    provincia: provinciaInput.value.trim(),
    activo: true
  };

  try {
    mostrarMensaje("Guardando información institucional...");
    const consulta = institucionActualId
      ? supabaseClient.from("instituciones").update(payload).eq("id", institucionActualId)
      : supabaseClient.from("instituciones").insert(payload);
    const { data, error } = await consulta.select().single();
    if (error) throw error;

    institucionActualId = data.id;
    institucionActual = data;
    mostrarMensaje("Información institucional guardada correctamente.", "success");
    exportarInstitucionBtn?.removeAttribute("disabled");
    renderInstitucion(data);
  } catch (error) {
    console.error("No se pudo guardar la institución", error);
    mostrarMensaje("No se pudo guardar la información institucional. Revisá los datos e intentá nuevamente.", "error");
  }
});

exportarInstitucionBtn?.addEventListener("click", exportarInstitucion);

document.addEventListener("DOMContentLoaded", cargarInstitucion);
