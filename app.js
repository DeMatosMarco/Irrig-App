const SERVER_URL = "http://10.11.79.52/ArduinoProject/read_data.php";
const POLL_INTERVAL = 5000;

const soilValDisplay = document.getElementById("soil-val");
const soilBar = document.getElementById("soil-bar");
const tempValDisplay = document.getElementById("temp-val");
const statusDisplay = document.getElementById("status");
const alertBanner = document.getElementById("alert-banner");
const lastUpdateEl = document.getElementById("last-update");
const installBtn = document.getElementById("install-btn");
const offlineBadge = document.getElementById("offline-badge");

let deferredInstallPrompt = null;
let isOffline = false;

const btnNotif = document.getElementById("btn-notif");

if (Notification.permission === "granted") {
  btnNotif.style.display = "none";
}

btnNotif.addEventListener("click", () => {
  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      alert("Notifications activées !");
      btnNotif.style.display = "none";
      new Notification("IrrigApp", {
        body: "Vous recevrez une alerte si le sol est sec.",
      });
    }
  });
});

function showAlert(msg) {
  if (!alertBanner) return;
  alertBanner.textContent = msg;
  alertBanner.style.display = "block";

  if (Notification.permission === "granted") {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification("⚠️ Alerte Humidité", {
        body: msg,
        icon: "https://cdn-icons-png.flaticon.com/512/2942/2942531.png",
        vibrate: [200, 100, 200],
        tag: "alerte-humidite",
      });
    });
  }
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (installBtn) installBtn.style.display = "flex";
});

if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === "accepted") installBtn.style.display = "none";
    deferredInstallPrompt = null;
  });
}

if (window.matchMedia("(display-mode: standalone)").matches) {
  if (installBtn) installBtn.style.display = "none";
}

window.addEventListener("appinstalled", () => {
  if (installBtn) installBtn.style.display = "none";
});

function recupererDonnees() {
  fetch(SERVER_URL)
    .then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then((data) => {
      const offline = data._offline === true;
      setStatus(offline ? "cache" : "online");
      mettreAJour(data, offline);
    })
    .catch((err) => {
      console.warn("Fetch échoué :", err);
      setStatus("offline");
    });
}

function mettreAJour(data, isFromCache = false) {
  const soil = data.soil !== null ? Math.round(data.soil) : null;
  const temp = data.temp !== null ? parseFloat(data.temp).toFixed(1) : null;

  soilValDisplay.textContent = soil !== null ? soil + " %" : "-- %";
  tempValDisplay.textContent = temp !== null ? temp + " °C" : "-- °C";

  if (soil !== null) {
    soilBar.style.width = soil + "%";

    if (soil < 30) {
      soilBar.style.background = "var(--color-danger)";
      showAlert("⚠️ Sol trop sec (" + soil + " %) — Arrosage recommandé !");
    } else if (soil < 60) {
      soilBar.style.background = "var(--color-warn)";
      hideAlert();
    } else {
      soilBar.style.background = "var(--color-ok)";
      hideAlert();
    }
  }

  if (lastUpdateEl) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    if (isFromCache && data._cachedAt) {
      lastUpdateEl.textContent =
        "Dernière synchro : " + formatCacheTime(data._cachedAt);
    } else if (!isFromCache) {
      lastUpdateEl.textContent = "Mis à jour à " + timeStr;
    }
  }

  if (offlineBadge) {
    offlineBadge.style.display = isFromCache ? "inline-flex" : "none";
  }
}

function formatCacheTime(isoString) {
  if (!isoString) return "inconnue";
  try {
    const d = new Date(isoString);
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (_) {
    return isoString;
  }
}

function setStatus(state) {
  const states = {
    online: { text: "En ligne ✓", cls: "online" },
    cache: { text: "Données en cache 📦", cls: "cached" },
    offline: { text: "Hors ligne", cls: "offline" },
  };
  const s = states[state] || states.offline;
  statusDisplay.textContent = s.text;
  statusDisplay.className = s.cls;
}

function showAlert(msg) {
  if (!alertBanner) return;
  alertBanner.textContent = msg;
  alertBanner.style.display = "block";
  if (Notification.permission === "granted") {
    new Notification("IrrigApp — Alerte Sol", {
      body: msg,
      icon: "https://cdn-icons-png.flaticon.com/512/2942/2942531.png",
    });
  }
}

function hideAlert() {
  if (alertBanner) alertBanner.style.display = "none";
}

if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}

window.addEventListener("online", () => recupererDonnees());
window.addEventListener("offline", () => setStatus("offline"));

recupererDonnees();
setInterval(recupererDonnees, POLL_INTERVAL);
