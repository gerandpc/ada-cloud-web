
// ADA Cloud Web - UI Effects
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
      if (href && href.endsWith(current)) link.classList.add("active");
    });
  }

  function init(){
    addAppearEffects();
    setActiveMenuLink();
    document.body.classList.add("ui-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
