# Marble — Smart Mirror

Voice-powered smart mirror PWA. Ask how you look, get outfit opinions and compliments — in **Spanish**, **English** or **Dutch**.

100% free — uses browser Web Speech API, no paid services.

## Languages

| Code | Language   |
|------|------------|
| `es` | Español    |
| `en` | English    |
| `nl` | Nederlands |

Select language on the welcome screen before starting. Voice list and speech recognition adapt automatically.

## Run locally

```bash
npm start
```

Open the URL shown in the terminal (e.g. http://localhost:3000).

## Voice

Choose a voice on the welcome screen or via the 🗣️ button during the mirror session. Preference is saved per language.

## PWA install

Use the 📲 button when available, or "Add to home screen" in your mobile browser.

## Tech

- Vanilla HTML / CSS / JS
- Web Speech API (STT + TTS)
- Front camera via `getUserMedia`
- Local color analysis on canvas
- Service Worker + manifest
