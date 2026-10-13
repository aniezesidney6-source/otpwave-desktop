# OTPWave Desktop (Windows)

A secure Electron window onto https://otpwave.com with a tray icon and native
code notifications. The website does all the work, so site updates reach the
app instantly — the installer only needs rebuilding when this shell changes.

- `npm start` — run locally (set `OTPWAVE_URL=http://localhost:3000` to point at a dev server)
- `npm run dist` — build `dist/OTPWave-Setup.exe` (NSIS installer); bump `version` first
- Release: `gh release create vX.Y.Z dist/OTPWave-Setup.exe` — the site links to
  `releases/latest/download/OTPWave-Setup.exe`, so the button always serves the newest build
- `python build/make-icons.py` — regenerate the icons

Security: contextIsolation + sandbox, no Node in the page, navigation locked to
otpwave.com and payment checkouts (everything else opens in the browser), only
the notifications/clipboard permissions are granted.

Unsigned builds trigger Windows SmartScreen ("Windows protected your PC").
To remove it, buy a code-signing certificate and set `CSC_LINK` / `CSC_KEY_PASSWORD`
before `npm run dist`.
