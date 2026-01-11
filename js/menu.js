// =====================================================
// MENU ACTIF AU SCROLL
// =====================================================

const sections = document.querySelectorAll("section");
const menuLinks = document.querySelectorAll(".menu-link");

function setActiveMenu() {
  let currentSectionId = "";

  sections.forEach((section) => {
    const sectionTop = section.offsetTop - 120; // marge menu
    if (window.scrollY >= sectionTop) {
      currentSectionId = section.getAttribute("id");
    }
  });

  menuLinks.forEach((link) => {
    link.classList.remove("active");

    if (link.getAttribute("href") === `#${currentSectionId}`) {
      link.classList.add("active");
    }
  });
}

window.addEventListener("scroll", setActiveMenu);
window.addEventListener("load", setActiveMenu);

// =====================================================
// MENU RESPONSIVE (HAMBURGER)
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector(".menu-links");

  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    menu.classList.toggle("open");
  });

  // Fermer le menu après clic sur un lien (mobile UX)
  document.querySelectorAll(".menu-link").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("open");
    });
  });
});
