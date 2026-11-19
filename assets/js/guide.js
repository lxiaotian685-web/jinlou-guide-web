import {
  loadData,
  escapeHtml,
  sourceById,
  sourceLink,
  renderSourceList,
  loadState,
  saveState,
  showLoadError
} from "./app.js";

function renderTimeline(data) {
  const target = document.getElementById("timeline");
  target.innerHTML = data.timeline.map((item) => {
    const ids = item.sourceIds || [item.sourceId];
    const links = ids
      .map((id) => sourceLink(data, id, sourceById(data, id)?.title || "出处"))
      .join("、");
    return `
      <li>
        <time>${escapeHtml(item.time)}</time>
        <p>${escapeHtml(item.text)} 出处：${links}</p>
      </li>
    `;
  }).join("");
}

function galleryTemplate(spot) {
  if (!spot.gallery || !spot.gallery.length) return "";
  return `
    <div class="gallery">
      ${spot.gallery.map((image) => `
        <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" loading="lazy">
      `).join("")}
    </div>
  `;
}

function audioTemplate(spot, data) {
  if (!spot.audio || !spot.audio.length) {
    return `
      <div class="audio-block audio-empty">
        <div class="audio-head">
          <span class="eyebrow">AUDIO / 讲解</span>
          <span class="audio-note">本点位暂无音频素材</span>
        </div>
      </div>
    `;
  }
  return `
    <details class="audio-block">
      <summary>
        <span class="eyebrow">AUDIO / 讲解</span>
        <span class="audio-note">${spot.audio.length} 段 · 含讲解稿 · 点击展开</span>
      </summary>
      <div class="audio-body">
        ${spot.audio.map((track) => `
          <div class="audio-row">
            <span class="audio-label">${escapeHtml(track.label)}</span>
            <audio controls preload="none" src="${escapeHtml(track.src)}" aria-label="${escapeHtml(track.label)}讲解音频"></audio>
            ${track.transcript ? `
              <details class="audio-transcript">
                <summary>讲解稿</summary>
                <p>${escapeHtml(track.transcript)}</p>
              </details>
            ` : ""}
          </div>
        `).join("")}
        <p class="onsite-note">${escapeHtml(data.meta.audioNotice)}</p>
      </div>
    </details>
  `;
}

function bindAudioTranscripts() {
  document.querySelectorAll("#spot-list audio").forEach((audio) => {
    audio.addEventListener("play", () => {
      const row = audio.closest(".audio-row");
      if (!row) return;
      document.querySelectorAll("#spot-list .audio-row.is-playing").forEach((item) => {
        if (item !== row) item.classList.remove("is-playing");
      });
      row.classList.add("is-playing");
      row.querySelector(".audio-transcript")?.setAttribute("open", "");
    });
    const clearPlaying = () => audio.closest(".audio-row")?.classList.remove("is-playing");
    audio.addEventListener("pause", clearPlaying);
    audio.addEventListener("ended", clearPlaying);
  });
}

function renderSpots(data) {
  const target = document.getElementById("spot-list");
  target.innerHTML = data.spots.map((spot, index) => {
    const num = String(index + 1).padStart(2, "0");
    return `
      <article class="card ticks spot" id="${escapeHtml(spot.id)}">
        <div class="spot-media">
          <img class="spot-photo" src="${escapeHtml(spot.image.src)}" alt="${escapeHtml(spot.image.alt)}" loading="lazy">
        </div>
        <div class="spot-body">
          <div class="spot-meta">
            <span class="eyebrow">${escapeHtml(spot.kind)} · 景点档案</span>
            <span class="spot-mark">SPOT / ${num}</span>
          </div>
          <h3 class="spot-name">${escapeHtml(spot.name)}</h3>
          <p class="spot-summary">${escapeHtml(spot.summary)}</p>
          <div class="spot-tags">
            <span class="tag">资料已复核</span>
            <span class="tag">${escapeHtml(spot.alias)}</span>
          </div>
          ${galleryTemplate(spot)}
          <ul class="fact-list">
            ${spot.facts.map((fact) => `
              <li>
                ${escapeHtml(fact.text)}
                <div class="fact-meta">
                  <span>出处：${sourceLink(data, fact.sourceId, "原文")}</span>
                  <span>核对：${escapeHtml(fact.reviewDate)}</span>
                  <span class="badge ${fact.status === "已复核" ? "ok" : "note"}">${escapeHtml(fact.status)}</span>
                </div>
              </li>
            `).join("")}
          </ul>
          <div class="lookfor"><strong>现场看什么：</strong>${escapeHtml(spot.lookFor)}</div>
          <p class="onsite-note">现场提示：${escapeHtml(spot.note)}</p>
          ${audioTemplate(spot, data)}
          <div class="spot-foot">
            <span>图：${escapeHtml(data.meta.photoCredit)} · 核对 ${escapeHtml(data.meta.reviewDate)}</span>
            <a href="explore.html#${escapeHtml(spot.task.id)}">完成观察题 →</a>
          </div>
        </div>
      </article>
    `;
  }).join("");
  bindAudioTranscripts();
}

