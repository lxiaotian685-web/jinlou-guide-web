import {
  loadData,
  escapeHtml,
  spotById,
  loadState,
  saveState,
  showLoadError
} from "./app.js";

let data;
let state;

function renderRoutes() {
  const target = document.getElementById("route-list");
  target.innerHTML = data.routes.map((route, index) => {
    const selected = state.routeId === route.id;
    const firstSpot = spotById(data, route.steps[0].spotId);
    const num = String(index + 1).padStart(2, "0");
    return `
      <article class="card ticks route-card" data-route="${escapeHtml(route.id)}">
        <div class="route-cover">
          <img src="${escapeHtml(firstSpot.image.src)}" alt="${escapeHtml(firstSpot.image.alt)}" loading="lazy">
        </div>
        <div class="route-body">
          <div class="route-meta">
            <span class="eyebrow">${escapeHtml(route.audience)}</span>
            <span class="route-mark">ROUTE / ${num}</span>
          </div>
          <h2>${escapeHtml(route.name)}</h2>
          <p>${escapeHtml(route.intro)}</p>
          <p class="meta-line">${escapeHtml(route.duration)}</p>
          <ol class="route-steps">
            ${route.steps.map((step) => {
              const spot = spotById(data, step.spotId);
              return `
                <li>
                  <a class="spot-name" href="guide.html#${escapeHtml(spot.id)}">${escapeHtml(spot.name)}</a>
                  <span class="focus">${escapeHtml(step.focus)}</span>
                </li>
              `;
            }).join("")}
          </ol>
          <div class="actions">
            <button class="btn small" type="button" data-select="${escapeHtml(route.id)}">${selected ? "已选为我的路线" : "选为我的路线"}</button>
          </div>
          ${selected ? `<div class="selected-note">已保存。去“观察与成果”完成题目，研学卡会显示这条路线。</div>` : ""}
        </div>
      </article>
    `;
  }).join("");
  updateCurrent();
  window.MotionReveal?.refresh();
}

function updateCurrent() {
  const el = document.getElementById("current-route");
  const route = data.routes.find((item) => item.id === state.routeId);
  el.textContent = route ? `${route.name}（可随时更换）` : "还没有选择路线";
}

function selectRoute(routeId) {
  state.routeId = routeId;
  saveState(state);
  renderRoutes();
}

async function init() {
  try {
    data = await loadData();
    state = loadState();
    renderRoutes();
    document.getElementById("route-list").addEventListener("click", (event) => {
      const button = event.target.closest("[data-select]");
      if (!button) return;
      selectRoute(button.dataset.select);
    });
  } catch (error) {
    showLoadError(error);
  }
}

init();