// ADA Cloud Web - Bloque 23
// Micro-interacciones visuales y helpers UI
(function(){
  function addAppearEffects(){
    const selectors = ".panel-card, .portal-card, .role-card, .report-stat, .comms-stat, .importer-stat, .excel-stat, .portal-item, .role-item, .comms-card";
    document.querySelectorAll(selectors).forEach((el, index) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      setTimeout(() => {
        el.style.transition = "all .32s ease";
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }, Math.min(index * 35, 400));
    });
  }

  function setActiveMenuLink(){
    const current = window.location.pathname.split("/").pop();
    document.querySelectorAll("a[href]").forEach(link => {
      const href = link.getAttribute("href");
      if (!href) return;
      if (href.endsWith(current)) link.classList.add("active");
    });
  }

  function improveTables(){
    document.querySelectorAll(".ada-table").forEach(table => {
      table.closest(".table-wrap")?.classList.add("ui-enhanced-table");
    });
  }

  function wireToast(){
    window.adaToast = function(message){
      const toast = document.createElement("div");
      toast.className = "ada-toast";
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
        setTimeout(() => toast.remove(), 250);
      }, 2400);
    }
  }

  function init(){
    addAppearEffects();
    setActiveMenuLink();
    improveTables();
    wireToast();
    document.body.classList.add("ui-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
