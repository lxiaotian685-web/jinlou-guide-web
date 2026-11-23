import {
  loadData,
  escapeHtml,
  sourceById,
  sourceLink,
  showLoadError
} from "./app.js";

let data;
const resultEl = document.getElementById("qa-result");
const inputEl = document.getElementById("qa-input");

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s，。？！、；：""''（）《》〈〉·.,?!;:"'()[\]<>/\\_-]/g, "");
}

function hasKeyword(query, keywords) {
  return keywords.some((word) => {
    const key = normalize(word);
    return key && query.includes(key);
  });
}

function scoreAnswer(answer, query) {
  let score = 0;
  let reverseHit = false;
  for (const alias of answer.aliases) {
    const a = normalize(alias);
    if (!a) continue;
    if (query.includes(a)) score += 100 + a.length;
    else if (a.includes(query) && query.length >= 2) reverseHit = true;
  }
  if (reverseHit) score += 40;
  for (const keyword of answer.keywords) {
    const key = normalize(keyword);
    if (key.length >= 2 && query.includes(key)) score += 10;
  }
  return score;
}

function sourceMetaFor(data, ids) {
  const links = ids.map((id) => sourceLink(data, id, sourceById(data, id)?.title || id)).join("、");
  const dates = [...new Set(ids.map((id) => sourceById(data, id)?.reviewDate).filter(Boolean))];
  return `<span>出处：${links}</span><span>核对：${escapeHtml(dates.join("、"))}</span>`;
}

function refusalCard(type) {
  const item = data.refusals[type];
  const label = type === "dynamic" ? "动态信息 / 拒答" : type === "official" ? "资料边界 / 拒答" : "NO MATCH / 拒答";
  const boundaryNote = type === "dynamic" || type === "official"
    ? `<p class="onsite-note">DeepSeek 暂不可用，按本站资料边界在本地拒答。</p>`
    : "";
  const extra = type === "unknown" ? `
    <div class="scope-mini">
      当前可查：
      <ul>
        <li>六处建筑与壁雕的基本资料</li>
        <li>年代、形制、材料、木雕、家塾与壁雕尺寸</li>
        <li>“金屋藏娇”传说的性质说明</li>
      </ul>
    </div>` : "";
  return `
    <div class="card answer-card refuse">
      <div class="answer-kicker"><span class="eyebrow">${label}</span></div>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="answer-text">${escapeHtml(item.text)}</p>
      ${extra}
      ${boundaryNote}
    </div>
  `;
}

function answerCard(answer) {
  const isLegend = answer.status === "legend";
  return `
    <div class="card answer-card">
      <div class="answer-kicker">
        <span class="eyebrow">ANSWER / 资料</span>
        <span class="badge ${isLegend ? "note" : "ok"}">${isLegend ? "传说说明" : "已核对"}</span>
      </div>
      <h3>${escapeHtml(answer.question)}</h3>
      <p class="answer-text">${escapeHtml(answer.answer)}</p>
      <div class="fact-meta">
        ${sourceMetaFor(data, answer.sourceIds)}
      </div>
    </div>
  `;
}

function renderRefusal(type, query, notice = "") {
  const prefix = query ? `<p class="meta-line" style="margin-bottom:8px">${type === "unknown" ? "本地检索" : "本地边界检查"}：“${escapeHtml(query)}”</p>` : "";
  const noticeHtml = notice ? `<p class="meta-line" style="margin-bottom:8px">${escapeHtml(notice)}</p>` : "";
  resultEl.innerHTML = noticeHtml + prefix + refusalCard(type);
  window.MotionReveal?.refresh(resultEl);
}

function aiRefusalCard(payload) {
  const label = payload.refusal === "dynamic" ? "动态信息 / 拒答" : payload.refusal === "official" ? "资料边界 / 拒答" : "NO MATCH / 拒答";
  return `
    <div class="card answer-card refuse">
      <div class="answer-kicker"><span class="eyebrow">${label}</span></div>
      <h3>${escapeHtml(payload.title || "现有资料无法确认")}</h3>
      <p class="answer-text">${escapeHtml(payload.text || payload.answer || "")}</p>
    </div>
  `;
}

