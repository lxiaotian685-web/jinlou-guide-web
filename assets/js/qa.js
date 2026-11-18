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

function renderRefusal(type, query) {
  const prefix = query ? `<p class="meta-line" style="margin-bottom:8px">检索“${escapeHtml(query)}”</p>` : "";
  resultEl.innerHTML = prefix + refusalCard(type);
  window.MotionReveal?.refresh(resultEl);
}

function search(rawQuery) {
  const query = normalize(rawQuery);
  if (!query) {
    resultEl.innerHTML = `<div class="empty">输入一个建筑名、工艺名或问题，例如“泥楼墙”“廿四咏”。</div>`;
    return;
  }

  if (hasKeyword(query, data.refusals.dynamic.keywords)) {
    renderRefusal("dynamic", rawQuery);
    return;
  }
  if (hasKeyword(query, data.refusals.official.keywords)) {
    renderRefusal("official", rawQuery);
    return;
  }

  const scored = data.answers
    .map((answer) => ({ answer, score: scoreAnswer(answer, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    renderRefusal("unknown", rawQuery);
    return;
  }

  const top = scored[0].score;
  const weak = top < 100;
  const threshold = top >= 100 ? 100 : 10;
  const picked = scored.filter((item) => item.score >= threshold).slice(0, 3);

  resultEl.innerHTML = `
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
    search(button.dataset.q);
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
      search(inputEl.value);
    });
    const initial = new URLSearchParams(location.search).get("q");
    if (initial) {
      inputEl.value = initial;
      search(initial);
    }
  } catch (error) {
    showLoadError(error);
  }
}

init();