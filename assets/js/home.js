const hero = document.querySelector(".hero");
const slides = [...document.querySelectorAll(".hero-slide")];
const dots = [...document.querySelectorAll(".hero-dot")];
const prev = document.querySelector(".hero-arrow--prev");
const next = document.querySelector(".hero-arrow--next");
const counter = document.getElementById("hero-count");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const total = String(slides.length).padStart(2, "0");

if (hero && slides.length) {
  let index = 0;
  let timer = null;
  let startX = null;

  const setActive = (nextIndex) => {
    index = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle("is-active", i === index));
    dots.forEach((dot, i) => {
      const active = i === index;
      dot.classList.toggle("active", active);
      dot.setAttribute("aria-selected", active ? "true" : "false");
      dot.setAttribute("aria-current", active ? "true" : "false");
    });
    if (counter) counter.textContent = `${String(index + 1).padStart(2, "0")} / ${total}`;
  };

  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const start = () => {
    stop();
    if (reduceMotion || slides.length < 2) return;
    timer = setInterval(() => setActive(index + 1), 6500);
  };

  const go = (delta) => {
    setActive(index + delta);
    start();
  };

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      setActive(i);
      start();
    });
  });

  prev?.addEventListener("click", () => go(-1));
  next?.addEventListener("click", () => go(1));

  hero.addEventListener("mouseenter", stop);
  hero.addEventListener("mouseleave", start);
  hero.addEventListener("focusin", stop);
  hero.addEventListener("focusout", (event) => {
    if (!hero.contains(event.relatedTarget)) start();
  });

  hero.addEventListener("pointerdown", (event) => {
    if (event.target.closest("a, button")) return;
    startX = event.clientX;
  });

  hero.addEventListener("pointerup", (event) => {
    if (startX === null) return;
    const delta = event.clientX - startX;
    startX = null;
    if (Math.abs(delta) < 48) return;
    go(delta < 0 ? 1 : -1);
  });

  hero.addEventListener("pointercancel", () => {
    startX = null;
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  setActive(0);
  start();
}