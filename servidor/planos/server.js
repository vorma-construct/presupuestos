// Servidor pequeño: recibe un plano en PDF y devuelve las partidas medidas, para que la app les ponga precio.
// Variables: GEMINI_API_KEY (obligatoria), GEMINI_MODEL (opcional), ORIGENES (webs que pueden llamarlo), CLAVE_APP (opcional).
const http = require('http');
const KEY = process.env.GEMINI_API_KEY || '';
let MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ORIGENES = (process.env.ORIGENES || 'https://reformas-lucas.github.io,https://vorma-construct.github.io').split(',').map(s => s.trim());
const CLAVE = process.env.CLAVE_APP || '';
const PROMPT = `Eres un aparejador con experiencia en reformas y obra pequeña en Bizkaia. Te paso un plano en PDF (planta, alzados, secciones, detalles, notas).
Haz la MEDICIÓN completa de la obra que muestra el plano, para presupuestarla partida por partida, como en un presupuesto profesional.
Reglas:
- Solo trabajos que el plano indica o que son imprescindibles para hacerlo (por ejemplo, la excavación de una zapata que aparece dibujada). Nada inventado.
- Calcula cada cantidad con las cotas del plano y explica el cálculo en "calculo" (por ejemplo "6,19 m de muro × 0,60 × 0,90").
- Si una medida no se puede sacar, estímala de forma razonable y pon "supuesto": true.
- Agrupa por capítulos en este orden cuando apliquen: Demoliciones, Movimiento de tierras y cimentación, Solera, Estructura, Muros y fábricas, Cubierta, Revestimientos y pintura, Carpintería, Fontanería y sanitarios, Electricidad, Residuos.
- Unidades: m, m2, m3, ud, h, kg.
- Descripción en castellano, como partida de presupuesto, con materiales y medidas que dice el plano.
- Saca también la dirección de la obra, el nombre del cliente si aparece, el número de expediente si lo hay y las advertencias del propio plano (lo que dice que hay que comprobar).
Devuelve SOLO JSON con esta forma:
{"obra":"","direccion":"","cliente":"","expediente":"","resumen":"","supuestos":[""],"partidas":[{"capitulo":"","descripcion":"","unidad":"","cantidad":0,"calculo":"","supuesto":false,"familia":""}]}
En "familia" pon el id del trabajo del CATÁLOGO que más se parezca a esa partida (misma clase de trabajo y misma unidad si puede ser); si ninguno se parece, déjalo vacío.`;
function cors(req, res) {
  const o = req.headers.origin || '';
  if (ORIGENES.includes(o) || o.startsWith('http://localhost')) res.setHeader('Access-Control-Allow-Origin', o);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Clave');
}
function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); }
async function modeloDisponible() {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${KEY}`); const j = await r.json();
  const ms = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent') && /flash|pro/.test(m.name) && !/lite|tts|image|embed|live|preview/.test(m.name))
    .map(m => m.name.replace('models/', '')).sort((a, b) => (parseFloat((b.match(/\d+(\.\d+)?/) || [0])[0]) - parseFloat((a.match(/\d+(\.\d+)?/) || [0])[0])) || (/flash/.test(a) ? -1 : 1));
  return ms[0];
}
async function leerPlano(pdf64, catalogo, otra) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const body = { contents: [{ role: 'user', parts: [{ text: PROMPT + (catalogo ? '\n\nCATÁLOGO (id | unidad | trabajo):\n' + String(catalogo).slice(0, 60000) : '') }, { inline_data: { mime_type: 'application/pdf', data: pdf64 } }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } };
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) {
    if (!otra && (r.status === 404 || r.status === 400 && /model/i.test((j.error || {}).message || ''))) { const m = await modeloDisponible(); if (m && m !== MODEL) { MODEL = m; return leerPlano(pdf64, catalogo, true); } }
    throw new Error((j.error && j.error.message) || ('Gemini ' + r.status));
  }
  const txt = (((j.candidates || [])[0] || {}).content || {}).parts?.map(p => p.text || '').join('') || '';
  const limpio = txt.replace(/^```(json)?/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(limpio);
}
http.createServer((req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method === 'GET') return json(res, 200, { ok: true, servicio: 'planos-ia', modelo: MODEL, clave: !!KEY });
  if (req.method !== 'POST' || !req.url.startsWith('/plano')) return json(res, 404, { error: 'no existe' });
  if (CLAVE && req.headers['x-clave'] !== CLAVE) return json(res, 401, { error: 'sin permiso' });
  if (!KEY) return json(res, 500, { error: 'falta GEMINI_API_KEY en el servidor' });
  let datos = '', tam = 0;
  req.on('data', c => { tam += c.length; if (tam > 25e6) { req.destroy(); } else datos += c; });
  req.on('end', async () => {
    try { const { pdf, catalogo } = JSON.parse(datos || '{}'); if (!pdf) return json(res, 400, { error: 'falta el pdf' });
      const t0 = Date.now(); const out = await leerPlano(pdf, catalogo); out.ms = Date.now() - t0; json(res, 200, out);
    } catch (e) { json(res, 502, { error: String(e.message || e) }); }
  });
}).listen(process.env.PORT || 8080, () => console.log('planos-ia escuchando, modelo', MODEL));
