import {
  loadData,
  escapeHtml,
  loadState,
  saveState,
  showLoadError
} from "./app.js";

const SITE_TO_SPOT = {
  2: "zhifangdi",
  4: "jinlou",
  7: "nilou",
  10: "yiyu",
  12: "niannsiyong",
  15: "houhuayuan"
};

const ROUTE_COVERS = {
  "visitor-classic": "zhifangdi",
  "architecture-focus": "jinlou",
  "garden-slow": "houhuayuan"
};

let data;
let state;

function spotForSite(siteNumber) {
  const id = SITE_TO_SPOT[siteNumber];
  return id ? data.spots.find((spot) => spot.id === id) : null;
}

function renderRoutes() {
  const target = document.getElementById("route-list");
  target.innerHTML = data.routes.map((route, index) => {
    const selected = state.routeId === route.id;
    const num = String(index + 1).padStart(2, "0");
    const firstSpot = data.spots.find((spot) => spot.id === ROUTE_COVERS[route.id])
      || route.points.map((point) => spotForSite(point.siteNumber)).find(Boolean)
      || data.spots[0];
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
          <p>${escapeHtml(route.theme)}</p>
          <p class="meta-line">${escapeHtml(route.duration)} · ${escapeHtml(route.verificationLabel)}</p>
          <ol class="route-steps">
            ${route.points.map((point) => {
              const spot = spotForSite(point.siteNumber);
              const name = spot
                ? `<a class="spot-name" href="guide.html#${escapeHtml(spot.id)}">${escapeHtml(point.name)}</a>`
                : `<span class="spot-name">${escapeHtml(point.name)}</span>`;
              const focus = spot
                ? escapeHtml(spot.lookFor)
                : "本版未收录独立资料页，现场以标识为准。";
              return `
                <li>
                  ${name}${spot ? "" : '<span class="route-missing">未收录</span>'}
                  <span class="focus">${focus}</span>
                </li>
              `;
            }).join("")}
          </ol>
          <div class="actions">
            <button class="btn small" type="button" data-select="${escapeHtml(route.id)}">${selected ? "已选为我的路线" : "选为我的路线"}</button>
          </div>
          ${selected ? `<div class="selected-note">已保存。去“观察与成果”完成题目，研学卡会显示这条路线。</div>` : ""}
          <p class="onsite-note">${escapeHtml(route.passageNotice)}</p>
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