function aiAnswerCard(payload, question) {
  const sourceIds = Array.isArray(payload.sourceIds) ? payload.sourceIds.filter((id) => typeof id === "string") : [];
  const webSources = Array.isArray(payload.webSources)
    ? payload.webSources.filter((item) => item && typeof item.url === "string" && item.url.startsWith("https://"))
    : [];
  const meta = sourceIds.length
    ? sourceMetaFor(data, sourceIds)
    : payload.insufficient || payload.general ? "" : "<span>出处：本站已登记资料</span>";
  const webMeta = webSources.length ? `
      <div class="fact-meta">
        <span>联网检索：</span>
        ${webSources.map((item) => `<a class="source-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title || item.url)}</a>`).join("、")}
      </div>` : "";
  const label = payload.general ? (webSources.length ? "AI 联网补充" : "AI 补充") : payload.insufficient ? "资料不足" : "AI 整理";
  const badge = payload.general || payload.insufficient ? "note" : "ok";
  const note = payload.general
    ? webSources.length
      ? "本地资料库未命中，以上参考了 DeepSeek 联网检索结果；网页内容未人工复核，景区事实与实时信息请以官方公告为准。"
      : "本地资料库未命中，以上为 DeepSeek 通用回答；景区事实与实时信息请以出处、现场展签或官方公告为准。"
    : "AI 只依据本站已登记资料整理；事实与细节仍以出处和现场展签为准。";
  return `
    <div class="card answer-card">
      <div class="answer-kicker">
        <span class="eyebrow">ANSWER / DEEPSEEK</span>
        <span class="badge ${badge}">${label}</span>
      </div>
      <h3>${escapeHtml(question)}</h3>
      <p class="answer-text">${escapeHtml(payload.answer)}</p>
      ${meta ? `<div class="fact-meta">${meta}</div>` : ""}
      ${webMeta}
      <p class="onsite-note">${note}</p>
    </div>
  `;
}

function localAnswerCard(payload, question) {
  const sourceIds = Array.isArray(payload.sourceIds) ? payload.sourceIds.filter((id) => typeof id === "string") : [];
  return `
    <div class="card answer-card">
      <div class="answer-kicker">
        <span class="eyebrow">ANSWER / 本地资料</span>
        <span class="badge ok">已核对</span>
      </div>
      <h3>${escapeHtml(question)}</h3>
      <p class="answer-text">${escapeHtml(payload.answer)}</p>
      ${sourceIds.length ? `<div class="fact-meta">${sourceMetaFor(data, sourceIds)}</div>` : ""}
      <p class="onsite-note">本地知识库命中，未调用 DeepSeek。</p>
    </div>
  `;
}

function fallbackNotice(code) {
  if (code === "service_not_configured") return "DeepSeek 尚未配置密钥，已切换为本地资料检索。";
  if (code === "rate_limited" || code === "provider_rate_limited") return "提问太频繁，已切换为本地资料检索。";
  if (code === "provider_timeout") return "DeepSeek 响应超时，已切换为本地资料检索。";
  return "DeepSeek 暂时不可用，已切换为本地资料检索。";
}

let asking = false;

async function askQuestion(rawQuestion) {
  const raw = String(rawQuestion ?? "").trim();
  const query = normalize(raw);
  if (!query) {
    resultEl.innerHTML = `<div class="empty">输入一个建筑名、工艺名或问题，例如“泥楼墙”“廿四咏”。</div>`;
    return;
  }

  if (asking) return;

  asking = true;
  const submit = document.querySelector("#qa-form button[type='submit']");
  if (submit) submit.disabled = true;
  resultEl.setAttribute("aria-busy", "true");
  resultEl.innerHTML = `<div class="empty">DeepSeek 正在根据已登记资料整理回答…</div>`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    let response;
    try {
      response = await fetch("/functions/v1/app", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ question: raw }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) throw new Error("invalid_response");
    const payload = await response.json();
    if (!response.ok || !payload || payload.ok !== true) {
      throw new Error(payload?.error || "request_failed");
    }
    if (payload.mode === "refusal") {
      resultEl.innerHTML = aiRefusalCard(payload);
    } else if (payload.mode === "local") {
      if (typeof payload.answer !== "string" || !payload.answer.trim()) throw new Error("empty_answer");
      resultEl.innerHTML = localAnswerCard(payload, raw);
    } else {
      if (typeof payload.answer !== "string" || !payload.answer.trim()) throw new Error("empty_answer");
      resultEl.innerHTML = aiAnswerCard(payload, raw);
    }
    window.MotionReveal?.refresh(resultEl);
  } catch (error) {
    const code = error?.name === "AbortError" ? "provider_timeout" : String(error?.message || "");
    search(raw, { notice: fallbackNotice(code) });
  } finally {
    asking = false;
    if (submit) submit.disabled = false;
    resultEl.removeAttribute("aria-busy");
  }
}

function search(rawQuery, options = {}) {
  const query = normalize(rawQuery);
  if (!query) {
    resultEl.innerHTML = `<div class="empty">输入一个建筑名、工艺名或问题，例如“泥楼墙”“廿四咏”。</div>`;
    return;
  }

  if (hasKeyword(query, data.refusals.dynamic.keywords)) {
    renderRefusal("dynamic", rawQuery, options.notice);
    return;
  }
  if (hasKeyword(query, data.refusals.official.keywords)) {
    renderRefusal("official", rawQuery, options.notice);
    return;
  }

  const scored = data.answers
    .map((answer) => ({ answer, score: scoreAnswer(answer, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    renderRefusal("unknown", rawQuery, options.notice);
    return;
  }

  const top = scored[0].score;
  const weak = top < 100;
  const threshold = top >= 100 ? 100 : 10;
  const picked = scored.filter((item) => item.score >= threshold).slice(0, 3);
  const noticeHtml = options.notice ? `<p class="meta-line" style="margin-bottom:8px">${escapeHtml(options.notice)}</p>` : "";

  resultEl.innerHTML = `
    ${noticeHtml}
    <p class="meta-line" style="margin-bottom:8px">检索“${escapeHtml(rawQuery)}”，找到 ${picked.length} 条${weak ? "相关资料" : "已审核资料"}。</p>
    ${weak ? `<p class="meta-line" style="margin-bottom:8px">未精确匹配问题，以下是与关键词相关的资料。</p>` : ""}
    <div class="grid">${picked.map((item) => answerCard(item.answer)).join("")}</div>
  `;
  window.MotionReveal?.refresh(resultEl);
}

function chip(label, question) {
  return `<button class="chip" type="button" data-q="${escapeHtml(question)}">${escapeHtml(label)}</button>`;
}

function renderChips() {
  const curated = [
    ["金楼原名", "金楼原名是什么"],
    ["泥楼墙怎么做", "泥楼为什么叫泥楼"],
    ["亦渔遗塾", "亦渔遗塾是谁家的"],
    ["廿四咏壁雕", "碧江廿四咏是什么"],
    ["金屋藏娇", "金屋藏娇是真的吗"],
    ["门票多少钱", "门票多少钱"]
  ];
  document.getElementById("chips").innerHTML = curated
    .map(([label, question]) => chip(label, question))
    .join("");

  document.getElementById("faq-list").innerHTML = data.answers
    .map((answer) => chip(answer.question, answer.question))
    .join("");
}

function bindChips() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-q]");
    if (!button) return;
    inputEl.value = button.dataset.q;
    askQuestion(button.dataset.q);
    resultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

async function init() {
  try {
    data = await loadData();
    renderChips();
    bindChips();
    document.getElementById("qa-form").addEventListener("submit", (event) => {
      event.preventDefault();
      askQuestion(inputEl.value);
    });
    const initial = new URLSearchParams(location.search).get("q");
    if (initial) {
      inputEl.value = initial;
      askQuestion(initial);
    }
  } catch (error) {
    showLoadError(error);
  }
}

init();