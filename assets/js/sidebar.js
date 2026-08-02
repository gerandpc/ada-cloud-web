(function () {
  "use strict";

  function currentPage() {
    return (window.location.pathname.split("/").pop() || "dashboard.html").toLowerCase();
  }

  function pageFromHref(href) {
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return "";
    try {
      return (new URL(href, window.location.href).pathname.split("/").pop() || "").toLowerCase();
    } catch (_) {
      return (href.split("/").pop() || "").toLowerCase();
    }
  }

  function setSectionState(section, open) {
    if (!section) return;
    section.classList.toggle("open", open);
    const button = section.querySelector(":scope > .sidebar-section-button");
    const submenu = section.querySelector(":scope > .sidebar-submenu");
    if (button) button.setAttribute("aria-expanded", String(open));
    if (submenu) {
      submenu.hidden = !open;
      submenu.setAttribute("aria-hidden", String(!open));
    }
  }

  function markActiveLink(sidebar) {
    const page = currentPage();
    let active = null;
    sidebar.querySelectorAll("a[href]").forEach((link) => {
      const isActive = pageFromHref(link.getAttribute("href")) === page;
      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
        active = link;
      } else {
        link.removeAttribute("aria-current");
      }
    });
    return active;
  }

  function hideEmptySections(sidebar) {
    sidebar.querySelectorAll(".sidebar-section").forEach((section) => {
      const visibleLinks = [...section.querySelectorAll(".sidebar-submenu a")]
        .filter((link) => !link.hidden && link.getAttribute("aria-hidden") !== "true");
      section.hidden = visibleLinks.length === 0;
      if (section.hidden) setSectionState(section, false);
    });
  }

  function prepareSidebar(sidebar) {
    if (!sidebar || sidebar.dataset.adaAccordionReady === "1") return;
    sidebar.dataset.adaAccordionReady = "1";

    const activeLink = markActiveLink(sidebar);
    hideEmptySections(sidebar);

    sidebar.querySelectorAll(".sidebar-section").forEach((section, index) => {
      const button = section.querySelector(":scope > .sidebar-section-button");
      const submenu = section.querySelector(":scope > .sidebar-submenu");
      if (!button || !submenu) return;

      if (!submenu.id) submenu.id = `ada-sidebar-submenu-${index + 1}`;
      button.type = "button";
      button.setAttribute("aria-controls", submenu.id);
      button.setAttribute("aria-expanded", "false");
      setSectionState(section, false);
    });

    const activeSection = activeLink?.closest(".sidebar-section");
    if (activeSection && !activeSection.hidden) setSectionState(activeSection, true);

    sidebar.addEventListener("click", (event) => {
      const button = event.target.closest(".sidebar-section-button");
      if (!button || !sidebar.contains(button)) return;
      event.preventDefault();
      event.stopPropagation();
      const section = button.closest(".sidebar-section");
      if (!section || section.hidden) return;
      setSectionState(section, !section.classList.contains("open"));
    });

    sidebar.addEventListener("keydown", (event) => {
      const button = event.target.closest(".sidebar-section-button");
      if (!button || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      button.click();
    });
  }

  function prepareAll() {
    document.querySelectorAll(".sidebar").forEach(prepareSidebar);
  }

  document.addEventListener("DOMContentLoaded", prepareAll, { once: true });
  window.addEventListener("ada:role-applied", () => requestAnimationFrame(prepareAll));

  const observer = new MutationObserver(() => prepareAll());
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
