// Backend + hosting de la Rutina Arnold para Google Apps Script.
// Este archivo va en "Code.gs" (el archivo de codigo que ya tienes).
// El HTML de la app va en un archivo aparte llamado "Index" (ver INSTRUCCIONES-NUBE.md).
//
//  - Abrir la URL /exec en el navegador           -> sirve la app (HTML)
//  - La app pide datos con  /exec?token=...        -> devuelve el progreso (JSON)
//  - La app manda POST con {token, app}            -> guarda el progreso
// Todo el progreso vive en la celda A1 de la pestana "datos".

const TOKEN = 'arnold-2026-fxt-7391'; // debe coincidir con CLOUD_TOKEN en el HTML (Index)

// Hoja donde vive todo. Al estar puesto el ID, este codigo funciona igual en un
// proyecto independiente que dentro de la propia hoja.
// (El ID es el trozo largo de la URL de la hoja, entre /d/ y /edit.)
const SHEET_ID = '1Wwp7DgPfLXnN0lFTKQguSXgPN8S7nHmHC-Pr-wYToME';

function getSheet_() {
  let ss = null;
  if (SHEET_ID) {
    ss = SpreadsheetApp.openById(SHEET_ID);
  } else {
    try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (err) {}
  }
  if (!ss) {
    throw new Error('No se encontro la hoja de calculo. Escribe el ID de tu hoja en SHEET_ID, o abre este proyecto desde la hoja (Extensiones -> Apps Script).');
  }
  let sh = ss.getSheetByName('datos');
  if (!sh) sh = ss.insertSheet('datos');
  return sh;
}

// Guarda las ultimas peticiones tal cual llegan (celda A5). Sirve para
// diagnosticar que manda de verdad el Atajo del iPhone.
function registrarLog_(texto) {
  try {
    const sh = getSheet_();
    let log = [];
    try { const raw = sh.getRange(5, 1).getValue(); log = raw ? JSON.parse(raw) : []; } catch (err) {}
    log.push({ t: new Date().toLocaleString(), q: String(texto === undefined ? '' : texto).slice(0, 600) });
    while (log.length > 15) { log.shift(); }
    sh.getRange(5, 1).setValue(JSON.stringify(log));
    sh.getRange(5, 2).setValue('Ultimas peticiones del Atajo (diagnostico)');
  } catch (err) {}
}
function leerLog_() {
  try {
    const raw = getSheet_().getRange(5, 1).getValue();
    return raw ? JSON.parse(raw) : [];
  } catch (err) { return []; }
}

