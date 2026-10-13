// OTPWave desktop — a secure window onto otpwave.com with a tray icon and
// native code notifications. The site itself does all the work, so every
// website update reaches the desktop app instantly.
const { app, BrowserWindow, Menu, Tray, shell, ipcMain, nativeImage, session } = require("electron");
const path = require("node:path");

const APP_URL = process.env.OTPWAVE_URL || "https://otpwave.com";
const START_PATH = "/dashboard";
const APP_ID = "com.otpwave.desktop";

// Pages that may load inside the app window. Everything else opens in the
// user's normal browser — the window can never be steered to a look-alike site.
const ALLOWED_HOSTS = [
  new URL(APP_URL).hostname,
  "otpwave.com",
  "www.otpwave.com",
  "checkout.flutterwave.com",
  "flutterwave.com",
  "nowpayments.io",
  "challenges.cloudflare.com",
];
function isAllowed(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && !(u.protocol === "http:" && u.hostname === "localhost")) return false;
    return ALLOWED_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
function openExternally(url) {
  try {
    const u = new URL(url);
    if (["https:", "http:", "mailto:"].includes(u.protocol)) shell.openExternal(url);
  } catch {
    /* ignore malformed links */
  }
}

let win = null;
let tray = null;
let quitting = false;
let toldAboutTray = false;

// One copy of the app at a time: a second launch just brings the window forward.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => showWindow());
}

app.setAppUserModelId(APP_ID); // so Windows shows "OTPWave" on notifications

function showWindow(pathname) {
  if (!win) return createWindow(pathname);
  if (pathname) win.loadURL(new URL(pathname, APP_URL).toString());
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function offlinePage(target) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>OTPWave</title>
<style>body{margin:0;height:100vh;display:grid;place-items:center;background:#09090b;color:#fafafa;font-family:system-ui,Segoe UI,sans-serif}
.c{text-align:center;max-width:360px;padding:24px}.m{width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#6366f1,#4f46e5);margin:0 auto 18px}
h1{font-size:20px;margin:0 0 8px}p{color:#a1a1aa;line-height:1.5;margin:0 0 20px}
a{display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:600}</style></head>
<body><div class="c"><div class="m"></div><h1>You're offline</h1><p>OTPWave couldn't connect. Check your internet connection and try again.</p>
<a href="${target}">Try again</a></div></body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function createWindow(pathname = START_PATH, { hidden = false } = {}) {
  win = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 380,
    minHeight: 560,
    title: "OTPWave",
    icon: path.join(__dirname, "assets", "icon.png"),
    backgroundColor: "#09090b",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  win.removeMenu();

  // Lets the site know it's inside the desktop app (enables code notifications).
  win.webContents.setUserAgent(`${win.webContents.getUserAgent()} OTPWaveDesktop/${app.getVersion()}`);

  if (!hidden) win.once("ready-to-show", () => win.show());

  // Keep the window on otpwave.com (and payment checkouts); other links → browser.
  win.webContents.on("will-navigate", (e, url) => {
    if (!isAllowed(url)) {
      e.preventDefault();
      openExternally(url);
    }
  });
  win.webContents.on("will-redirect", (e, url) => {
    if (!isAllowed(url)) {
      e.preventDefault();
      openExternally(url);
    }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    // New-tab links (WhatsApp support, docs, socials) open in the normal browser.
    openExternally(url);
    return { action: "deny" };
  });

  const target = new URL(pathname, APP_URL).toString();
  win.webContents.on("did-fail-load", (_e, code, _desc, url, isMainFrame) => {
    // -3 = navigation aborted (normal during redirects)
    if (isMainFrame && code !== -3 && !url.startsWith("data:")) win.loadURL(offlinePage(url || target));
  });

  // Closing hides to the tray so code notifications keep arriving.
  win.on("close", (e) => {
    if (quitting) return;
    e.preventDefault();
    win.hide();
    if (!toldAboutTray && tray) {
      toldAboutTray = true;
      tray.displayBalloon?.({
        iconType: "info",
        title: "OTPWave is still running",
        content: "You'll still get a notification when a code arrives. Right-click the tray icon to quit.",
      });
    }
  });
  win.on("closed", () => (win = null));

  win.loadURL(target);
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, "assets", "tray.png"));
  tray = new Tray(icon);
  tray.setToolTip("OTPWave");
  const login = () => app.getLoginItemSettings().openAtLogin;
  const build = () =>
    Menu.buildFromTemplate([
      { label: "Open OTPWave", click: () => showWindow() },
      { label: "Buy a number", click: () => showWindow("/dashboard/buy") },
      { label: "Messages", click: () => showWindow("/dashboard/messages") },
      { label: "Wallet", click: () => showWindow("/dashboard/wallet") },
      { type: "separator" },
      {
        label: "Start with Windows",
        type: "checkbox",
        checked: login(),
        click: (item) => {
          app.setLoginItemSettings({ openAtLogin: item.checked, args: ["--hidden"] });
          tray.setContextMenu(build());
        },
      },
      { type: "separator" },
      {
        label: "Quit OTPWave",
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]);
  tray.setContextMenu(build());
  tray.on("click", () => showWindow());
}

app.whenReady().then(() => {
  // The site only needs notifications and clipboard; deny camera, mic, location, etc.
  const allowed = new Set(["notifications", "clipboard-sanitized-write"]);
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => {
    cb(allowed.has(permission) && isAllowed(wc.getURL()));
  });
  session.defaultSession.setPermissionCheckHandler((wc, permission) => allowed.has(permission));

  // A notification click from the page brings the window to the front.
  ipcMain.on("otpwave:focus", (_e, pathname) => {
    showWindow(typeof pathname === "string" && pathname.startsWith("/") ? pathname : undefined);
  });

  createTray();
  // Started with Windows → stay in the tray until opened.
  createWindow(START_PATH, { hidden: process.argv.includes("--hidden") });
});

app.on("before-quit", () => (quitting = true));
app.on("window-all-closed", () => {
  /* keep running in the tray */
});
