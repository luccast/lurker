const CONTAINER_NAME = "Lurker";
const HISTORY_MAX = 100;
// Consent cookies kept across wipes so the EU consent wall doesn't reappear every time.
const KEEP_COOKIES = ["SOCS", "CONSENT"];

let storeId = null; // cookieStoreId of the Lurker container

// ---------- container ----------

async function getContainer() {
  if (storeId) {
    try { await browser.contextualIdentities.get(storeId); return storeId; } catch { storeId = null; }
  }
  const found = await browser.contextualIdentities.query({ name: CONTAINER_NAME });
  const ci = found[0] || await browser.contextualIdentities.create({
    name: CONTAINER_NAME, color: "purple", icon: "fingerprint",
  });
  storeId = ci.cookieStoreId;
  return storeId;
}

async function openUntracked(url, { index, active = true, windowId } = {}) {
  const cookieStoreId = await getContainer();
  const props = { url, cookieStoreId, active };
  if (index != null) props.index = index;
  if (windowId != null) props.windowId = windowId;
  return browser.tabs.create(props);
}

// ---------- wipe ----------

async function wipe() {
  const id = await getContainer();
  const kept = [];
  for (const name of KEEP_COOKIES) {
    kept.push(...await browser.cookies.getAll({ storeId: id, name }));
  }
  await browser.browsingData.remove(
    { cookieStoreId: id },
    { cookies: true, localStorage: true, indexedDB: true, serviceWorkers: true },
  ).catch(() => browser.browsingData.remove({ cookieStoreId: id }, { cookies: true, localStorage: true }));
  for (const c of kept) {
    const host = c.domain.replace(/^\./, "");
    await browser.cookies.set({
      url: `https://${host}${c.path}`, storeId: id, name: c.name, value: c.value,
      domain: c.hostOnly ? undefined : c.domain, path: c.path, secure: c.secure,
      httpOnly: c.httpOnly, sameSite: c.sameSite, expirationDate: c.expirationDate,
    }).catch(() => {});
  }
}

let wipeTimer = null;
function wipeIfIdle() {
  clearTimeout(wipeTimer);
  wipeTimer = setTimeout(async () => {
    const id = await getContainer();
    const tabs = await browser.tabs.query({ cookieStoreId: id });
    if (tabs.length === 0) await wipe();
  }, 1000);
}

browser.tabs.onRemoved.addListener(wipeIfIdle);

// ---------- mode + badge ----------

async function getMode() {
  return (await browser.storage.local.get({ mode: false })).mode;
}

async function renderBadge() {
  const on = await getMode();
  browser.browserAction.setBadgeText({ text: on ? "ON" : "" });
  browser.browserAction.setBadgeBackgroundColor({ color: "#7c3aed" });
  browser.browserAction.setTitle({ title: on ? "Lurker: untracked mode ON" : "Lurker" });
}

browser.storage.onChanged.addListener((ch) => { if (ch.mode) renderBadge(); });

// ---------- history ----------

async function record(tab) {
  const vid = lurkerVideoId(tab.url);
  const title = (tab.title || "").replace(/ - YouTube$/, "").trim();
  if (!vid || !title || title === "YouTube" || /^https?:/.test(title)) return;
  const { history = [] } = await browser.storage.local.get("history");
  const next = [{ id: vid, url: tab.url, title, at: Date.now() },
    ...history.filter((h) => h.id !== vid)].slice(0, HISTORY_MAX);
  await browser.storage.local.set({ history: next });
}

browser.tabs.onUpdated.addListener(async (tabId, change, tab) => {
  if (!change.title || tab.cookieStoreId !== await getContainer()) return;
  record(tab);
}, { properties: ["title"] });

// ---------- full-page navigations (typed URLs, external links) ----------

browser.webRequest.onBeforeRequest.addListener(
  (d) => {
    // Sync check only: blocking listener. storeId is set at startup.
    if (d.tabId < 0 || !storeId || d.cookieStoreId === storeId) return {};
    if (!modeCache || !lurkerVideoId(d.url)) return {};
    (async () => {
      const tab = await browser.tabs.get(d.tabId).catch(() => null);
      await openUntracked(d.url, tab ? { index: tab.index + 1, windowId: tab.windowId } : {});
      // Close the tab if it was blank (new tab / external link) rather than a real page.
      if (tab && (!tab.url || /^about:(blank|newtab|home)$/.test(tab.url))) browser.tabs.remove(tab.id);
    })();
    return { cancel: true };
  },
  { urls: ["*://*.youtube.com/*", "*://youtu.be/*"], types: ["main_frame"] },
  ["blocking"],
);

let modeCache = false;
browser.storage.onChanged.addListener((ch) => { if (ch.mode) modeCache = ch.mode.newValue; });

// ---------- context menu ----------

browser.contextMenus.create({
  id: "lurk",
  title: "Watch untracked",
  contexts: ["link"],
  targetUrlPatterns: [
    "*://*.youtube.com/watch*", "*://*.youtube.com/shorts/*",
    "*://*.youtube.com/live/*", "*://youtu.be/*",
  ],
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "lurk") openUntracked(info.linkUrl, { index: tab.index + 1, windowId: tab.windowId });
});

// ---------- messages ----------

browser.runtime.onMessage.addListener(async (msg, sender) => {
  const tab = sender.tab;
  switch (msg.type) {
    case "whoami":
      return { untracked: !!tab && tab.cookieStoreId === await getContainer() };
    case "open":
      return void openUntracked(msg.url, {
        active: msg.active !== false,
        ...(tab ? { index: tab.index + 1, windowId: tab.windowId } : {}),
      });
    case "wipe":
      return wipe();
  }
});

// ---------- startup ----------

(async () => {
  await getContainer();
  modeCache = await getMode();
  renderBadge();
  wipeIfIdle(); // leftovers from a crash / previous session
})();
