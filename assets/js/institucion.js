const formInstitucion = document.getElementById("formInstitucion");
const mensajeInstitucion = document.getElementById("mensajeInstitucion");
const nombreInput = document.getElementById("nombre");
const descripcionInput = document.getElementById("descripcion");
const nivelInput = document.getElementById("nivel");
const gestionInput = document.getElementById("gestion");
const localidadInput = document.getElementById("localidad");
const provinciaInput = document.getElementById("provincia");

let institucionActualId = null;

async function cargarInstitucion() {
  await obtenerSesionPerfil();

  const { data, error } = await supabaseClient
    .from("instituciones")
    .select("*")
    .order("creado_en", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    mensajeInstitucion.textContent = "Error al cargar institución: " + error.message;
    console.error(error);
    return;
  }

  if (!data) {
    mensajeInstitucion.textContent = "Todavía no hay institución cargada. Completá el formulario y guardá.";
    return;
  }

  institucionActualId = data.id;
  nombreInput.value = data.nombre || "";
  descripcionInput.value = data.descripcion || "";
  nivelInput.value = data.nivel || "";
  gestionInput.value = data.gestion || "";
  localidadInput.value = data.localidad || "";
  provinciaInput.value = data.provincia || "";
  mensajeInstitucion.textContent = "Institución cargada.";
}

formInstitucion.addEventListener("submit", async (event) => {
  event.preventDefault();

  mensajeInstitucion.textContent = "Guardando...";

  const payload = {
    nombre: nombreInput.value.trim(),
    descripcion: descripcionInput.value.trim(),
    nivel: nivelInput.value.trim(),
    gestion: gestionInput.value.trim(),
    localidad: localidadInput.value.trim(),
    provincia: provinciaInput.value.trim(),
    activo: true
  };

  let response;

  if (institucionActualId) {
    response = await supabaseClient
      .from("instituciones")
      .update(payload)
      .eq("id", institucionActualId)
      .select()
      .single();
  } else {
    response = await supabaseClient
      .from("instituciones")
      .insert(payload)
      .select()
      .single();
  }

  if (response.error) {
    mensajeInstitucion.textContent = "Error al guardar: " + response.error.message;
    console.error(response.error);
    return;
  }

  institucionActualId = response.data.id;
  mensajeInstitucion.textContent = "Institución guardada correctamente.";
});

cargarInstitucion();
