window.onload = function () {
    document.getElementById("descargarxml").onclick = function () {
        chrome.runtime.sendMessage({ action: "START_XML" });
    };
    document.getElementById("descargarpdf").onclick = function () {
        chrome.runtime.sendMessage({ action: "START_PDF" });
    };
    document.getElementById("pausar").onclick = function () {
        chrome.runtime.sendMessage({ action: "PAUSE" });
    };
    document.getElementById("reanudar").onclick = function () {
        chrome.runtime.sendMessage({ action: "RESUME" });
    };
    document.getElementById("limpiar").onclick = function () {
        chrome.runtime.sendMessage({ action: "CLEAR" });
    };

    // Cancelar grupo individual — event delegation sobre el div de grupos
    document.getElementById("grupos").addEventListener("click", function (e) {
        var btn = e.target.closest(".group-cancel");
        if (btn) {
            var groupIndex = parseInt(btn.getAttribute("data-index"), 10);
            chrome.runtime.sendMessage({ action: "CANCEL_GROUP", groupIndex: groupIndex });
        }
    });

    document.getElementById("analizar").onclick = function () {
        chrome.tabs.create({ url: "https://analizador-cfdi.netlify.app/" });
    };
    document.getElementById("iralsat").onclick = function () {
        chrome.tabs.create({ url: "https://portalcfdi.facturaelectronica.sat.gob.mx" });
    };
    document.getElementById("enlace").onclick = function () {
        chrome.tabs.create({ url: "https://eduardoarandah.github.io/" });
    };
    document.getElementById("manual").onclick = function () {
        chrome.tabs.create({ url: "https://github.com/eduardoarandah/DescargaMasivaCFDIChrome" });
    };

    chrome.runtime.onMessage.addListener(function (message) {
        if (message.event === "STATE_UPDATE") {
            renderState(message.state);
        }
    });

    chrome.windows.getCurrent(function (currentWindow) {
        chrome.tabs.query({ active: true, windowId: currentWindow.id }, function (activeTabs) {
            var url = activeTabs[0].url;
            if (url.startsWith("https://portalcfdi.facturaelectronica.sat.gob.mx")) {
                chrome.scripting.executeScript({
                    target: { tabId: activeTabs[0].id },
                    files: ["inject.js"]
                });
            }
        });
    });

    chrome.runtime.sendMessage({ action: "GET_STATE" }, function (state) {
        if (state) renderState(state);
    });
};

function renderState(state) {
    document.getElementById("cuenta-xml").innerText = state.pendingXml > 0 ? state.pendingXml : "";
    document.getElementById("cuenta-pdf").innerText = state.pendingPdf > 0 ? state.pendingPdf : "";

    var statusDiv   = document.getElementById("status");
    var gruposDiv   = document.getElementById("grupos");
    var pausarBtn   = document.getElementById("pausar");
    var reanudarBtn = document.getElementById("reanudar");
    var limpiarBtn  = document.getElementById("limpiar");
    var remaining   = state.queueTotal - state.currentIndex;

    // Ocultar todos los botones de acción por defecto
    pausarBtn.style.display   = "none";
    reanudarBtn.style.display = "none";
    limpiarBtn.style.display  = "none";

    if (state.status === "downloading") {
        statusDiv.innerHTML =
            "<strong>" + state.completed + " / " + state.queueTotal + "</strong> descargados" +
            (state.failed > 0 ? " &nbsp;<span class='text-error'>" + state.failed + " errores</span>" : "") +
            "<br><small>" + remaining + " restantes en cola</small>";
        pausarBtn.style.display = "inline-block";

    } else if (state.status === "paused") {
        var reason = state.pauseReason === "session_expired"
            ? "&#9888; Sesi&oacute;n expirada &mdash; vuelve a iniciar sesi&oacute;n en el SAT"
            : "&#9646;&#9646; Cola pausada";
        statusDiv.innerHTML =
            "<span class='text-warning'>" + reason + "</span>" +
            "<br><small>" + state.completed + " descargados &mdash; " + remaining + " restantes</small>";
        reanudarBtn.style.display = "inline-block";
        limpiarBtn.style.display  = "inline-block";

    } else if (state.status === "done") {
        statusDiv.innerHTML =
            "&#10003; <strong>" + state.completed + "</strong> descargados" +
            (state.failed > 0 ? " &nbsp;<span class='text-error'>" + state.failed + " errores</span>" : "");
        limpiarBtn.style.display = "inline-block";

    } else {
        statusDiv.textContent    = "";
        limpiarBtn.style.display = state.queueTotal > 0 ? "inline-block" : "none";
    }

    // Desglose por mes
    if (state.groups && state.groups.length > 0) {
        var html = state.groups.map(function (g) {
            var pct       = g.total > 0 ? Math.round((g.done / g.total) * 100) : 0;
            var isDone    = g.done === g.total;
            var typeClass = g.type === "pdf" ? "badge-pdf" : "badge-xml";
            var cancelBtn = g.cancellable
                ? "<button class='group-cancel' data-index='" + g.index + "' title='Cancelar'>&#x2715;</button>"
                : "<span class='group-cancel-placeholder'></span>";
            return "<div class='group-row" + (isDone ? " group-done" : "") + "'>" +
                "<span class='group-type " + typeClass + "'>" + g.type.toUpperCase() + "</span>" +
                "<span class='group-label'>" + g.label + "</span>" +
                "<span class='group-count'>" + g.done + " / " + g.total + "</span>" +
                "<div class='group-bar'><div class='group-bar-fill' style='width:" + pct + "%'></div></div>" +
                cancelBtn +
                "</div>";
        }).join("");
        gruposDiv.innerHTML    = html;
        gruposDiv.style.display = "block";
    } else {
        gruposDiv.style.display = "none";
    }
}
