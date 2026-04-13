// background.js — service worker (MV3)
// Los downloads se manejan aquí para que no se cancelen al cerrar el popup.
// Usa callbacks encadenados en lugar de setInterval para mantener el service worker activo.

var MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

var pending = { xml: [], pdf: [], folios: [], folder: "" };
var queue = [];          // [{url, filename}]
var groups = [];         // [{label, startIndex, total}]
var currentIndex = 0;
var completed = 0;
var failed = 0;
var status = "idle";     // idle | downloading | paused | done
var pauseReason = null;  // null | "manual" | "session_expired"
var isProcessing = false;
var stateLoaded = false;
var ourDownloadIds = {};  // { downloadId: itemIndex } — tracks downloads we initiated

// Al iniciar el service worker, restaurar estado guardado
chrome.storage.local.get("queueState", function (data) {
    if (data.queueState) {
        var s = data.queueState;
        queue        = s.queue        || [];
        groups       = s.groups       || [];
        currentIndex = s.currentIndex || 0;
        completed    = s.completed    || 0;
        failed       = s.failed       || 0;
        status       = (s.status === "downloading") ? "paused" : (s.status || "idle");
        pauseReason  = (s.status === "downloading") ? "manual" : null;
        updateBadge();
    }
    stateLoaded = true;
});

// Detectar automáticamente si el SAT devolvió HTML en lugar del archivo esperado
chrome.downloads.onChanged.addListener(function (delta) {
    if (!delta.state || delta.state.current !== "complete") return;
    if (!ourDownloadIds[delta.id]) return;

    chrome.downloads.search({ id: delta.id }, function (items) {
        var itemIndex = ourDownloadIds[delta.id];
        delete ourDownloadIds[delta.id];
        if (!items.length) return;

        var mime = items[0].mime || "";
        if (mime.startsWith("text/html") && status === "downloading") {
            // El SAT devolvió HTML — sesión expirada.
            // Revertir: descontar el archivo fallido y retroceder el índice para reintentarlo al reanudar.
            currentIndex = itemIndex;
            completed = Math.max(0, completed - 1);
            failed++;
            // Borrar el archivo HTML inútil del disco
            chrome.downloads.removeFile(delta.id);
            doPause("session_expired");
        }
    });
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === "LINKS_RECEIVED") {
        pending.xml    = message.links[0];
        pending.pdf    = message.links[1];
        pending.folios = message.links[2];
        pending.folder = message.folder || "";
        notifyPopup({ event: "STATE_UPDATE", state: getState() });

    } else if (message.action === "START_XML") {
        enqueue("xml");

    } else if (message.action === "START_PDF") {
        enqueue("pdf");

    } else if (message.action === "PAUSE") {
        doPause("manual");

    } else if (message.action === "RESUME") {
        if (status === "paused" && !isProcessing && currentIndex < queue.length) {
            status = "downloading";
            pauseReason = null;
            isProcessing = true;
            saveState();
            updateBadge();
            notifyPopup({ event: "STATE_UPDATE", state: getState() });
            setTimeout(processNext, 0);
        }

    } else if (message.action === "GET_STATE") {
        if (!stateLoaded) {
            var interval = setInterval(function () {
                if (stateLoaded) {
                    clearInterval(interval);
                    sendResponse(getState());
                }
            }, 20);
        } else {
            sendResponse(getState());
        }
        return true;

    } else if (message.action === "CANCEL_GROUP") {
        cancelGroup(message.groupIndex);

    } else if (message.action === "CLEAR") {
        clearAll();
    }
});

function cancelGroup(groupIndex) {
    var g = groups[groupIndex];
    if (!g) return;
    if (g.startIndex < currentIndex) return; // ya empezó, no se puede cancelar

    // Quitar los items de la cola
    queue.splice(g.startIndex, g.total);

    // Ajustar startIndex de los grupos siguientes
    for (var i = groupIndex + 1; i < groups.length; i++) {
        groups[i].startIndex -= g.total;
    }

    groups.splice(groupIndex, 1);

    // Si la cola quedó vacía o ya no hay nada pendiente
    if (queue.length === 0) {
        status = "idle";
        isProcessing = false;
    } else if (currentIndex >= queue.length) {
        status = "done";
        isProcessing = false;
    }

    saveState();
    updateBadge();
    notifyPopup({ event: "STATE_UPDATE", state: getState() });
}

