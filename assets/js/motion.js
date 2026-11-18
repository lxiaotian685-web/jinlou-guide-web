const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealSelector = [
  ".page-head",
  ".section-head",
  ".intro-card",
  ".steps li",
  ".entry",
  ".timeline li",
  ".spot",
  ".route-card",
  ".task",
  ".quiz-q",
  ".answer-card",
  ".card.ticks"
].join(",");

let observer;

function ensureObserver() {
  if (observer) return observer;
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  return observer;
}

function refresh(root = document) {
  if (reduceMotion) return;
  document.documentElement.classList.add("motion-ready");
  ensureObserver();
  root.querySelectorAll(revealSelector).forEach((el, index) => {
    if (el.dataset.reveal) return;
    el.dataset.reveal = "1";
    el.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 55}ms`);
    if (el.getBoundingClientRect().top < window.innerHeight * 0.96) {
      el.classList.add("is-visible");
    } else {
      observer.observe(el);
    }
  });
}

function init() {
  refresh();
}

window.MotionReveal = { refresh };
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}