// GET: con token -> datos (JSON). Sin token -> sirve la app (HTML).
function doGet(e) {
  if (e && e.parameter && e.parameter.token) {
    if (e.parameter.token !== TOKEN) return json_({ error: 'token invalido' });
    // Consultar el diagnostico: /exec?token=...&verlog=1
    if (e.parameter.verlog) return json_({ log: leerLog_() });
    // Ver las copias automaticas: /exec?token=...&vercopias=1
    if (e.parameter.vercopias) {
      const copias = leerCopias_().map(function (c, i) {
        let resumen = '';
        try {
          const a = JSON.parse(c.d);
          const cargas = Object.keys(a.training.days || {}).reduce(function (n, k) {
            const w = a.training.days[k].weights || {};
            return n + Object.keys(w).filter(function (x) { return w[x]; }).length;
          }, 0);
          resumen = 'v' + a.version + ' | ' + cargas + ' pesos de carga | '
                  + (a.nutrition.history || []).length + ' dias de comidas | '
                  + Object.keys(a.prs || {}).length + ' PRs | '
                  + ((a.body || {}).log || []).length + ' pesos corporales';
        } catch (err) { resumen = '(ilegible)'; }
        return { copia: i, fecha: c.t, resumen: resumen };
      });
      return json_({ copias: copias, comoRestaurar: 'anade &restaurarcopia=N con el numero de copia' });
    }
    // Volver a una copia: /exec?token=...&restaurarcopia=N
    if (e.parameter.restaurarcopia !== undefined) {
      const copias = leerCopias_();
      const i = parseInt(e.parameter.restaurarcopia, 10);
      if (isNaN(i) || i < 0 || i >= copias.length) {
        return json_({ ok: false, error: 'No existe esa copia. Hay ' + copias.length + '. Usa &vercopias=1 para verlas.' });
      }
      const sh2 = getSheet_();
      guardarVersionAnterior_(sh2);         // por si te arrepientes de restaurar
      sh2.getRange(1, 1).setValue(copias[i].d);
      sh2.getRange(1, 2).setValue('Restaurado de la copia del ' + copias[i].t);
      return json_({ ok: true, restaurado: copias[i].t,
                     aviso: 'Cierra y abre la app en tus dispositivos para que se recargue.' });
    }
    // Vaciar los datos de salud (celda A3): /exec?token=...&limpiarsalud=1
    // Util para borrar pruebas. El Atajo la repuebla en su siguiente ejecucion.
    if (e.parameter.limpiarsalud) {
      const shl = getSheet_();
      shl.getRange(3, 1).setValue('');
      shl.getRange(3, 2).setValue('Datos de salud vaciados: ' + new Date().toLocaleString());
      return json_({ ok: true, mensaje: 'Datos de salud borrados.' });
    }
    // Registrar cualquier peticion que traiga algo mas que el token (o sea,
    // la del Atajo), aunque venga vacia. La app solo manda ?token=... y no ensucia.
    const qs = e.queryString || '';
    const extra = qs.split('&').filter(function (p) { return p && p.indexOf('token=') !== 0; });
    if (extra.length) registrarLog_(qs);
    // El Atajo puede mandar la salud por GET, mucho mas facil de montar y probar.
    // Si manda los campos pero vacios, avisar claramente en vez de devolver
    // el volcado de la app, que despista.
    if (pideSalud_(e.parameter) && !tieneSalud_(e.parameter)) {
      const vacios = [];
      CAMPOS_SALUD.forEach(function (k) { if (e.parameter[k] !== undefined) vacios.push(k); });
      const hora = Number(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'H'));
      return json_({
        ok: false,
        campos_vacios: vacios,
        causa_probable: hora < 8
          ? 'Es de madrugada: Salud aun no tiene datos de HOY, asi que el Atajo manda vacio con razon. Prueba de nuevo durante el dia antes de tocar nada.'
          : 'A esta hora ya deberia haber datos. Revisa en el Atajo que la variable del final de la URL sea la salida de Combine Text, y que Combine reciba la lista de Get Value from Health Samples.',
        nota: 'No se guardo nada, pero tampoco se borro: los datos que ya tenias de ese dia siguen intactos.'
      });
    }
    if (tieneSalud_(e.parameter)) {
      const dia = guardarSalud_(e.parameter);
      // Eco de diagnostico: "recibido" es lo que mando el Atajo tal cual, y
      // "guardado" lo que quedo tras validar. Si difieren, el dato venia mal.
      const recibido = {};
      CAMPOS_SALUD.forEach(function (k) {
        if (e.parameter[k] !== undefined) recibido[k] = String(e.parameter[k]).slice(0, 120);
      });
      return json_({ ok: true, dia: dia, recibido: recibido, guardado: leerSalud_()[dia] || {} });
    }
    const sh = getSheet_();
    let app = null, salud = null;
    try { const raw = sh.getRange(1, 1).getValue(); app = raw ? JSON.parse(raw) : null; } catch (err) {}
    try { const raw3 = sh.getRange(3, 1).getValue(); salud = raw3 ? JSON.parse(raw3) : null; } catch (err) {}
    return json_({ app: app, salud: salud });
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Rutina Arnold X')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// POST: la app manda {token, app} con el progreso.
// El Atajo del iPhone manda {token, salud:{...}} con los datos del Apple Watch.
// Cada cosa va a su celda: A1 el progreso, A3 la salud. Asi nunca se pisan.
function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ error: 'json invalido' }); }
  if (body.token !== TOKEN) return json_({ error: 'token invalido' });
  const sh = getSheet_();

  // Restaurar una copia de seguridad completa de los datos del Watch.
  if (body.saludCompleta && typeof body.saludCompleta === 'object') {
    sh.getRange(3, 1).setValue(JSON.stringify(body.saludCompleta));
    sh.getRange(3, 2).setValue('Restaurado desde copia: ' + new Date().toLocaleString());
    if (!body.app) return json_({ ok: true, dias: Object.keys(body.saludCompleta).length });
  }

  // El Atajo puede mandar {salud:{...}} o los campos sueltos junto al token:
  // ambas formas valen, para que armarlo en el iPhone sea lo mas simple posible.
  if (body.salud) {
    guardarSalud_(body.salud);
    if (!body.app) return json_({ ok: true });
  } else if (!body.app && tieneSalud_(body)) {
    return json_({ ok: true, dia: guardarSalud_(body) });
  }

  if (body.app) {
    guardarVersionAnterior_(sh);            // red de seguridad antes de sobrescribir
    sh.getRange(1, 1).setValue(JSON.stringify(body.app));
    sh.getRange(1, 2).setValue('Ultima sincronizacion: ' + new Date().toLocaleString());
  }
  return json_({ ok: true });
}

