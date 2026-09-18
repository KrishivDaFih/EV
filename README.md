# E.V.

Your E.V. field-assistant interface, running as a real Windows desktop app.
Electron shell, three providers (Anthropic / OpenAI / Groq), local settings,
global hotkey, fullscreen.

---

## 1. Run it from source

Needs **Node.js 18+** (Node 20 LTS recommended).

```bat
cd ev
npm install
npm start
```

First launch opens settings automatically, because no API key is stored yet.

---

## 2. Build the setup file

```bat
npm run dist
```

Installer lands at `dist\EV-Setup-1.0.1.exe` — choose-your-folder, Start Menu
entry, Desktop shortcut, per-user (no admin prompt), proper uninstaller.
`npm run dist:portable` gives a single portable .exe instead.

Build on Windows. Cross-building from Linux needs Wine and misbehaves.

---

## 3. Where things live

| What | Path |
|---|---|
| Settings + API keys + her personality | `%APPDATA%\E.V\settings.json` |
| Installed app | `%LOCALAPPDATA%\Programs\E.V.` |
| Build output | `ev\dist` |

Uninstalling leaves `settings.json` alone, so reinstalling keeps your key.

---

## 4. Controls

| Action | How |
|---|---|
| Show / hide from anywhere | `Ctrl + Shift + E` (editable in settings) |
| Send | `Enter` — `Shift + Enter` for a new line |
| Fullscreen | `F11`, or the corners icon in the top bar |
| Leave fullscreen | `F11`, `Esc`, or the button top right |
| Maximise / restore | the square icon, or double-click the top bar |
| Settings | cog icon, top right |

---

## 5. What changed from the HTML you sent

The design is untouched — same palette, serif wordmark, web-scan panel,
chat layout, typing dots. What changed is underneath:

* **The API call moved into the main process.** Your version called
  `api.anthropic.com` straight from the page with **no API key** — that only
  works inside the Claude artifact sandbox, which injects auth for you. In a
  normal browser or an Electron window that request returns 401. It now runs in
  the main process with a key you supply, which also sidesteps CORS and keeps
  the key out of the page.
* **Provider choice.** Anthropic, OpenAI, or Groq, each with its own key and
  model name.
* **Her personality is editable.** The system prompt from your file is the
  default, sitting in settings under "Who she is". Change it and she changes.
* **The scan panel reacts.** Sweep speeds up and the centre goes amber while
  she's thinking; rings go grey and the sweep stops when the link is down.
* **`textContent` instead of `innerHTML`** when writing messages. The original
  escaped `<` on your side but interpolated the reply into HTML — a reply
  containing markup could have injected into the page.
* **History trims** to the last 20 turns rather than growing all session.

---

## 6. Icon

The app icon is the web-scan motif from her own panel. It is a genuine
multi-resolution `.ico`: 48px and up carry the full artwork (spokes, three web
rings, glowing sweep, tracked node), while 16/24/32px use a stripped-back
version — thick rim, one ring, wedge, hot centre — because the fine web detail
turns to mush at taskbar size.

Rebuilding it: the generator script is not kept in the repo; ask and I'll
regenerate, or replace `build/icon.ico` with your own.

---

## 7. Known limits

**No voice.** Text only, as in your original. Real speech in or out needs an
STT/TTS service wired in — Whisper locally, or Deepgram / ElevenLabs.

**Fonts.** Iowan Old Style is macOS-only, so on Windows the wordmark falls back
to Georgia, which is what the stack already specifies and looks close. Mono
falls back to Consolas.

**Model names.** Defaults are `claude-sonnet-4-5`, `gpt-4o-mini`,
`llama-3.3-70b-versatile`. Note your HTML asked for `claude-sonnet-4-6`, which
isn't a public API model string — if a request fails with "model not found",
update the Model field rather than assuming the app is broken.
