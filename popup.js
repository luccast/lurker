const $ = (s) => document.querySelector(s);

const ago = (t) => {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

async function render() {
  const { mode = false, history = [] } = await browser.storage.local.get(["mode", "history"]);
  $("#mode").checked = mode;
  const ul = $("#history");
  ul.replaceChildren(...history.map((h) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = h.url;
    a.title = h.title;
    const t = document.createElement("span"); t.className = "t"; t.textContent = h.title;
    const d = document.createElement("span"); d.className = "d"; d.textContent = ago(h.at);
    a.append(t, d);
    a.onclick = (e) => {
      e.preventDefault();
      browser.runtime.sendMessage({ type: "open", url: h.url });
      window.close();
    };
    li.append(a);
    return li;
  }));
  $("#empty").hidden = history.length > 0;
  $("#clear-history").hidden = history.length === 0;
}

$("#mode").onchange = (e) => browser.storage.local.set({ mode: e.target.checked });
$("#clear-history").onclick = () => browser.storage.local.set({ history: [] });
$("#wipe").onclick = async () => {
  const b = $("#wipe");
  await browser.runtime.sendMessage({ type: "wipe" });
  b.textContent = "Wiped ✓";
  setTimeout(() => { b.textContent = "Wipe untracked cookies now"; }, 1500);
};
browser.storage.onChanged.addListener(render);
render();