// Guarda en la celda A7 las ultimas versiones del progreso ANTES de pisarlas.
// Como mucho una copia cada 30 min, para no ralentizar cada pulsacion.
function guardarVersionAnterior_(sh) {
  try {
    const previo = sh.getRange(1, 1).getValue();
    if (!previo) return;
    let hist = [];
    try { const raw = sh.getRange(7, 1).getValue(); hist = raw ? JSON.parse(raw) : []; } catch (err) {}
    const ahora = Date.now();
    if (hist.length && (ahora - (hist[hist.length - 1].ms || 0)) < 1800000) return;
    hist.push({ ms: ahora, t: new Date().toLocaleString(), d: previo });
    while (hist.length > 6) { hist.shift(); }
    let txt = JSON.stringify(hist);
    while (txt.length > 45000 && hist.length > 1) { hist.shift(); txt = JSON.stringify(hist); }
    sh.getRange(7, 1).setValue(txt);
    sh.getRange(7, 2).setValue('Copias automaticas guardadas: ' + hist.length);
  } catch (err) {}
}

function leerCopias_() {
  try {
    const raw = getSheet_().getRange(7, 1).getValue();
    return raw ? JSON.parse(raw) : [];
  } catch (err) { return []; }
}

const CAMPOS_SALUD = ['activas', 'peso', 'sueno', 'suenoMin', 'fcReposo', 'vfc', 'fcCardioMax', 'fcCardioMedia', 'pasos', 'ejercicioMin'];

// Con valor util
function tieneSalud_(datos) {
  if (!datos) return false;
  for (let i = 0; i < CAMPOS_SALUD.length; i++) {
    if (datos[CAMPOS_SALUD[i]] !== undefined && datos[CAMPOS_SALUD[i]] !== '') return true;
  }
  return false;
}

// La clave viene en la URL aunque este vacia: sirve para distinguir
// "el Atajo no mando nada" de "el Atajo mando un campo vacio".
function pideSalud_(datos) {
  if (!datos) return false;
  for (let i = 0; i < CAMPOS_SALUD.length; i++) {
    if (datos[CAMPOS_SALUD[i]] !== undefined) return true;
  }
  return false;
}

function leerSalud_() {
  try {
    const raw3 = getSheet_().getRange(3, 1).getValue();
    return raw3 ? JSON.parse(raw3) : {};
  } catch (err) { return {}; }
}

function guardarSalud_(datos) {
  const sh = getSheet_();
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (err) {}
  try {
    let salud = leerSalud_();
    const dia = diaValido_(datos.fecha);
    salud[dia] = mezclarSalud_(salud[dia] || {}, datos);
    const dias = Object.keys(salud).sort();
    while (dias.length > 90) { delete salud[dias.shift()]; }   // ultimos 90 dias
    sh.getRange(3, 1).setValue(JSON.stringify(salud));
    sh.getRange(3, 2).setValue('Ultimo dato del Watch: ' + dia + ' (' + new Date().toLocaleString() + ')');
    return dia;
  } finally { try { lock.releaseLock(); } catch (err) {} }
}

