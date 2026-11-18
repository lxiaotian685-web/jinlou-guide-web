import {
  loadData,
  escapeHtml,
  sourceById,
  sourceLink,
  renderSourceList,
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
        <span class="audio-note">${spot.audio.length} 段 · 点击展开</span>
      </summary>
      <div class="audio-body">
        ${spot.audio.map((track) => `
          <div class="audio-row">
            <span class="audio-label">${escapeHtml(track.label)}</span>
            <audio controls preload="none" src="${escapeHtml(track.src)}"></audio>
          </div>
        `).join("")}
        <p class="onsite-note">${escapeHtml(data.meta.audioNotice)}</p>
      </div>
    </details>
  `;
}

function renderSpots(data) {
  const target = document.getElementById("spot-list");
  target.innerHTML = data.spots.map((spot, index) => {
    const num = String(index + 1).padStart(2, "0");
    return `
      <article class="card ticks spot" id="${escapeHtml(spot.id)}">
        <div class="spot-media">
          <img class="spot-photo" src="${escapeHtml(spot.image.src)}" alt="${escapeHtml(spot.image.alt)}" loading="lazy">
          <span class="spot-folio"><em>NO.</em><strong>${num}</strong></span>
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
    scrollToHash();
    setTimeout(scrollToHash, 60);
    window.addEventListener("hashchange", () => scrollToHash());
  } catch (error) {
    showLoadError(error);
  }
}

init();