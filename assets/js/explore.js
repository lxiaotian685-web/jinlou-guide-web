import {
  loadData,
  escapeHtml,
  sourceLink,
  routeById,
  emptyState,
  loadState,
  saveState,
  clearState,
  completedObservations,
  quizScore,
  formatDate,
  showLoadError
} from "./app.js";

let data;
let state;
let taskList;
let quizList;
const nicknameEl = document.getElementById("nickname");

function awaySpots() {
  return data.spots.filter((spot) => state.observations[spot.task.id] === spot.task.options.length - 1);
}

function renderProgress() {
  const done = completedObservations(data, state).length;
  const total = data.spots.length;
  const away = awaySpots().length;
  const score = quizScore(data, state);
  const bar = document.getElementById("progress-bar");
  const text = document.getElementById("progress-text");
  const percent = total ? Math.round((done / total) * 100) : 0;

  bar.style.width = `${percent}%`;
  bar.parentElement.setAttribute("aria-valuenow", String(done));
  text.textContent = `观察任务 ${done}/${total}${away ? ` · 未到现场 ${away} 项` : ""} · 小测已答 ${score.answered}/${score.total}（答对 ${score.correct}）`;

  const route = routeById(data, state.routeId);
  document.getElementById("route-summary").textContent = route ? route.name : "未选择";
}

function taskExplain(spot, value) {
  const awayIndex = spot.task.options.length - 1;
  const source = sourceLink(data, spot.task.sourceId, "查看出处");
  if (value === awayIndex) {
    return `已选择“未到现场”，本题不计入完成。资料说明：${escapeHtml(spot.task.explain)} ${source}`;
  }
  if (value === spot.task.answer) {
    return `与资料一致。${escapeHtml(spot.task.explain)} ${source}`;
  }
  return `与资料不一致，可以再观察一次。资料说明：${escapeHtml(spot.task.explain)} ${source}`;
}

function taskTemplate(spot, index) {
  const value = state.observations[spot.task.id];
  const awayIndex = spot.task.options.length - 1;
  const num = String(index + 1).padStart(2, "0");
  return `
    <article class="card ticks task" id="${escapeHtml(spot.task.id)}" data-spot="${escapeHtml(spot.id)}">
      <div class="task-head">
        ${spot.image ? `<img class="task-thumb" src="${escapeHtml(spot.image.src)}" alt="" loading="lazy">` : ""}
        <div class="task-title">
          <span class="eyebrow">FIELD / ${num}</span>
          <h3>${escapeHtml(spot.name)} <span class="spot-tag">观察题 · ${escapeHtml(spot.kind)}</span></h3>
        </div>
      </div>
      <p class="prompt">${escapeHtml(spot.task.prompt)}</p>
      <div class="options" role="radiogroup" aria-label="${escapeHtml(spot.name + "观察题")}">
        ${spot.task.options.map((option, index) => {
          const checked = value === index;
          const away = index === awayIndex;
          return `
            <label class="${checked ? "is-checked" : ""} ${checked && away ? "is-away" : ""}">
              <input type="radio" name="${escapeHtml(spot.task.id)}" value="${index}" ${checked ? "checked" : ""}>
              <span>${escapeHtml(option)}${away ? "（不计入完成）" : ""}</span>
            </label>
          `;
        }).join("")}
      </div>
      <div class="explain ${typeof value === "number" ? "show" : ""} ${typeof value === "number" && value !== spot.task.answer && value !== awayIndex ? "wrong" : ""}">
        ${typeof value === "number" ? taskExplain(spot, value) : ""}
      </div>
    </article>
  `;
}

function renderTasks() {
  taskList.innerHTML = data.spots.map((spot, index) => taskTemplate(spot, index)).join("");
}

function refreshTask(taskEl, spot) {
  const value = state.observations[spot.task.id];
  const awayIndex = spot.task.options.length - 1;
  taskEl.querySelectorAll(".options label").forEach((label, index) => {
    const checked = value === index;
    label.querySelector("input").checked = checked;
    label.classList.toggle("is-checked", checked);
    label.classList.toggle("is-away", checked && index === awayIndex);
  });
  const explain = taskEl.querySelector(".explain");
  if (typeof value === "number") {
    explain.className = "explain show";
    if (value !== spot.task.answer && value !== awayIndex) explain.classList.add("wrong");
    explain.innerHTML = taskExplain(spot, value);
  } else {
    explain.className = "explain";
    explain.innerHTML = "";
  }
}

function quizExplain(item, value) {
  const source = sourceLink(data, item.sourceId, "查看出处");
  if (value === item.answer) {
    return `答对了。${escapeHtml(item.explain)} ${source}`;
  }
  return `这次没选对。正确答案是“${escapeHtml(item.options[item.answer])}”。${escapeHtml(item.explain)} ${source}`;
}