const SITE_TO_SPOT = {
  2: "zhifangdi",
  4: "jinlou",
  7: "nilou",
  10: "yiyu",
  12: "niannsiyong",
  15: "houhuayuan"
};

function initMap(data) {
  const frame = document.getElementById("map-frame") || document.querySelector(".map-frame");
  const options = document.getElementById("map-route-options");
  const status = document.getElementById("map-route-status");
  const svg = document.getElementById("map-route-svg");
  const layer = document.getElementById("map-route-layer");
  const legendBase = document.getElementById("map-legend-base");
  const legendRoute = document.getElementById("map-legend-route");
  if (!frame || !options || !svg || !layer) return null;

  let state = loadState();
  const basePins = [...frame.querySelectorAll(".map-pin")];
  const spotForSite = (siteNumber) => data.spots.find((spot) => spot.id === SITE_TO_SPOT[siteNumber]) || null;

  function render() {
    const route = data.routes.find((item) => item.id === state.routeId);
    options.innerHTML = data.routes.map((item) => `
      <button class="map-route-chip ${item.id === state.routeId ? "active" : ""}" type="button" data-route="${escapeHtml(item.id)}">${escapeHtml(item.name)}</button>
    `).join("") + `<button class="map-route-chip none ${route ? "" : "active"}" type="button" data-route="">不显示路线</button>`;

    if (!route) {
      basePins.forEach((pin) => { pin.hidden = false; });
      svg.innerHTML = "";
      layer.innerHTML = "";
      if (legendBase) legendBase.hidden = false;
      if (legendRoute) legendRoute.hidden = true;
      if (status) status.textContent = "未选择路线，地图显示六处资料点。";
      return;
    }

    basePins.forEach((pin) => { pin.hidden = true; });
    const points = route.points.map((point) => `${point.positionX},${point.positionY}`).join(" ");
    svg.innerHTML = `
      <polyline class="route-halo" points="${points}"></polyline>
      <polyline class="route-line" points="${points}"></polyline>
    `;
    layer.innerHTML = route.points.map((point) => {
      const spot = spotForSite(point.siteNumber);
      const label = `${point.number} ${point.name}`;
      if (spot) {
        return `<a class="map-route-point" style="left:${point.positionX}%;top:${point.positionY}%" href="#${escapeHtml(spot.id)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(point.name)}">${point.number}</a>`;
      }
      return `<span class="map-route-point is-missing" style="left:${point.positionX}%;top:${point.positionY}%" aria-label="${escapeHtml(label)}（本版未收录）" title="${escapeHtml(point.name)}（本版未收录）">${point.number}</span>`;
    }).join("");

    if (legendBase) legendBase.hidden = true;
    if (legendRoute) {
      legendRoute.hidden = false;
      legendRoute.innerHTML = route.points.map((point) => {
        const spot = spotForSite(point.siteNumber);
        const content = `<span class="map-legend-dot">${point.number}</span>${escapeHtml(point.name)}`;
        return `<li>${spot ? `<a href="#${escapeHtml(spot.id)}">${content}</a>` : `<span class="is-missing">${content}</span>`}</li>`;
      }).join("");
    }
    if (status) status.textContent = `${route.name} · ${route.points.length} 站 · ${route.verificationLabel}`;
  }

  options.addEventListener("click", (event) => {
    const button = event.target.closest("[data-route]");
    if (!button) return;
    state.routeId = button.dataset.route || null;
    saveState(state);
    render();
  });

  render();
  return {
    refresh() {
      state = loadState();
      render();
    }
  };
}

function scrollToHash() {
  const raw = location.hash.slice(1);
  if (!raw) return;
  let id;
  try {
    id = decodeURIComponent(raw);
  } catch {
    return;
  }
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ block: "start" });
}

async function init() {
  try {
    const data = await loadData();
    renderTimeline(data);
    renderSpots(data);
    renderSourceList(data, document.getElementById("source-list"));
    const notice = document.getElementById("audio-notice");
    if (notice) notice.textContent = data.meta.audioNotice;
    window.MotionReveal?.refresh();
    const mapView = initMap(data);
    window.addEventListener("pageshow", () => mapView?.refresh());
    window.addEventListener("storage", (event) => {
      if (event.key === "jinlou-guide-v1") mapView?.refresh();
    });
    scrollToHash();
    setTimeout(scrollToHash, 60);
    window.addEventListener("hashchange", () => scrollToHash());
  } catch (error) {
    showLoadError(error);
  }
}

init();