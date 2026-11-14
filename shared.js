// Shared helpers (background + content script).

/** Returns the video id for a YouTube video URL, or null. */
function lurkerVideoId(href) {
  let u;
  try { u = new URL(href, location.href); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
  if (host !== "youtube.com") return null;
  if (u.pathname === "/watch") return u.searchParams.get("v");
  const m = u.pathname.match(/^\/(shorts|live)\/([\w-]+)/);
  return m ? m[2] : null;
}
