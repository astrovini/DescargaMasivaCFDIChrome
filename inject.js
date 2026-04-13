// inject.js — se inyecta en la página del SAT para extraer los links
var links = [[], [], []];

// [0] URLs para descargar XML
var xmlBtns = document.getElementsByName("BtnDescarga");
for (var i = 0; i < xmlBtns.length; i++) {
    var html = xmlBtns[i].outerHTML;
    var match = html.match(/RecuperaCfdi[^']+/);
    if (match && match.length > 0) {
        links[0].push("https://portalcfdi.facturaelectronica.sat.gob.mx/" + match[0]);
    }
}

// [1] URLs para descargar PDF (representación impresa)
var pdfBtns = document.getElementsByName("BtnRI");
for (var i = 0; i < pdfBtns.length; i++) {
    var html = pdfBtns[i].outerHTML;
    var match = html.match(/recuperaRepresentacionImpresa\('([^']+)/);
    if (match && match.length > 1) {
        links[1].push("https://portalcfdi.facturaelectronica.sat.gob.mx/RepresentacionImpresa.aspx?Datos=" + match[1]);
    }
}

// [2] Folios (usados como nombre de archivo)
var folioInputs = document.getElementsByName("ListaFolios");
for (var i = 0; i < folioInputs.length; i++) {
    links[2].push(folioInputs[i].attributes["value"].value);
}

// Leer mes y año seleccionados para usarlos como carpeta
var anioEl = document.getElementById("DdlAnio");
var mesEl = document.getElementById("ctl00_MainContent_CldFecha_DdlMes");
var anio = anioEl ? anioEl.value : "";
var mes = mesEl ? String(mesEl.value).padStart(2, "0") : "";
var folder = (anio && mes) ? anio + "/" + mes + "/" : "";

// Enviar al background (no al popup) para que los downloads persistan
if (links[0].length > 0 || links[1].length > 0) {
    chrome.runtime.sendMessage({ action: "LINKS_RECEIVED", links: links, folder: folder });
}
