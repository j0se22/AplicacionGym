// Genera js/geo.js: coordenadas, código INE y contorno SVG de cada municipio.
// Datos: es-atlas (contornos del IGN) y spanish-cities-info (coordenadas del INE).
//
// Uso:
//   mkdir /tmp/geo && cd /tmp/geo && npm i es-atlas@0.6.0 spanish-cities-info@2.4.2 topojson-client@3.1.0 d3-geo@3.1.1
//   node pueblos-sevilla/tools/build-geo.mjs /tmp/geo
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { COMARCAS } from '../js/data.js';

const require = createRequire(pathToFileURL(process.argv[2] + '/').href);
const load = (mod) => import(pathToFileURL(require.resolve(mod)).href);
const { feature, merge } = await load('topojson-client');
const { geoMercator, geoPath } = await load('d3-geo');

const modules = process.argv[2] + '/node_modules/';
const topo = JSON.parse(readFileSync(modules + 'es-atlas/es/municipalities.json'));
const cities = JSON.parse(readFileSync(modules + 'spanish-cities-info/dist/data/cities.json')).Sevilla;

const geoms = topo.objects.municipalities.geometries.filter((g) => String(g.id).startsWith('41'));
const munis = feature(topo, { type: 'GeometryCollection', geometries: geoms });
const outline = merge(topo, geoms);

const WIDTH = 1000;
const projection = geoMercator().fitWidth(WIDTH, munis);
const path = geoPath(projection).digits(1);
const [[, y0], [, y1]] = path.bounds(munis);
const HEIGHT = Math.ceil(y1 - y0) + 2;
projection.translate([projection.translate()[0], projection.translate()[1] - y0 + 1]);

const slug = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const TOWNS = Object.values(COMARCAS).flat().map((name) => ({ id: slug(name), name }));
const byIne = new Map(cities.map(([name, ine, lat, lon]) => [ine, { name, lat, lon }]));
const out = {};
for (const town of TOWNS) {
  const city = cities.find(([name]) => name === town.name);
  if (!city) throw new Error('Sin coordenadas: ' + town.name);
  const ine = city[1];
  const f = munis.features.find((x) => String(x.id) === ine);
  if (!f) throw new Error('Sin contorno: ' + town.name);
  const { lat, lon } = byIne.get(ine);
  const [x, y] = projection([lon, lat]);
  out[town.id] = { ine, lat, lon, x: Math.round(x), y: Math.round(y), d: path(f) };
}

const file = fileURLToPath(new URL('../js/geo.js', import.meta.url));
writeFileSync(file, `// Generado por tools/build-geo.mjs — no editar a mano.
// Contornos: Instituto Geográfico Nacional (vía es-atlas). Coordenadas: INE (vía spanish-cities-info).
export const MAP_SIZE = { width: ${WIDTH}, height: ${HEIGHT} };
export const PROVINCE_PATH = ${JSON.stringify(path(outline))};
export const GEO = ${JSON.stringify(out)};
`);
console.log('OK', Object.keys(out).length, 'municipios', HEIGHT, 'px de alto');