// Atajos manda la fecha en el formato del idioma del iPhone (26/7/2026...).
// Si no llega exactamente como 2026-07-26, se usa la fecha del servidor.
function diaValido_(f) {
  const s = String(f || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : hoyISO_();
}

function hoyISO_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

// Acepta solo campos conocidos y numericos. Atajos suele mandar textos
// tipo "620 kcal" o "6,8": parseFloat los limpia igual.
// Rangos plausibles: si Atajos manda una lista pegada o una lectura absurda,
// se descarta y se conserva lo que ya habia. Evita que un dato corrupto
// contamine la app (un peso falso, por ejemplo, entraria a tu grafica).
const RANGOS = {
  activas: [1, 10000], peso: [30, 250], sueno: [0.1, 24],
  fcReposo: [25, 150], vfc: [1, 500],
  fcCardioMax: [40, 230], fcCardioMedia: [40, 230],
  pasos: [1, 200000], ejercicioMin: [1, 1440]
};

// Como agregar cuando el Atajo manda VARIOS valores (la lista del dia entera).
// Asi no hace falta que Shortcuts sume nada: lo hace el servidor.
const AGREGACION = {
  activas: 'suma', pasos: 'suma', ejercicioMin: 'suma', sueno: 'suma',
  fcCardioMax: 'max', fcCardioMedia: 'media', fcReposo: 'media', vfc: 'media',
  peso: 'ultimo'
};

function numerosDe_(txt) {
  const m = String(txt).match(/-?\d+(?:[.,]\d+)?/g);
  if (!m) return [];
  const out = [];
  m.forEach(function (s) {
    const v = parseFloat(s.replace(',', '.'));
    if (!isNaN(v)) out.push(v);
  });
  return out;
}

function valorDe_(campo, bruto) {
  const n = numerosDe_(bruto);
  if (!n.length) return NaN;
  if (n.length === 1) return n[0];
  const suma = n.reduce(function (a, b) { return a + b; }, 0);
  switch (AGREGACION[campo]) {
    case 'suma':  return suma;
    case 'max':   return Math.max.apply(null, n);
    case 'media': return suma / n.length;
    default:      return n[n.length - 1];
  }
}

function mezclarSalud_(previo, entrante) {
  const campos = ['activas', 'peso', 'sueno', 'fcReposo', 'vfc', 'fcCardioMax', 'fcCardioMedia', 'pasos', 'ejercicioMin'];
  const out = {};
  campos.forEach(function (k) { if (previo[k] !== undefined) out[k] = previo[k]; });
  campos.forEach(function (k) {
    if (entrante[k] === undefined || entrante[k] === '') return;
    const v = valorDe_(k, entrante[k]);
    if (isNaN(v) || v <= 0) return;
    const r = RANGOS[k];
    if (k !== 'sueno' && r && (v < r[0] || v > r[1])) return;   // el sueno se valida tras convertir unidades
    out[k] = Math.round(v * 100) / 100;
  });
  // El sueno puede llegar en horas, minutos o segundos segun como lo saque
  // Atajos. Se normaliza a horas por el tamano del numero: nadie duerme
  // 400 horas, ni 7 segundos.
  const bruto = out.sueno !== undefined ? out.sueno : valorDe_('sueno', entrante.suenoMin);
  if (!isNaN(bruto) && bruto > 0) {
    let horas = bruto;
    if (bruto > 1440) { horas = bruto / 3600; }        // segundos
    else if (bruto > 24) { horas = bruto / 60; }       // minutos
    horas = Math.round(horas * 100) / 100;
    if (horas >= RANGOS.sueno[0] && horas <= RANGOS.sueno[1]) { out.sueno = horas; }
    else { delete out.sueno; }
  }
  return out;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
