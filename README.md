# Lurker

Firefox extension. Watch YouTube videos without them touching your account, watch history, or recommendations.

Untracked videos open in a signed-out Firefox container tab. No account means nothing for YouTube to learn from. When the last untracked tab closes, its cookies and site data are wiped (the cookie-consent choice is kept so the consent popup doesn't reappear).

## Use

- **Hover** a thumbnail and click the eye icon
- **Alt+click** any video link
- **Right-click** a video link (on any site) and choose **Watch untracked**
- **Untracked mode** (toolbar popup): every video click opens untracked. Also catches typed URLs and links from other apps.

Untracked tabs have a purple container line and a "Lurking" pill. The popup lists videos watched untracked (stored locally only).

## Develop

```sh
npx web-ext run     # launches Firefox with the extension, live reload
npx web-ext lint
npx web-ext build   # zip in web-ext-artifacts/
```

Or load `manifest.json` at `about:debugging#/runtime/this-firefox`, then **Load Temporary Add-on**.

## Notes

- Google still sees your IP. This protects your recommendations, not your anonymity.
- Turn off YouTube's **Playback on hover** (Settings → Playback) if you use untracked mode. Inline previews on the signed-in home page may count as watches.
