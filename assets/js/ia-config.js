
const qs = (id) => document.getElementById(id);
let configId = null, perfilActual = null;

async function cargarIAConfig() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;
  perfilActual = contexto.perfil;

  const { data, error } = await supabaseClient.from("ia_configuracion").select("*").order("actualizado_en", { ascending: false }).limit(1).maybeSingle();
  if (error) { qs("iaConfigVista").innerHTML = `<p>Error: ${error.message}</p>`; console.error(error); return; }
  if (!data) { qs("iaConfigVista").innerHTML = "<p>No hay configuración creada.</p>"; return; }

  configId = data.id;
  qs("iaProveedor").value = data.proveedor || "OpenAI";
  qs("iaModelo").value = data.modelo || "";
  qs("iaInstrucciones").value = data.instrucciones_base || "";

  qs("iaConfigVista").innerHTML = `<div class="config-row"><strong>Proveedor</strong><span>${data.proveedor || "-"}</span></div><div class="config-row"><strong>Modelo sugerido</strong><span>${data.modelo || "-"}</span></div><div class="config-row"><strong>API key</strong><span>${data.api_key_configurada ? "<span class='status-ok'>Configurada en backend</span>" : "<span class='status-off'>Pendiente</span>"}</span></div><div class="config-row"><strong>Modo de respuesta</strong><span>${data.modo_respuesta || "-"}</span></div><div class="config-row"><strong>Instrucciones</strong><span>${data.instrucciones_base || "-"}</span></div>`;
}

qs("formIA").addEventListener("submit", async e => {
  e.preventDefault();

  if (perfilActual.rol !== "admin") {
    qs("msgIA").textContent = "Solo admin puede modificar esta configuración.";
    return;
  }

  const payload = {
    proveedor: qs("iaProveedor").value.trim() || "OpenAI",
    modelo: qs("iaModelo").value.trim(),
    instrucciones_base: qs("iaInstrucciones").value.trim(),
    actualizado_por: perfilActual.id,
    actualizado_en: new Date().toISOString()
  };

  const res = configId
    ? await supabaseClient.from("ia_configuracion").update(payload).eq("id", configId)
    : await supabaseClient.from("ia_configuracion").insert(payload);

  if (res.error) { qs("msgIA").textContent = "Error: " + res.error.message; console.error(res.error); return; }

  qs("msgIA").textContent = "Configuración guardada correctamente.";
  await cargarIAConfig();
});

cargarIAConfig();
