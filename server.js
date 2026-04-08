const express = require('express');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use('/assets', express.static('/app/assets'));

const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
const TEMPLATE_PATH = path.join(__dirname, 'template.html');

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRandomUnusedBackground(usedList = []) {
  const fondosDir = '/app/assets/fondos';
  const all = fs.readdirSync(fondosDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  const unused = all.filter(f => !usedList.includes(f));
  const pool = unused.length > 0 ? unused : all; // si todos usados, resetea
  return pool[Math.floor(Math.random() * pool.length)];
}

async function renderImage(data, width, height) {
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    headless: true
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });

    let html = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    html = html.replace('__DATA__', JSON.stringify({ ...data, width, height }));

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const buffer = await page.screenshot({ type: 'jpeg', quality: 95 });
    return buffer.toString('base64');
  } finally {
    await browser.close();
  }
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

// Genera reel (1080×1920) + post (1080×1350)
app.post('/generate', async (req, res) => {
  try {
    const data = req.body;

    // Elegir fondo si no viene especificado
    if (!data.fondo) {
      data.fondo = getRandomUnusedBackground(data.fondos_usados || []);
    }
    data.fondo_url = `http://localhost:3000/assets/fondos/${data.fondo}`;

    const [reel, post] = await Promise.all([
      renderImage(data, 1080, 1920),
      renderImage(data, 1080, 1350)
    ]);

    res.json({
      reel,           // base64 JPEG 1080×1920
      post,           // base64 JPEG 1080×1350
      fondo_usado: data.fondo
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Lista fondos disponibles (con flag de usados)
app.get('/fondos', (req, res) => {
  const fondosDir = '/app/assets/fondos';
  const files = fs.readdirSync(fondosDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  res.json(files.map(f => ({
    nombre: f,
    url: `http://localhost:3000/assets/fondos/${f}`
  })));
});

// Subir fondo nuevo
app.post('/fondos', express.raw({ type: 'image/*', limit: '20mb' }), (req, res) => {
  const nombre = req.headers['x-filename'] || `fondo_${Date.now()}.jpg`;
  const dest = path.join('/app/assets/fondos', nombre);
  fs.writeFileSync(dest, req.body);
  res.json({ ok: true, nombre });
});

// Lista profesores
app.get('/profesores', (req, res) => {
  const dir = '/app/assets/profesores';
  const metaPath = path.join(dir, 'profesores.json');
  const data = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath)) : [];
  res.json(data);
});

// Añadir o actualizar profesor
app.post('/profesores', express.json({ limit: '20mb' }), (req, res) => {
  const dir = '/app/assets/profesores';
  const metaPath = path.join(dir, 'profesores.json');
  const lista = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath)) : [];

  const { nombre, foto_base64, extension } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre requerido' });

  const ext = extension || 'jpg';
  const filename = nombre.toLowerCase().replace(/\s+/g, '_') + '.' + ext;
  const filepath = path.join(dir, filename);

  if (foto_base64) {
    fs.writeFileSync(filepath, Buffer.from(foto_base64, 'base64'));
  }

  const idx = lista.findIndex(p => p.nombre.toLowerCase() === nombre.toLowerCase());
  const entry = { nombre, foto: `/assets/profesores/${filename}` };
  if (idx >= 0) lista[idx] = entry; else lista.push(entry);

  fs.writeFileSync(metaPath, JSON.stringify(lista, null, 2));
  res.json({ ok: true, profesor: entry });
});

// Eliminar profesor
app.delete('/profesores/:nombre', (req, res) => {
  const dir = '/app/assets/profesores';
  const metaPath = path.join(dir, 'profesores.json');
  let lista = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath)) : [];
  lista = lista.filter(p => p.nombre.toLowerCase() !== req.params.nombre.toLowerCase());
  fs.writeFileSync(metaPath, JSON.stringify(lista, null, 2));
  res.json({ ok: true });
});

// Renderizar HTML arbitrario → JPEG base64 (para generar fondos)
app.post('/screenshot', async (req, res) => {
  try {
    const { html, width = 1080, height = 1920 } = req.body;
    if (!html) return res.status(400).json({ error: 'html requerido' });
    const browser = await puppeteer.launch({
      executablePath: CHROMIUM_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      headless: true
    });
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const buffer = await page.screenshot({ type: 'jpeg', quality: 95 });
    await browser.close();
    res.json({ image: buffer.toString('base64') });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Generar PDF desde HTML
app.post('/pdf', async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) return res.status(400).json({ error: 'html requerido' });
    const browser = await puppeteer.launch({
      executablePath: CHROMIUM_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      headless: true
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' }
    });
    await browser.close();
    res.json({ pdf: pdfBuffer.toString('base64'), size: pdfBuffer.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(3000, () => console.log('SBK Generator en puerto 3000'));
