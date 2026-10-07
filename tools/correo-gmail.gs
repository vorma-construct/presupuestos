/* Programa del correo para la app de presupuestos.
   Vive en tu propio Gmail y solo hace esto: deja que tu app vea los correos nuevos (el texto y los
   adjuntos) para hacerte los presupuestos sola. Solo contesta a quien tenga la clave de abajo.
   No borra ni manda ningún correo: solo pone la etiqueta «Presupuesto hecho» al correo del que ha
   salido un presupuesto, para que lo veas en Gmail. */
var CLAVE = '%%CLAVE%%';
var RATO = 15 * 60 * 1000;

function doGet(e) {
  var p = (e && e.parameter) || {}, r;
  if (!p.clave || p.clave !== CLAVE) r = {error: 'clave'};
  else {
    try {
      if (p.a === 'prueba') r = {ok: true, cuenta: yo(), version: 1};
      else if (p.a === 'lista') r = lista(p);
      else if (p.a === 'adjunto') r = adjunto(p);
      else if (p.a === 'coger') r = coger(p);
      else if (p.a === 'hecho') r = hecho(p);
      else r = {error: 'accion'};
    } catch (err) {
      r = {error: String((err && err.message) || err)};
    }
  }
  var t = JSON.stringify(r);
  if (p.cb && /^[A-Za-z_$][\w$]{0,60}$/.test(p.cb)) {
    return ContentService.createTextOutput(p.cb + '(' + t + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(t).setMimeType(ContentService.MimeType.JSON);
}

function yo() {
  try { return String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (e) { return ''; }
}
function cuenta(p) {
  var q = String(p.q || 'x');
  return /^[\w-]{1,40}$/.test(q) ? q : 'x';
}
function leer(k, d) {
  var v = PropertiesService.getScriptProperties().getProperty(k);
  if (!v) return d;
  try { return JSON.parse(v); } catch (e) { return d; }
}
function escribir(k, v) {
  PropertiesService.getScriptProperties().setProperty(k, JSON.stringify(v));
}

/* los correos que han llegado desde «desde» y que la app todavía no ha mirado */
function lista(p) {
  var q = cuenta(p), ahora = Date.now(), mio = yo();
  var desde = Number(p.desde) || 0;
  if (!(desde > 0)) desde = ahora - 3 * 864e5;
  desde = Math.max(desde, ahora - 30 * 864e5);
  var vistos = leer('v_' + q, []), cog = leer('c_' + q, {});
  var busca = 'after:' + Math.floor(desde / 1000) + ' -in:chats -in:drafts -category:promotions -category:social -category:forums';
  var hilos = [];
  for (var pg = 0; pg < 3; pg++) {
    var h = GmailApp.search(busca, pg * 50, 50);
    hilos = hilos.concat(h);
    if (h.length < 50) break;
  }
  var out = [], mas = false;
  for (var i = 0; i < hilos.length; i++) {
    var ms = hilos[i].getMessages();
    for (var j = 0; j < ms.length; j++) {
      var m = ms[j], id = m.getId();
      if (vistos.indexOf(id) >= 0) continue;
      var c = cog[id];
      if (c && ahora - c[0] < RATO && c[1] !== String(p.disp || '')) continue;
      var f = m.getDate().getTime();
      if (f < desde) continue;
      if (m.isDraft() || m.isInTrash()) continue;
      var de = String(m.getFrom() || '');
      if (mio && de.toLowerCase().indexOf(mio) >= 0) continue;
      if (out.length >= 15) { mas = true; continue; }
      var adj = [], as = m.getAttachments({includeInlineImages: true, includeAttachments: true});
      for (var k = 0; k < as.length; k++) {
        adj.push({i: k, nombre: String(as[k].getName() || ''), tipo: String(as[k].getContentType() || ''), tam: as[k].getSize()});
      }
      var lu = '';
      try { lu = m.getHeader('List-Unsubscribe') || ''; } catch (e) {}
      out.push({
        id: id, hilo: hilos[i].getId(), fecha: f, de: de, responder: String(m.getReplyTo() || ''),
        para: String(m.getTo() || ''), asunto: String(m.getSubject() || ''), boletin: !!lu, adjuntos: adj,
        texto: String(m.getPlainBody() || '').slice(0, lu ? 2000 : 30000),
        html: lu ? '' : String(m.getBody() || '').slice(0, 120000)
      });
    }
  }
  out.sort(function (a, b) { return a.fecha - b.fecha; });
  return {ok: true, ahora: ahora, cuenta: mio, mas: mas, correos: out};
}

/* un adjunto (foto, captura o PDF) en base64 */
function adjunto(p) {
  var m = GmailApp.getMessageById(String(p.id || ''));
  if (!m) return {error: 'no está'};
  var a = m.getAttachments({includeInlineImages: true, includeAttachments: true})[Number(p.i) || 0];
  if (!a) return {error: 'no está'};
  if (a.getSize() > 15 * 1024 * 1024) return {error: 'grande'};
  return {ok: true, nombre: String(a.getName() || ''), tipo: String(a.getContentType() || ''), b64: Utilities.base64Encode(a.getBytes())};
}

/* un correo lo coge un solo móvil: así, si los dos tenéis la app abierta, no sale el presupuesto dos veces */
function coger(p) {
  var q = cuenta(p), id = String(p.id || ''), d = String(p.disp || '');
  if (!id) return {error: 'id'};
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var vistos = leer('v_' + q, []), cog = leer('c_' + q, {}), ahora = Date.now();
    if (vistos.indexOf(id) >= 0) return {ok: false, por: 'visto'};
    var c = cog[id];
    if (c && ahora - c[0] < RATO && c[1] !== d) return {ok: false, por: 'otro'};
    cog[id] = [ahora, d];
    for (var k in cog) if (ahora - cog[k][0] > 864e5) delete cog[k];
    escribir('c_' + q, cog);
    return {ok: true};
  } finally {
    lock.releaseLock();
  }
}

/* mirado: ya no se vuelve a dar; si salió presupuesto (n), el correo lleva la etiqueta «Presupuesto hecho» */
function hecho(p) {
  var q = cuenta(p), ids = String(p.ids || p.id || '').split(',').filter(function (x) { return x; });
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var vistos = leer('v_' + q, []), cog = leer('c_' + q, {});
    ids.forEach(function (id) {
      if (vistos.indexOf(id) < 0) vistos.push(id);
      delete cog[id];
    });
    if (vistos.length > 400) vistos = vistos.slice(-400);
    escribir('v_' + q, vistos);
    escribir('c_' + q, cog);
  } finally {
    lock.releaseLock();
  }
  if (p.n && ids.length === 1) {
    try {
      var et = GmailApp.getUserLabelByName('Presupuesto hecho') || GmailApp.createLabel('Presupuesto hecho');
      GmailApp.getMessageById(ids[0]).getThread().addLabel(et);
    } catch (e) {}
  }
  return {ok: true};
}
