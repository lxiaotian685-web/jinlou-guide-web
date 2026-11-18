async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    area.remove();
  }
  return ok;
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy]");
  if (!button) return;
  const original = button.textContent;
  try {
    const ok = await copyText(button.dataset.copy);
    button.textContent = ok ? "已复制" : "请手动选择文字";
  } catch {
    button.textContent = "请手动选择文字";
  }
  setTimeout(() => {
    button.textContent = original;
  }, 2200);
});