function quizTemplate(item, index) {
  const value = state.quiz[item.id];
  return `
    <div class="quiz-q" id="${escapeHtml(item.id)}">
      <h3>${index + 1}. ${escapeHtml(item.question)}</h3>
      <div class="options" role="radiogroup" aria-label="${escapeHtml(item.question)}">
        ${item.options.map((option, optionIndex) => {
          const checked = value === optionIndex;
          return `
            <label class="${checked ? "is-checked" : ""}">
              <input type="radio" name="${escapeHtml(item.id)}" value="${optionIndex}" ${checked ? "checked" : ""}>
              <span>${escapeHtml(option)}</span>
            </label>
          `;
        }).join("")}
      </div>
      <div class="explain ${typeof value === "number" ? "show" : ""} ${typeof value === "number" && value !== item.answer ? "wrong" : ""}">
        ${typeof value === "number" ? quizExplain(item, value) : ""}
      </div>
    </div>
  `;
}

function updateQuizScore() {
  const score = quizScore(data, state);
  document.getElementById("quiz-score").textContent = score.answered
    ? `已答 ${score.answered}/${score.total} · 答对 ${score.correct} 道`
    : "还没有作答";
}

function renderQuiz() {
  quizList.innerHTML = data.quiz.map(quizTemplate).join("");
  updateQuizScore();
}

function refreshQuiz(quizEl, item) {
  const value = state.quiz[item.id];
  quizEl.querySelectorAll(".options label").forEach((label, index) => {
    const checked = value === index;
    label.querySelector("input").checked = checked;
    label.classList.toggle("is-checked", checked);
  });
  const explain = quizEl.querySelector(".explain");
  if (typeof value === "number") {
    explain.className = "explain show";
    if (value !== item.answer) explain.classList.add("wrong");
    explain.innerHTML = quizExplain(item, value);
  } else {
    explain.className = "explain";
    explain.innerHTML = "";
  }
}

function renderCard() {
  const route = routeById(data, state.routeId);
  const done = completedObservations(data, state);
  const away = awaySpots();
  const score = quizScore(data, state);

  document.getElementById("card-date").textContent = formatDate();
  document.getElementById("card-nickname").textContent = state.nickname.trim() || "（未填写）";
  document.getElementById("card-route").textContent = route ? route.name : "未选择";
  document.getElementById("card-obs").textContent = `${done.length} / ${data.spots.length}`;
  document.getElementById("card-quiz").textContent = score.answered
    ? `已答 ${score.answered}/${score.total}，答对 ${score.correct} 道`
    : "尚未作答";

  document.getElementById("card-obs-list").innerHTML = done.length
    ? done.map((spot) => {
        const value = state.observations[spot.task.id];
        return `<li>${escapeHtml(spot.name)}：${escapeHtml(spot.task.prompt)} 答：${escapeHtml(spot.task.options[value])}</li>`;
      }).join("")
    : "<li>还没有完成观察任务。</li>";

  const awayWrap = document.getElementById("card-away-wrap");
  awayWrap.hidden = away.length === 0;
  document.getElementById("card-away-list").innerHTML = away
    .map((spot) => `<li>${escapeHtml(spot.name)}：${escapeHtml(spot.task.prompt)}（未到现场）</li>`)
    .join("");

  document.getElementById("card-sources").innerHTML = `
    <p>资料来源（核对日期 2026-11-18）：</p>
    <ul class="print-list">
      ${data.sources.map((source) => `
        <li>${escapeHtml(source.title)} · ${escapeHtml(source.publisher)}</li>
      `).join("")}
    </ul>
    <p>原文链接：本站“文化导览 → 全部来源”。</p>
  `;
}

function bindEvents() {
  taskList.addEventListener("change", (event) => {
    const input = event.target.closest('input[type="radio"]');
    if (!input) return;
    const taskEl = input.closest(".task");
    const spot = data.spots.find((item) => item.task.id === taskEl.id);
    if (!spot) return;
    state.observations[spot.task.id] = Number(input.value);
    saveState(state);
    refreshTask(taskEl, spot);
    renderProgress();
    renderCard();
  });

  quizList.addEventListener("change", (event) => {
    const input = event.target.closest('input[type="radio"]');
    if (!input) return;
    const quizEl = input.closest(".quiz-q");
    const item = data.quiz.find((entry) => entry.id === quizEl.id);
    if (!item) return;
    state.quiz[item.id] = Number(input.value);
    saveState(state);
    refreshQuiz(quizEl, item);
    updateQuizScore();
    renderProgress();
    renderCard();
  });

  nicknameEl.addEventListener("input", () => {
    state.nickname = nicknameEl.value;
    saveState(state);
    renderCard();
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    if (!confirm("确定清空本机的昵称、路线、观察和小测记录吗？此操作不可撤销。")) return;
    clearState();
    state = emptyState();
    nicknameEl.value = "";
    renderProgress();
    renderTasks();
    renderQuiz();
    renderCard();
  });

  document.getElementById("print-btn").addEventListener("click", () => {
    window.print();
  });
}

async function init() {
  try {
    data = await loadData();
    state = loadState();
    taskList = document.getElementById("task-list");
    quizList = document.getElementById("quiz-list");
    nicknameEl.value = state.nickname || "";
    renderProgress();
    renderTasks();
    renderQuiz();
    renderCard();
    window.MotionReveal?.refresh();
    bindEvents();

    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) {
        target.scrollIntoView({ block: "start" });
        target.querySelector('input[type="radio"]')?.focus({ preventScroll: true });
      }
    }
  } catch (error) {
    showLoadError(error);
  }
}

init();