function doPause(reason) {
    status = "paused";
    pauseReason = reason;
    isProcessing = false;
    saveState();
    updateBadge();
    notifyPopup({ event: "STATE_UPDATE", state: getState() });
}

function enqueue(type) {
    var urls   = type === "pdf" ? pending.pdf : pending.xml;
    var ext    = "." + type;
    var folder = pending.folder;

    groups.push({
        label:      folderToLabel(folder),
        type:       type,
        startIndex: queue.length,
        total:      urls.length
    });

    urls.forEach(function (url, i) {
        queue.push({ url: url, filename: folder + type + "/" + (pending.folios[i] || i) + ext });
    });

    pending = { xml: [], pdf: [], folios: [], folder: "" };

    if (!isProcessing) {
        status = "downloading";
        pauseReason = null;
        isProcessing = true;
        setTimeout(processNext, 0);
    }

    saveState();
    updateBadge();
    notifyPopup({ event: "STATE_UPDATE", state: getState() });
}

function processNext() {
    // Respetar pausa — no continuar si se pausó manualmente o por sesión expirada
    if (status === "paused") return;

    if (currentIndex >= queue.length) {
        status = "done";
        isProcessing = false;
        saveState();
        updateBadge();
        notifyPopup({ event: "STATE_UPDATE", state: getState() });
        return;
    }

    var item = queue[currentIndex];
    currentIndex++;

    chrome.downloads.download(
        { url: item.url, filename: item.filename, conflictAction: "uniquify" },
        function (downloadId) {
            if (chrome.runtime.lastError || downloadId === undefined) {
                failed++;
                saveState();
                updateBadge();
                notifyPopup({ event: "STATE_UPDATE", state: getState() });
                if (status !== "paused") setTimeout(processNext, 1500);
            } else {
                completed++;
                ourDownloadIds[downloadId] = currentIndex - 1;  // guardar índice para poder revertir si es HTML
                saveState();
                updateBadge();
                notifyPopup({ event: "STATE_UPDATE", state: getState() });
                if (status !== "paused") setTimeout(processNext, 1500);
            }
        }
    );
}

function getState() {
    var groupProgress = groups.map(function (g, i) {
        var done = Math.max(0, Math.min(currentIndex, g.startIndex + g.total) - g.startIndex);
        return {
            index:       i,
            label:       g.label,
            type:        g.type,
            done:        done,
            total:       g.total,
            cancellable: g.startIndex >= currentIndex
        };
    });

    return {
        status:       status,
        pauseReason:  pauseReason,
        pendingXml:   pending.xml.length,
        pendingPdf:   pending.pdf.length,
        queueTotal:   queue.length,
        currentIndex: currentIndex,
        completed:    completed,
        failed:       failed,
        groups:       groupProgress
    };
}

function saveState() {
    chrome.storage.local.set({
        queueState: {
            queue:        queue,
            groups:       groups,
            currentIndex: currentIndex,
            completed:    completed,
            failed:       failed,
            status:       status
        }
    });
}

function clearAll() {
    isProcessing = false;
    ourDownloadIds = {};
    pending      = { xml: [], pdf: [], folios: [], folder: "" };
    queue        = [];
    groups       = [];
    currentIndex = 0;
    completed    = 0;
    failed       = 0;
    status       = "idle";
    pauseReason  = null;
    chrome.storage.local.remove("queueState");
    updateBadge();
    notifyPopup({ event: "STATE_UPDATE", state: getState() });
}

function folderToLabel(folder) {
    var match = folder.match(/(\d{4})\/(\d{2})\//);
    if (match) {
        return MESES[parseInt(match[2], 10) - 1] + " " + match[1];
    }
    return folder || "Sin fecha";
}

function updateBadge() {
    var remaining = queue.length - currentIndex;
    if (status === "downloading" && remaining > 0) {
        chrome.action.setBadgeText({ text: String(remaining) });
        chrome.action.setBadgeBackgroundColor({ color: "#4f46e5" });
    } else if (status === "paused" && remaining > 0) {
        chrome.action.setBadgeText({ text: "II" });
        chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" });
    } else if (status === "done") {
        chrome.action.setBadgeText({ text: "OK" });
        chrome.action.setBadgeBackgroundColor({ color: "#10b981" });
    } else {
        chrome.action.setBadgeText({ text: "" });
    }
}

function notifyPopup(message) {
    chrome.runtime.sendMessage(message, function () {
        void chrome.runtime.lastError;
    });
}
