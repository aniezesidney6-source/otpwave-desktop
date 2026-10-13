// Tiny, safe bridge for the website: it can tell it's in the desktop app and
// ask for the window to come forward (e.g. when a code notification is clicked).
// Nothing else from Electron or Node is exposed to the page.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("otpwaveDesktop", {
  isDesktop: true,
  focus: (pathname) => ipcRenderer.send("otpwave:focus", typeof pathname === "string" ? pathname : undefined),
});
