/* =========================================================
   ARTECH Animation Only
   Chỉ thêm class hiệu ứng khi cuộn, không đổi nội dung HTML.
   ========================================================= */
(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.add("artech-anim-ready");

  const revealSelectors = [
    ".section .head",
    ".section-head",
    ".hero-photo",
    ".hero-side-cards article",
    ".hero-stats article",
    ".feature-card",
    ".info-card",
    ".value-card",
    ".app-card",
    ".eventbot-card",
    ".process-grid article",
    ".price-card",
    ".faq-item",
    ".contact-card",
    ".product-card",
    ".service-card",
    ".project-card",
    ".news-card",
    ".article-card",
    ".stat-card",
    ".cap-card",
    ".spec-grid article",
    ".feature-strip article",
    ".bottom-box",
    ".robot-info-box",
    ".gallery-card",
    ".logo-card",
    ".vision-box",
    ".about-card",
    ".form",
    ".footer-col"
  ];

  const items = Array.from(document.querySelectorAll(revealSelectors.join(",")))
    .filter((el, index, arr) => arr.indexOf(el) === index);

  items.forEach((el, index) => {
    el.classList.add("anim-reveal");
    el.style.setProperty("--anim-delay", `${Math.min(index % 8, 7) * 55}ms`);
  });

  if (!("IntersectionObserver" in window)) {
    items.forEach(el => el.classList.add("anim-in"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("anim-in");
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: "0px 0px -8% 0px"
  });

  items.forEach(el => observer.observe(el));
})();

