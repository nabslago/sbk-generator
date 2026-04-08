const https = require('https');
const fs = require('fs');

const FAL_KEY = '872669df-3cbf-4d69-9f6f-b03f2bb1aea1:374e5bad8cad7bae22048dda7fdcbc19';
const SBK_URL = 'barralinstitute-sbk-generator.nqsfgd.easypanel.host';

const ESTILOS = [
  {
    nombre: 'ia_purpura_dorado',
    prompt: 'Dark dramatic nightclub background for a latin dance event poster, deep violet and purple bokeh lights, golden sparkles and light streaks, glamorous atmosphere, moody and vibrant, no text, no people, vertical 9:16'
  },
  {
    nombre: 'ia_azul_electrico',
    prompt: 'Dark electric blue nightclub background for a salsa dance event, deep navy base, bright electric blue and cyan light beams, silver glitter particles floating, modern and energetic, no text, no people, vertical 9:16'
  },
  {
    nombre: 'ia_rojo_cubano',
    prompt: 'Dark Cuban nightclub atmosphere background, deep crimson and burgundy tones, warm golden stage lights, red bokeh circles, rich and passionate ambiance, vintage Cuban glamour, no text, no people, vertical 9:16'
  },
  {
    nombre: 'ia_dorado_negro',
    prompt: 'Luxurious dark golden black background for a VIP latin dance event, black base with rich gold and amber bokeh lights, shimmering gold dust particles, exclusive and sophisticated nightclub feel, no text, no people, vertical 9:16'
  },
  {
    nombre: 'ia_tropical_neon',
    prompt: 'Tropical neon nightclub background for bachata event, dark teal and magenta neon glow, palm tree silhouettes barely visible in background, vibrant tropical party atmosphere, neon bokeh lights, no text, no people, vertical 9:16'
  },
  {
    nombre: 'ia_galaxia',
    prompt: 'Cosmic galaxy dance night background, deep space dark purple and navy, swirling nebula colors of pink magenta and blue, stardust and glitter particles, ethereal and dramatic, perfect for dance event poster, no text, no people, vertical 9:16'
  },
  {
    nombre: 'ia_habanero_calido',
    prompt: 'Warm Havana night atmosphere background, amber and orange bokeh city lights, warm golden glow, romantic Latin night, vintage warm tones with subtle art deco geometric patterns blurred in background, no text, no people, vertical 9:16'
  },
  {
    nombre: 'ia_azul_geometrico',
    prompt: 'Modern geometric dark blue background for dance event, deep navy with abstract diagonal light lines and geometric shapes, silver and blue metallic reflections, contemporary graphic design style for nightclub poster, no text, no people, vertical 9:16'
  },
  {
    nombre: 'ia_rosa_diamante',
    prompt: 'Dark rose gold diamond background for latin dance event, deep burgundy base, rose gold bokeh lights, scattered diamond sparkles and glitter, feminine and glamorous nightclub atmosphere, no text, no people, vertical 9:16'
  },
  {
    nombre: 'ia_verde_esmeralda',
    prompt: 'Deep emerald green and black nightclub background for salsa event, rich forest green bokeh lights, gold and green light streaks, luxurious dark atmosphere, no text, no people, vertical 9:16'
  }
];

function falGenerate(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      prompt,
      image_size: 'portrait_16_9',
      num_images: 1,
      num_inference_steps: 28,
      guidance_scale: 3.5
    });
    const options = {
      hostname: 'fal.run',
      path: '/fal-ai/flux-pro/v1.1',
      method: 'POST',
      headers: {
        'Authorization': 'Key ' + FAL_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const r = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { resolve({ error: d }); }
      });
    });
    r.on('error', reject);
    r.write(body);
    r.end();
  });
}

function descargarImagen(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod.get(url, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function subirFondo(nombre, buffer) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SBK_URL,
      path: '/fondos',
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg',
        'X-Filename': nombre + '.jpg',
        'Content-Length': buffer.length
      }
    };
    const r = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    r.on('error', reject);
    r.write(buffer);
    r.end();
  });
}

(async () => {
  console.log(`Generando ${ESTILOS.length} fondos con FLUX Pro...\n`);
  for (const estilo of ESTILOS) {
    process.stdout.write(`⏳ ${estilo.nombre}... `);
    try {
      const result = await falGenerate(estilo.prompt);
      if (!result.images || !result.images[0]) {
        console.log('ERROR fal:', JSON.stringify(result).substring(0, 150));
        continue;
      }
      const imgBuffer = await descargarImagen(result.images[0].url);
      const subida = await subirFondo(estilo.nombre, imgBuffer);
      console.log(subida.ok ? '✅ OK' : '❌ Error subiendo');
    } catch(e) {
      console.log('ERROR:', e.message);
    }
  }
  console.log('\n✅ Fondos IA generados y subidos.');
})();
