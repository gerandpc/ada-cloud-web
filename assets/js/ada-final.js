(() => {
  "use strict";

  const VERSION = "1.0.0";
  const DEV_PATTERNS = [
    /\bac[aá]\s+va\b/i,
    /\bplaceholder\b/i,
    /\bmodo\s+demo\b/i,
    /\bpr[oó]ximamente\b/i,
    /\ben\s+construcci[oó]n\b/i,
    /\bbloque\s+\d+\b/i,
    /\bTODO\b/i,
    /\bFIXME\b/i
  ];

  function cleanVisibleDevelopmentText(root = document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"].includes(parent.tagName)) return;
      const value = (node.nodeValue || "").trim();
      if (!value) return;
      if (DEV_PATTERNS.some((rx) => rx.test(value))) {
        const container = parent.closest(".helper-text,.empty-state,.notice,.alert,.panel-card,p,small");
        if (container && container.textContent.trim() === value) container.remove();
      }
    });
  }

  function ensureButtonsAreTyped() {
    document.querySelectorAll("button:not([type])").forEach((btn) => btn.setAttribute("type", "button"));
  }

  function markExternalLinks() {
    document.querySelectorAll('a[href^="http://"],a[href^="https://"]').forEach((a) => {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    });
  }

  function improveTables() {
    document.querySelectorAll("table").forEach((table) => {
      if (table.closest(".ada-table-scroll")) return;
      const wrap = document.createElement("div");
      wrap.className = "ada-table-scroll";
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  function installNetworkStatus() {
    let banner = document.querySelector(".ada-network-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.className = "ada-network-banner";
      banner.setAttribute("role", "status");
      banner.setAttribute("aria-live", "polite");
      document.body.appendChild(banner);
    }
    const update = () => {
      const offline = !navigator.onLine;
      banner.textContent = offline ? "Sin conexión. Algunas funciones no estarán disponibles." : "Conexión restablecida.";
      banner.classList.toggle("is-visible", offline);
      if (!offline) {
        banner.classList.add("is-success");
        setTimeout(() => banner.classList.remove("is-visible", "is-success"), 2200);
      }
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if (!navigator.onLine) update();
  }

  function installErrorBoundary() {
    window.addEventListener("error", (event) => {
      console.error("[ADA 1.0] Error de interfaz:", event.error || event.message);
    });
    window.addEventListener("unhandledrejection", (event) => {
      console.error("[ADA 1.0] Operación rechazada:", event.reason);
    });
  }

  function injectUtilityBar() {
    // Las acciones flotantes se administran de forma centralizada en ada-theme-11.js.
    document.querySelectorAll(".ada-final-utilities").forEach((node) => node.remove());
  }

  function addVersionMeta() {
    document.documentElement.dataset.adaVersion = VERSION;
    let meta = document.querySelector('meta[name="ada-version"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "ada-version";
      document.head.appendChild(meta);
    }
    meta.content = VERSION;
  }

  function run() {
    addVersionMeta();
    cleanVisibleDevelopmentText();
    ensureButtonsAreTyped();
    markExternalLinks();
    improveTables();
    installNetworkStatus();
    installErrorBoundary();
    injectUtilityBar();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();

  window.ADA_FINAL = { version: VERSION, cleanVisibleDevelopmentText, improveTables };
})();
