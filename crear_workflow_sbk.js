const https = require('https');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3NTI4Y2RjZC0xNTBmLTRmYjItYjc2MC1iNzE5NGQwODcwNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGI2NmVhNGYtZjkxZC00MjEyLTlmMjgtMDJiZGZmZTQyZmZhIiwiaWF0IjoxNzc0NDc3MzY2LCJleHAiOjE3NzcwMDMyMDB9.tRnqWXLKFv0tzE7R_KIWXLHlOM1kgNfi6HE-ivWhFIM';
const HOST = 'barralinstitute-n8n.nqsfgd.easypanel.host';
const SBK_URL = 'https://barralinstitute-sbk-generator.nqsfgd.easypanel.host';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: HOST, path, method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const r = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

const workflow = {
  name: "SBK — Generador de Carteles",
  nodes: [
    // ── 1. Formulario ────────────────────────────────────────────────────────
    {
      id: "form-trigger",
      name: "Formulario Cartel",
      type: "n8n-nodes-base.formTrigger",
      typeVersion: 2.2,
      position: [0, 0],
      webhookId: "sbk-cartel-2026",
      parameters: {
        formTitle: "SBK Party — Generar Cartel",
        formDescription: "Rellena los datos del evento y pulsa Generar",
        responseMode: "responseNode",
        formFields: {
          values: [
            { fieldLabel: "📅 Fecha del evento", fieldType: "date", requiredField: true },
            { fieldLabel: "👤 Profesor 1", fieldType: "text", requiredField: true, placeholder: "Nombre exacto (ej: Colombia)" },
            { fieldLabel: "👤 Profesor 2", fieldType: "text", requiredField: false, placeholder: "Opcional" },
            { fieldLabel: "👤 Profesor 3", fieldType: "text", requiredField: false, placeholder: "Opcional" },
            { fieldLabel: "👤 Profesor 4", fieldType: "text", requiredField: false, placeholder: "Opcional" },
            { fieldLabel: "👤 Profesor 5", fieldType: "text", requiredField: false, placeholder: "Opcional" },
            { fieldLabel: "💃 Taller 1 — Nombre", fieldType: "text", requiredField: true, placeholder: "Bachata" },
            { fieldLabel: "🕐 Taller 1 — Inicio", fieldType: "text", requiredField: true, placeholder: "18:00" },
            { fieldLabel: "🕐 Taller 1 — Fin",   fieldType: "text", requiredField: true, placeholder: "19:00" },
            { fieldLabel: "💃 Taller 2 — Nombre", fieldType: "text", requiredField: false, placeholder: "Opcional" },
            { fieldLabel: "🕐 Taller 2 — Inicio", fieldType: "text", requiredField: false, placeholder: "" },
            { fieldLabel: "🕐 Taller 2 — Fin",   fieldType: "text", requiredField: false, placeholder: "" },
            { fieldLabel: "💃 Taller 3 — Nombre", fieldType: "text", requiredField: false, placeholder: "Opcional" },
            { fieldLabel: "🕐 Taller 3 — Inicio", fieldType: "text", requiredField: false, placeholder: "" },
            { fieldLabel: "🕐 Taller 3 — Fin",   fieldType: "text", requiredField: false, placeholder: "" },
            { fieldLabel: "🎵 Social — Inicio", fieldType: "text", requiredField: true, placeholder: "19:00" },
            { fieldLabel: "🎵 Social — Cierre", fieldType: "text", requiredField: true, placeholder: "24:00" },
            { fieldLabel: "🎨 Estilo decorativo", fieldType: "text", requiredField: false, placeholder: "Bachata (aparece de fondo)" },
            {
              fieldLabel: "Entrada",
              fieldType: "dropdown",
              requiredField: true,
              fieldOptions: { values: [{ option: "Gratuita" }, { option: "De pago" }] }
            }
          ]
        }
      }
    },

    // ── 2. Obtener lista de profesores ────────────────────────────────────────
    {
      id: "get-profesores",
      name: "Obtener Profesores",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [280, 0],
      parameters: {
        method: "GET",
        url: SBK_URL + "/profesores",
        options: {}
      }
    },

    // ── 3. Construir payload ──────────────────────────────────────────────────
    {
      id: "preparar-payload",
      name: "Preparar Payload",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [560, 0],
      parameters: {
        jsCode: `
const form = $('Formulario Cartel').first().json;
const lista = $input.first().json;
const listaProfesores = Array.isArray(lista) ? lista : [];

function buscarProfesor(nombre) {
  if (!nombre || !nombre.trim()) return null;
  const n = nombre.trim().toLowerCase();
  const found = listaProfesores.find(p => p.nombre.toLowerCase() === n);
  return {
    nombre: nombre.trim(),
    foto_url: found ? '${SBK_URL}' + found.foto : ''
  };
}

const claves = [
  '📅 Fecha del evento',
  '👤 Profesor 1', '👤 Profesor 2', '👤 Profesor 3', '👤 Profesor 4', '👤 Profesor 5',
  '💃 Taller 1 — Nombre', '🕐 Taller 1 — Inicio', '🕐 Taller 1 — Fin',
  '💃 Taller 2 — Nombre', '🕐 Taller 2 — Inicio', '🕐 Taller 2 — Fin',
  '💃 Taller 3 — Nombre', '🕐 Taller 3 — Inicio', '🕐 Taller 3 — Fin',
  '🎵 Social — Inicio', '🎵 Social — Cierre',
  '🎨 Estilo decorativo', 'Entrada'
];
const f = {};
claves.forEach(k => { f[k] = form[k] || ''; });

const profesores = [f['👤 Profesor 1'],f['👤 Profesor 2'],f['👤 Profesor 3'],f['👤 Profesor 4'],f['👤 Profesor 5']]
  .map(buscarProfesor).filter(Boolean);

const talleres = [];
for (let i = 1; i <= 3; i++) {
  const nombre = f['💃 Taller ' + i + ' — Nombre'];
  if (nombre) talleres.push({
    nombre,
    inicio: f['🕐 Taller ' + i + ' — Inicio'],
    fin:    f['🕐 Taller ' + i + ' — Fin']
  });
}

return [{
  json: {
    fecha:          f['📅 Fecha del evento'],
    profesores,
    talleres,
    estilo_baile:   f['🎨 Estilo decorativo'] || (talleres[0] ? talleres[0].nombre : 'Bachata'),
    social_inicio:  f['🎵 Social — Inicio'],
    social_cierre:  f['🎵 Social — Cierre'],
    entrada_libre:  f['Entrada'] !== 'De pago',
    logo_habana_url: '${SBK_URL}/assets/fondos/habana.png'
  }
}];
`
      }
    },

    // ── 4. Generar imágenes ───────────────────────────────────────────────────
    {
      id: "generar-cartel",
      name: "Generar Cartel",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [840, 0],
      parameters: {
        method: "POST",
        url: SBK_URL + "/generate",
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json) }}",
        options: { timeout: 60000 }
      }
    },

    // ── 5. Página de respuesta con imágenes ───────────────────────────────────
    {
      id: "respuesta-html",
      name: "Preparar Respuesta",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1120, 0],
      parameters: {
        jsCode: `
const d = $input.first().json;
const reel = d.reel || '';
const post = d.post || '';
const fondo = d.fondo_usado || '';

const html = \`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cartel SBK generado</title>
<style>
  body { font-family: sans-serif; background: #111; color: #fff; padding: 24px; text-align: center; }
  h1 { color: #ffd700; margin-bottom: 8px; }
  p { color: #aaa; margin-bottom: 32px; font-size: 14px; }
  .grid { display: flex; gap: 32px; justify-content: center; flex-wrap: wrap; }
  .card { background: #1a1a2e; padding: 16px; border-radius: 12px; }
  .card h2 { font-size: 14px; color: #ffd700; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 2px; }
  img { max-width: 320px; border-radius: 8px; display: block; }
  a.btn {
    display: inline-block; margin-top: 12px;
    background: #ffd700; color: #111; font-weight: 700;
    padding: 10px 24px; border-radius: 8px; text-decoration: none;
    font-size: 14px;
  }
  .fondo { color: #555; font-size: 12px; margin-top: 24px; }
</style>
</head>
<body>
<h1>✅ Cartel generado</h1>
<p>Fondo usado: \${fondo}</p>
<div class="grid">
  <div class="card">
    <h2>Reel — 1080×1920</h2>
    <img src="data:image/jpeg;base64,\${reel}">
    <a class="btn" href="data:image/jpeg;base64,\${reel}" download="sbk_reel.jpg">⬇ Descargar Reel</a>
  </div>
  <div class="card">
    <h2>Post — 1080×1350</h2>
    <img src="data:image/jpeg;base64,\${post}">
    <a class="btn" href="data:image/jpeg;base64,\${post}" download="sbk_post.jpg">⬇ Descargar Post</a>
  </div>
</div>
</body>
</html>\`;

return [{ json: { html } }];
`
      }
    },

    // ── 6. Responder al formulario ────────────────────────────────────────────
    {
      id: "respond",
      name: "Responder",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [1400, 0],
      parameters: {
        respondWith: "text",
        responseBody: "={{ $json.html }}",
        options: {
          responseHeaders: {
            entries: [{ name: "Content-Type", value: "text/html; charset=utf-8" }]
          }
        }
      }
    }
  ],

  connections: {
    "Formulario Cartel": { main: [[{ node: "Obtener Profesores", type: "main", index: 0 }]] },
    "Obtener Profesores": { main: [[{ node: "Preparar Payload",  type: "main", index: 0 }]] },
    "Preparar Payload":   { main: [[{ node: "Generar Cartel",    type: "main", index: 0 }]] },
    "Generar Cartel":     { main: [[{ node: "Preparar Respuesta",type: "main", index: 0 }]] },
    "Preparar Respuesta": { main: [[{ node: "Responder",         type: "main", index: 0 }]] }
  },

  settings: { executionOrder: "v1" },
  staticData: null
};

(async () => {
  const result = await req('POST', '/api/v1/workflows', workflow);
  if (result.status === 200 || result.status === 201) {
    const id = result.body.id;
    console.log('Workflow creado. ID:', id);
    const activate = await req('POST', '/api/v1/workflows/' + id + '/activate');
    console.log('Activado:', activate.body.active ? 'SÍ' : 'NO');
    console.log('\n🎨 URL del formulario:');
    console.log('https://barralinstitute-n8n.nqsfgd.easypanel.host/form/sbk-cartel-2026');
  } else {
    console.log('Error:', result.status, JSON.stringify(result.body).substring(0, 300));
  }
})();
