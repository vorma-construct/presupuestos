// Lector de planos para Cloudflare Workers (gratis). Variable secreta: GEMINI_API_KEY. Opcional: ORIGENES.
let MODEL = '';
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
async function modeloDisponible(env) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${env.GEMINI_API_KEY}`); const j = await r.json();
  const ms = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent') && /flash|pro/.test(m.name) && !/lite|tts|image|embed|live|preview/.test(m.name))
    .map(m => m.name.replace('models/', '')).sort((a, b) => (parseFloat((b.match(/\d+(\.\d+)?/) || [0])[0]) - parseFloat((a.match(/\d+(\.\d+)?/) || [0])[0])) || (/flash/.test(a) ? -1 : 1));
  return ms[0];
}
async function leerPlano(env, pdf64, catalogo, otra) {
  if (!MODEL) MODEL = (await modeloDisponible(env)) || 'gemini-3.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  const body = { contents: [{ role: 'user', parts: [{ text: PROMPT + (catalogo ? '\n\nCATÁLOGO (id | unidad | trabajo):\n' + String(catalogo).slice(0, 60000) : '') }, { inline_data: { mime_type: 'application/pdf', data: pdf64 } }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } };
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) {
    if (!otra && (r.status === 404 || r.status === 400 && /model/i.test((j.error || {}).message || ''))) { const m = await modeloDisponible(env); if (m && m !== MODEL) { MODEL = m; return leerPlano(env, pdf64, catalogo, true); } }
    throw new Error((j.error && j.error.message) || ('Gemini ' + r.status));
  }
  const txt = (((j.candidates || [])[0] || {}).content || {}).parts?.map(p => p.text || '').join('') || '';
  const limpio = txt.replace(/^```(json)?/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(limpio);
}

export default {
  async fetch(req, env) {
    const ORIG = (env.ORIGENES || 'https://reformas-lucas.github.io,https://vorma-construct.github.io').split(',').map(s => s.trim());
    const o = req.headers.get('Origin') || ''; if (env.GEMINI_MODEL && !MODEL) MODEL = env.GEMINI_MODEL;
    const h = { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Clave', 'Content-Type': 'application/json; charset=utf-8' };
    if (ORIG.includes(o) || o.startsWith('http://localhost')) h['Access-Control-Allow-Origin'] = o;
    const R = (c, x) => new Response(JSON.stringify(x), { status: c, headers: h });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (req.method === 'GET') return R(200, { ok: true, servicio: 'planos-ia', clave: !!env.GEMINI_API_KEY, modelo: MODEL || 'automático' });
    if (!env.GEMINI_API_KEY) return R(500, { error: 'falta GEMINI_API_KEY' });
    try { const { pdf, catalogo } = await req.json(); if (!pdf) return R(400, { error: 'falta el pdf' });
      const t0 = Date.now(); const out = await leerPlano(env, pdf, catalogo); out.ms = Date.now() - t0; return R(200, out);
    } catch (e) { return R(502, { error: String(e.message || e) }); }
  }
};
