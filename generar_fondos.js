// Script para generar fondos bokeh y subirlos al servicio
// Uso: node generar_fondos.js
const https = require('https');
const http = require('http');

const SERVICE = 'https://barralinstitute-sbk-generator.nqsfgd.easypanel.host';

// 8 paletas de colores para fondos bokeh distintos
const paletas = [
  { nombre: 'fondo_morado_dorado', colores: ['#6a0dad','#b8860b','#4b0082','#ffd700','#800080'] },
  { nombre: 'fondo_azul_cyan',     colores: ['#00008b','#00ced1','#0000ff','#40e0d0','#1e90ff'] },
  { nombre: 'fondo_rojo_naranja',  colores: ['#8b0000','#ff4500','#dc143c','#ff6347','#b22222'] },
  { nombre: 'fondo_verde_esmeralda', colores: ['#006400','#00fa9a','#228b22','#7cfc00','#32cd32'] },
  { nombre: 'fondo_rosa_magenta',  colores: ['#8b008b','#ff1493','#c71585','#ff69b4','#da70d6'] },
  { nombre: 'fondo_azul_violeta',  colores: ['#4b0082','#7b68ee','#6a5acd','#9370db','#00bfff'] },
  { nombre: 'fondo_dorado_rojo',   colores: ['#8b4513','#daa520','#b8860b','#cd853f','#ff8c00'] },
  { nombre: 'fondo_turquesa_plata',colores: ['#008b8b','#b0c4de','#4682b4','#87ceeb','#00ced1'] },
];

function generarHTMLBokeh(colores) {
  const circulos = [];
  for (let i = 0; i < 60; i++) {
    const color = colores[Math.floor(Math.random() * colores.length)];
    const x = Math.random() * 1080;
    const y = Math.random() * 1920;
    const size = 40 + Math.random() * 280;
    const opacity = 0.08 + Math.random() * 0.25;
    const blur = 20 + Math.random() * 80;
    circulos.push(`<div style="
      position:absolute;
      left:${x - size/2}px;
      top:${y - size/2}px;
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background:${color};
      opacity:${opacity};
      filter:blur(${blur}px);
    "></div>`);
  }
  return `<!DOCTYPE html>
<html><head><style>
  * { margin:0; padding:0; }
  body { width:1080px; height:1920px; background:#030008; overflow:hidden; }
</style></head>
<body>${circulos.join('')}</body></html>`;
}

async function screenshot(html) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ html });
    const options = {
      hostname: 'barralinstitute-sbk-generator.nqsfgd.easypanel.host',
      path: '/screenshot',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const d = Buffer.concat(chunks);
        try { resolve(JSON.parse(d.toString())); } catch(e) { resolve({ error: d.toString() }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function subirFondo(nombre, base64) {
  return new Promise((resolve, reject) => {
    const imgBuffer = Buffer.from(base64, 'base64');
    const options = {
      hostname: 'barralinstitute-sbk-generator.nqsfgd.easypanel.host',
      path: '/fondos',
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg',
        'X-Filename': nombre + '.jpg',
        'Content-Length': imgBuffer.length
      }
    };
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(imgBuffer);
    req.end();
  });
}

(async () => {
  for (const p of paletas) {
    process.stdout.write(`Generando ${p.nombre}... `);
    const html = generarHTMLBokeh(p.colores);
    const result = await screenshot(html);
    if (result.error) {
      console.log('ERROR:', result.error.substring(0, 100));
      continue;
    }
    const subida = await subirFondo(p.nombre, result.image);
    console.log(subida.ok ? 'OK' : 'ERROR subiendo');
  }
  console.log('\nListo. Fondos generados:', paletas.length);
})();
