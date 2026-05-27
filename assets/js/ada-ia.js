
const aiStatus = document.getElementById("aiStatus");
const docContextList = document.getElementById("docContextList");
const aiMessages = document.getElementById("aiMessages");
const aiForm = document.getElementById("aiForm");
const aiQuestion = document.getElementById("aiQuestion");

let perfilActual = null;
let documentosIA = [];
let conversacionId = null;
let apiKeyConfigurada = false;

function addMessage(role, text) {
  const div = document.createElement("div");
  div.className = `ai-message ${role}`;
  div.innerHTML = `<small>${role === "user" ? "Vos" : "ADA IA"}</small>${text}`;
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
}

async function cargarConfiguracionIA() {
  const { data, error } = await supabaseClient
    .from("ia_configuracion")
    .select("*")
    .order("actualizado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    aiStatus.textContent = "No se pudo cargar configuración IA.";
    console.error(error);
    return;
  }

  apiKeyConfigurada = Boolean(data?.api_key_configurada);

  if (apiKeyConfigurada) {
    aiStatus.classList.add("ai-ready");
    aiStatus.textContent = `IA configurada. Modelo sugerido: ${data.modelo || "sin definir"}.`;
  } else {
    aiStatus.classList.remove("ai-ready");
    aiStatus.textContent = "API key pendiente. ADA IA queda preparada, pero aún responde en modo simulación segura.";
  }
}

async function cargarDocumentosIA() {
  const { data, error } = await supabaseClient
    .from("documentos")
    .select("id, titulo, descripcion, tipo_documento, puede_usarse_ia, storage_path, url_archivo")
    .eq("puede_usarse_ia", true)
    .order("creado_en", { ascending: false });

  if (error) {
    docContextList.innerHTML = `<p class="form-message">Error: ${error.message}</p>`;
    console.error(error);
    return;
  }

  documentosIA = data || [];

  if (documentosIA.length === 0) {
    docContextList.innerHTML = "<p class='helper-text'>No hay documentos habilitados para IA en tu perfil.</p>";
    return;
  }

  docContextList.innerHTML = documentosIA.map(d => `
    <div class="context-doc">
      <strong>${d.titulo}</strong>
      <small>${d.tipo_documento || "Documento"} · ${d.descripcion || ""}</small>
    </div>
  `).join("");
}

async function crearConversacionSiNoExiste() {
  if (conversacionId) return conversacionId;

  const { data, error } = await supabaseClient
    .from("ia_conversaciones")
    .insert({
      usuario_id: perfilActual.id,
      titulo: "Conversación ADA IA",
      contexto_tipo: "documentos_habilitados"
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  conversacionId = data.id;
  return conversacionId;
}

async function guardarMensaje(role, contenido) {
  const convId = await crearConversacionSiNoExiste();
  if (!convId) return;

  await supabaseClient
    .from("ia_mensajes")
    .insert({
      conversacion_id: convId,
      usuario_id: perfilActual.id,
      rol_mensaje: role,
      contenido
    });
}

function respuestaSimulada(question) {
  if (documentosIA.length === 0) {
    return "Todavía no tengo documentos habilitados para IA en tu perfil. Cuando se carguen documentos marcados como “Usable por ADA IA”, voy a poder usarlos como contexto.";
  }

  const lista = documentosIA.slice(0, 5).map(d => `• ${d.titulo}`).join("<br>");

  return `
    <p><strong>Modo simulación segura:</strong> la API key todavía no está conectada.</p>
    <p>Cuando se active la API desde Supabase Edge Functions, responderé usando solo los documentos habilitados para tu rol, curso o materia.</p>
    <p><strong>Documentos actualmente disponibles para contexto:</strong><br>${lista}</p>
    <p><strong>Tu pregunta registrada:</strong> ${question}</p>
  `;
}

aiForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = aiQuestion.value.trim();
  if (!question) return;

  addMessage("user", question);
  await guardarMensaje("user", question);
  aiQuestion.value = "";

  let answer;

  if (!apiKeyConfigurada) {
    answer = respuestaSimulada(question);
  } else {
    answer = "La API key figura como configurada, pero la Edge Function final de OpenAI todavía no fue conectada en este bloque.";
  }

  addMessage("assistant", answer);
  await guardarMensaje("assistant", answer.replace(/<[^>]+>/g, ""));
});

async function inicializarIA() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;

  perfilActual = contexto.perfil;

  addMessage("assistant", "Hola, soy ADA IA. Estoy preparada para trabajar con documentos habilitados y permisos por rol. Por ahora funciono en modo simulación hasta conectar la API key segura.");
  await cargarConfiguracionIA();
  await cargarDocumentosIA();
}

inicializarIA();
