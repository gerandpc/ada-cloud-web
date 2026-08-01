(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const state = { startedAt: performance.now() };

  function badge(id, text, status) {
    const el = $(id);
    if (!el) return;
    el.textContent = text;
    el.className = `status-badge ${status}`;
  }

  function detail(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  async function timed(label, fn) {
    const start = performance.now();
    try {
      const value = await fn();
      return { ok: true, value, ms: Math.round(performance.now() - start), label };
    } catch (error) {
      return { ok: false, error, ms: Math.round(performance.now() - start), label };
    }
  }

  async function checkInternet() {
    if (!navigator.onLine) return { ok: false, ms: 0, error: new Error("Sin conexión") };
    return { ok: true, ms: 0 };
  }

  async function checkAuthHealth() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      return await timed("auth", async () => {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
          headers: { apikey: SUPABASE_ANON_KEY }, cache: "no-store", signal: controller.signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json().catch(() => ({}));
      });
    } finally { clearTimeout(timer); }
  }

  async function checkSession() {
    return timed("session", async () => {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) throw error;
      return data.session;
    });
  }

  async function checkDatabase() {
    return timed("database", async () => {
      const { error, count } = await supabaseClient.from("profiles").select("id", { count: "exact", head: true });
      if (error) throw error;
      return count;
    });
  }

  function describeError(error) {
    const text = String(error?.message || error || "Error desconocido");
    if (/abort|timeout/i.test(text)) return "Tiempo de espera agotado";
    if (/503|paused/i.test(text)) return "El proyecto podría estar pausado";
    if (/fetch|network/i.test(text)) return "No se pudo conectar con el servicio";
    return text;
  }

  async function runChecks() {
    const button = $("runChecks");
    if (button) button.disabled = true;
    detail("lastCheck", new Date().toLocaleString("es-AR"));

    const internet = await checkInternet();
    badge("internetStatus", internet.ok ? "Disponible" : "Sin conexión", internet.ok ? "ok" : "error");
    detail("internetDetail", navigator.onLine ? "El navegador informa conexión activa." : "Conectá el dispositivo a Internet.");

    if (!window.supabaseClient) {
      ["authStatus", "sessionStatus", "databaseStatus"].forEach(id => badge(id, "No disponible", "error"));
      detail("authDetail", "No se cargó la configuración de Supabase.");
      if (button) button.disabled = false;
      return;
    }

    const auth = await checkAuthHealth();
    badge("authStatus", auth.ok ? "Operativo" : "Con error", auth.ok ? "ok" : "error");
    detail("authDetail", auth.ok ? `Respuesta en ${auth.ms} ms.` : describeError(auth.error));

    const session = await checkSession();
    badge("sessionStatus", session.ok && session.value ? "Activa" : "Sin sesión", session.ok ? "ok" : "error");
    detail("sessionDetail", session.ok && session.value ? `Usuario autenticado: ${session.value.user.email || session.value.user.id}` : "Volvé al portal e iniciá sesión.");

    const database = await checkDatabase();
    badge("databaseStatus", database.ok ? "Operativa" : "Restringida", database.ok ? "ok" : "warn");
    detail("databaseDetail", database.ok ? `Consulta completada en ${database.ms} ms.` : `${describeError(database.error)}. Puede deberse a permisos RLS.`);

    const allGood = internet.ok && auth.ok && session.ok && !!session.value;
    badge("overallStatus", allGood ? "ADA operativo" : "Requiere revisión", allGood ? "ok" : "warn");
    detail("overallDetail", allGood ? "Los servicios esenciales responden correctamente." : "Revisá los indicadores y las recomendaciones mostradas.");
    if (button) button.disabled = false;
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("runChecks")?.addEventListener("click", runChecks);
    window.addEventListener("online", runChecks);
    window.addEventListener("offline", runChecks);
    runChecks();
  });
})();
