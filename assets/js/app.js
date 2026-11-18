const STORAGE_KEY = "jinlou-guide-v1";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

export async function loadData() {
  const res = await fetch("content/site.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`资料加载失败（${res.status}）`);
  return res.json();
}

export function sourceById(data, id) {
  return data.sources.find((item) => item.id === id);
}

export function sourceLink(data, id, label) {
  const source = sourceById(data, id);
  if (!source) return "";
  return `<a class="source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label || source.title)}</a>`;
}

export function sourceMeta(data, id) {
  const source = sourceById(data, id);
  if (!source) return "";
  return `<span>出处：${sourceLink(data, id)}</span><span>核对：${escapeHtml(source.reviewDate)}</span>`;
}

export function spotById(data, id) {
  return data.spots.find((spot) => spot.id === id);
}

export function routeById(data, id) {
  return data.routes.find((route) => route.id === id);
}

export function emptyState() {
  return {
    nickname: "",
    routeId: null,
    observations: {},
    quiz: {},
    updatedAt: null
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      ...emptyState(),
      ...parsed,
      observations: parsed.observations && typeof parsed.observations === "object" ? parsed.observations : {},
      quiz: parsed.quiz && typeof parsed.quiz === "object" ? parsed.quiz : {}
    };
  } catch {
    return emptyState();
  }
}

export function saveState(state) {
  state.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 浏览器隐私模式或存储被禁用时，页面内进度仍可用，只是刷新后不保留。
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 同上，存储不可用时无需中断页面操作。
  }
}

export function completedObservations(data, state) {
  return data.spots.filter((spot) => isObservationDone(spot, state));
}

export function isObservationDone(spot, state) {
  const value = state.observations[spot.task.id];
  return typeof value === "number" && value === spot.task.answer;
}

export function quizScore(data, state) {
  let answered = 0;
  let correct = 0;
  for (const item of data.quiz) {
    const value = state.quiz[item.id];
    if (typeof value === "number") {
      answered += 1;
      if (value === item.answer) correct += 1;
    }
  }
  return { answered, correct, total: data.quiz.length };
}

export function formatDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function setActiveNav() {
  const file = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".site-nav a").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === file || (file === "" && href === "index.html")) {
      link.setAttribute("aria-current", "page");
    }
  });
}

export function renderSourceList(data, target) {
  if (!target) return;
  target.innerHTML = data.sources.map((source) => `
    <li>
      <span class="src-title">${escapeHtml(source.title)}</span>
      <span class="src-meta">${escapeHtml(source.publisher)} · 发布 ${escapeHtml(source.date)} · 核对 ${escapeHtml(source.reviewDate)}</span>
      <a class="source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">打开原文</a>
    </li>
  `).join("");
}

export function showLoadError(error) {
  const main = document.querySelector("main");
  if (!main) return;
  const box = document.createElement("div");
  box.className = "card";
  box.innerHTML = `<h2>资料没有加载出来</h2>
    <p>${escapeHtml(error.message || "未知错误")}</p>
    <p class="meta-line">如果是直接双击打开 HTML 文件，请改用本地静态服务器访问，例如在项目目录运行 <code>python -m http.server 8000</code>，再打开 http://localhost:8000/。</p>`;
  main.prepend(box);
}

document.addEventListener("DOMContentLoaded", () => {
  setActiveNav();
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
});