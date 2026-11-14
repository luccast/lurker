# Lurker: design

## Why
Users sometimes want to watch a YouTube video without it skewing their home feed and recommendations forever.

## Top user stories
- As a user, I click "untracked" on any thumbnail and the video plays without touching my account.
- As a user, I flip on "untracked mode" and every video I click opens untracked until I flip it off.
- As a user, I can always tell at a glance whether the tab I'm in is untracked.
- As a user, nothing from my untracked session lingers after I close it.

## Goals / non-goals / anti-goals
- Goal: untracked watches never reach the user's Google account.
- Goal: zero setup, one click.
- Non-goal: staying signed in while untracked (Premium, comments, likes are lost there; user accepted).
- Non-goal: anonymity from Google (IP is still visible).
- Anti-goal: an untracked click accidentally loading in the signed-in tab first (even briefly). That would count as a watch.

## Approaches considered
- **A. Signed-out container tab (picked).** The video opens in a Firefox container with its own empty cookie jar. Stays in the same window. Robust because there's no account to attach anything to.
- B. Private window: simpler, but it's a separate window and clunky for watching several videos in a row.
- C. Block the tracking requests while signed in: lets you keep your login, but you never know if YouTube learns from other signals. Dropped once signed-out was acceptable.

## UX
Entry points (all open the video in a new untracked tab, foreground):
1. **Hover button** on every thumbnail (home, search, sidebar, Shorts, channel pages): a small eye-slash icon next to YouTube's own overlay buttons. Tooltip "Watch untracked".
2. **Alt+click** any video link → untracked.
3. **Right-click menu** on any YouTube video link → "Watch untracked".
4. **Untracked mode** (toolbar button toggle): while on, every plain click on a video link goes untracked. The toolbar badge shows "OFF" or "ON".

```
┌──────────────────────┐
│ [thumbnail]      👁̸ │  ← hover button (top-left)
│                 12:04 │
└──────────────────────┘
```

Inside the untracked tab:
- Firefox draws the container's color line under the tab (grey, named "Untracked").
- A slim, dismissible top banner on the page: `👁̸ Untracked · signed out · closes clean`.
- Autoplay, playlists and any links clicked stay inside the container (Firefox does this natively).

## Architecture (Firefox, Manifest V3, plain JS, no build step)
- `manifest.json`: permissions `contextualIdentities`, `cookies`, `browsingData`, `contextMenus`, `tabs`, `storage`; host `*://*.youtube.com/*`.
- `background.js`:
  - Gets or creates the "Untracked" container (stores its `cookieStoreId`).
  - `openUntracked(url, openerTab)` → `tabs.create({url, cookieStoreId, index: opener+1})`.
  - Right-click menu, toolbar toggle and badge.
  - When the last tab in the container closes, clears its cookies and site data (`browsingData.remove({cookieStoreId})`), keeping only YouTube's cookie-consent cookie so the EU consent wall doesn't show every time.
- `content.js` (runs on youtube.com, signed-in tabs only):
  - Capture-phase click listener on `/watch`, `/shorts/` and `youtu.be` links. Intercepts before YouTube's own navigation, sends the URL to the background script, and calls `preventDefault`. This handles Alt+click and untracked mode.
  - A MutationObserver adds the hover buttons, because YouTube loads content without full page reloads.
  - In untracked tabs: shows the banner instead.
- `popup.html/js`: untracked-mode switch plus a "clear untracked data now" button.
- Dev: `web-ext run` for live reload.

## Left to builder
- Exact CSS selectors for thumbnails (YouTube changes these often, so keep them in one place).
- Icon art.
