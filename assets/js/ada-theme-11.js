(() => {
  "use strict";
  const KEY = "ada-color-theme";
  const root = document.documentElement;

  function resolveTheme() {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    root.dataset.adaTheme = theme;
    const btn = document.querySelector(".ada-global-theme-toggle");
    if (btn) {
      btn.textContent = theme === "dark" ? "☀" : "☾";
      btn.setAttribute("aria-label", theme === "dark" ? "Activar modo claro" : "Activar modo oscuro");
      btn.setAttribute("title", btn.getAttribute("aria-label"));
    }
    const color = theme === "dark" ? "#0a0a17" : "#f7f5ff";
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
    meta.content = color;
  }

  function installToggle() {
    if (document.querySelector(".ada-global-theme-toggle")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ada-global-theme-toggle no-print";
    btn.addEventListener("click", () => {
      const next = root.dataset.adaTheme === "dark" ? "light" : "dark";
      localStorage.setItem(KEY, next);
      applyTheme(next);
    });
    document.body.appendChild(btn);
    applyTheme(resolveTheme());
  }

  function normalizeFloatingActions() {
    document.querySelectorAll(".ada-final-utilities,.ada-help-fab,.ada-logo-fab").forEach(el => el.remove());

    const help = document.createElement("a");
    help.className = "ada-help-fab no-print";
    help.href = "ayuda.html";
    help.textContent = "?";
    help.setAttribute("aria-label", "Ayuda");
    help.title = "Ayuda";
    document.body.appendChild(help);

    const existingChat = document.querySelector("#btnAdaIA,.chatbot-button");
    if (existingChat) {
      existingChat.classList.add("ada-floating-logo", "no-print");
      existingChat.innerHTML = '<img src="../assets/img/ada-logo.jpg" alt="Ada">';
      existingChat.setAttribute("aria-label", "Abrir ADA IA");
      existingChat.title = "Abrir ADA IA";
      document.querySelectorAll("#btnAdaIA,.chatbot-button").forEach((el, index) => { if (index > 0) el.remove(); });
      return;
    }

    const logo = document.createElement("a");
    logo.className = "ada-logo-fab no-print";
    logo.href = "ia.html";
    logo.setAttribute("aria-label", "Abrir ADA IA");
    logo.title = "Abrir ADA IA";
    logo.innerHTML = '<img src="../assets/img/ada-logo.jpg" alt="Ada">';
    document.body.appendChild(logo);
  }

  function run() {
    applyTheme(resolveTheme());
    installToggle();
    normalizeFloatingActions();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, {once:true});
  else run();
  window.addEventListener("ada:role-applied", () => setTimeout(normalizeFloatingActions, 30));
})();
