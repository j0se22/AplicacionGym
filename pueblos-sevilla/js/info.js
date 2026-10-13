// Información orientativa de los pueblos: qué ver, qué comer y fiestas destacadas.
// No está completa: solo se incluye lo más conocido. Las fechas de fiestas son aproximadas
// (mes) salvo las que dependen de la Semana Santa, que se calculan cada año.
//   ver: lugares imprescindibles · comer: productos o platos típicos
//   rutas: { name, desc } senderos y paseos conocidos
//   fiestas: { name, month } o { name, easter: [desde, hasta] } (días respecto al Domingo de Resurrección)

export const INFO = {
  sevilla: {
    ver: ['Catedral y Giralda', 'Real Alcázar', 'Plaza de España', 'Torre del Oro', 'Barrio de Triana'],
    comer: ['Espinacas con garbanzos', 'Pescaíto frito', 'Serranito', 'Torrijas'],
    fiestas: [
      { name: 'Feria de Abril', easter: [13, 20] },
      { name: 'Corpus Christi', easter: [60, 60] },
      { name: 'Velá de Santa Ana (Triana)', month: 7 },
    ],
  },
  'alcala-de-guadaira': {
    ver: ['Castillo de Alcalá', 'Parque de Oromana', 'Molinos del Guadaíra'],
    comer: ['Pan de Alcalá («Alcalá de los Panaderos»)'],
  },
  'dos-hermanas': {
    ver: ['Parque de La Alquería', 'Hacienda de Quintos'],
    fiestas: [{ name: 'Romería de Valme', month: 10 }],
  },
  carmona: {
    ver: ['Necrópolis romana', 'Alcázar de la Puerta de Sevilla', 'Alcázar del Rey Don Pedro', 'Iglesia de Santa María'],
    comer: ['Tortas de Carmona', 'Espinacas a la carmonense'],
  },
  'mairena-del-alcor': {
    ver: ['Castillo de Luna', 'Casa-Museo Bonsor'],
    fiestas: [
      { name: 'Feria de Mairena (una de las más antiguas)', month: 4 },
      { name: 'Festival de Cante Jondo Antonio Mairena', month: 9 },
    ],
  },
  ecija: {
    ver: ['«La ciudad de las torres»', 'Palacio de Peñaflor', 'Palacio de Benamejí', 'Plaza de España (El Salón)'],
    comer: ['Bizcochos marroquíes', 'Yemas de Écija'],
    fiestas: [{ name: 'Feria de Écija', month: 9 }],
  },
  osuna: {
    ver: ['Colegiata de Santa María', 'Antigua Universidad', 'Calle San Pedro', 'Las Canteras'],
    comer: ['Repostería conventual'],
    fiestas: [{ name: 'Feria de Osuna', month: 5 }],
  },
  estepa: {
    ver: ['Torre de la Victoria', 'Cerro de San Cristóbal («Balcón de Andalucía»)'],
    comer: ['Mantecados y polvorones'],
    fiestas: [{ name: 'Temporada del mantecado', month: 11 }],
  },
  marchena: {
    ver: ['Arco de la Rosa', 'Iglesia de San Juan (zurbaranes)', 'Palacio Ducal'],
  },
  'moron-de-la-frontera': {
    ver: ['Castillo de Morón', 'Monumento al Gallo'],
    comer: ['Aceitunas de mesa'],
    fiestas: [{ name: 'Festival Gazpacho Andaluz (flamenco)', month: 7 }],
  },
  utrera: {
    ver: ['Castillo de Utrera', 'Santuario de Consolación', 'Iglesia de Santa María de la Mesa'],
    comer: ['Mostachones de Utrera'],
    fiestas: [
      { name: 'Potaje Gitano (flamenco)', month: 6 },
      { name: 'Feria de Consolación', month: 9 },
    ],
  },
  lebrija: {
    ver: ['Iglesia de Santa María de la Oliva', 'Castillo', 'Peñas flamencas'],
    fiestas: [{ name: 'La Caracolá Lebrijana (flamenco)', month: 7 }],
  },
  'la-puebla-de-cazalla': {
    fiestas: [{ name: 'Reunión de Cante Jondo', month: 7 }],
  },
  coripe: {
    ver: ['Chaparro de la Vega (árbol singular)', 'Vía Verde de la Sierra'],
    fiestas: [{ name: 'Quema del Judas', easter: [0, 0] }],
  },
  algamitas: {
    ver: ['El Terril y Peñón de Algámitas (techo de la provincia)'],
  },
  'cazalla-de-la-sierra': {
    ver: ['La Cartuja de Cazalla', 'Iglesia de Nuestra Señora de la Consolación'],
    comer: ['Anís y licor de guindas de Cazalla', 'Setas y productos del ibérico'],
  },
  constantina: {
    ver: ['Castillo de Constantina', 'Barrio de la Morería', 'Parque Natural Sierra Norte'],
    comer: ['Jamón y embutido ibérico', 'Castañas'],
  },
  'san-nicolas-del-puerto': {
    ver: ['Cascadas del Huéznar', 'Cerro del Hierro', 'Vía Verde de la Sierra Norte'],
  },
  'el-pedroso': { ver: ['Parque Natural Sierra Norte'], comer: ['Productos del ibérico'] },
  guadalcanal: { ver: ['Miradores de la Sierra Norte', 'Iglesia de la Asunción'] },
  alanis: { ver: ['Castillo de Alanís'] },
  'almaden-de-la-plata': { ver: ['Cerro del Calvario', 'Vía de la Plata (Camino de Santiago)'] },
  'el-real-de-la-jara': { ver: ['Castillo de El Real de la Jara', 'Vía de la Plata'] },
  'el-castillo-de-las-guardas': { ver: ['Reserva natural (safari)'] },
  santiponce: {
    ver: ['Conjunto arqueológico de Itálica', 'Monasterio de San Isidoro del Campo'],
    fiestas: [{ name: 'Festival Internacional de Danza de Itálica', month: 7 }],
  },
  camas: { ver: ['Tesoro del Carambolo (réplica)'] },
  'valencina-de-la-concepcion': { ver: ['Dólmenes de La Pastora y Matarrubilla'] },
  'castilleja-de-guzman': { ver: ['Dolmen de Montelirio'] },
  'castilleja-de-la-cuesta': { comer: ['Tortas de aceite'], ver: ['Casa donde murió Hernán Cortés'] },
  olivares: { ver: ['Palacio del Conde-Duque', 'Colegiata de Santa María de las Nieves'] },
  'villanueva-del-ariscal': { comer: ['Mosto y vinos del Aljarafe'], ver: ['Bodegas tradicionales'] },
  umbrete: { comer: ['Mosto del Aljarafe'] },
  espartinas: { ver: ['Convento de Loreto'] },
  'villamanrique-de-la-condesa': {
    ver: ['Palacio de los Orleans-Borbón'],
    fiestas: [{ name: 'Paso de las hermandades del Rocío', easter: [44, 46] }],
  },
  aznalcazar: { ver: ['Puerta de Doñana', 'Pinares de Aznalcázar'] },
  'isla-mayor': { ver: ['Marismas del Guadalquivir', 'Arrozales'], comer: ['Arroz', 'Cangrejo de río'] },
  'la-puebla-del-rio': { ver: ['Cañada de los Pájaros', 'Reserva de la Dehesa de Abajo', 'Marismas'] },
  'coria-del-rio': { ver: ['Estatua de Hasekura Tsunenaga (vínculo con Japón)', 'Paseo del río'], comer: ['Albures y pescado de río'] },
  'los-palacios-y-villafranca': { comer: ['Tomate de Los Palacios'] },
  'el-palmar-de-troya': { ver: ['Basílica palmariana'] },
  'los-molares': { ver: ['Castillo de Los Molares'] },
  'el-coronil': { ver: ['Castillo de las Aguzaderas'] },
  montellano: { ver: ['Castillo de Cote'] },
  pruna: { ver: ['Castillo de Pruna'] },
  'martin-de-la-jara': { ver: ['Laguna del Gosque'] },
  lantejuela: { ver: ['Reserva natural de las lagunas'] },
  herrera: { ver: ['Termas romanas'] },
  casariche: { ver: ['Mosaicos de la villa romana de El Alcaparral'] },
  'la-luisiana': { ver: ['Pueblo de las Nuevas Poblaciones de Carlos III'] },
  'canada-rosal': { ver: ['Pueblo de las Nuevas Poblaciones de Carlos III'] },
  penaflor: { ver: ['Yacimiento romano de Celti', 'Ribera del Guadalquivir'] },
  'villanueva-del-rio-y-minas': { ver: ['Santuario romano de Munigua'] },
  'lora-del-rio': {
    ver: ['Santuario de la Virgen de Setefilla', 'Casa de los Leones'],
    fiestas: [{ name: 'Fiestas de la Virgen de Setefilla', month: 9 }],
  },
  cantillana: {
    fiestas: [{ name: 'Fiestas de la Asunción y la Divina Pastora', month: 8 }],
  },
  'la-algaba': { ver: ['Torre de los Guzmanes'] },
};

// Senderos y paseos conocidos (orientativo).
const RUTAS = {
  'san-nicolas-del-puerto': [
    { name: 'Sendero del Cerro del Hierro', desc: 'Circular entre las formaciones kársticas de una antigua mina de hierro.' },
    { name: 'Sendero de la Ribera del Huéznar', desc: 'Junto al río, con las cascadas del Huéznar.' },
    { name: 'Vía Verde de la Sierra Norte', desc: 'Antiguo trazado de tren, llano y apto para bici.' },
  ],
  'cazalla-de-la-sierra': [{ name: 'Vía Verde de la Sierra Norte', desc: 'Sale de la estación de Cazalla-Constantina hacia el Cerro del Hierro.' }],
  constantina: [{ name: 'Sendero de Los Castañares', desc: 'Entre castaños, junto al pueblo. Precioso en otoño.' }],
  coripe: [{ name: 'Vía Verde de la Sierra', desc: 'Antigua vía de tren entre Puerto Serrano y Olvera; pasa por el Chaparro de la Vega.' }],
  'alcala-de-guadaira': [{ name: 'Ruta de los Molinos del Guadaíra', desc: 'Por la ribera del río y el Parque de Oromana.' }],
  'almaden-de-la-plata': [
    { name: 'Vía de la Plata', desc: 'Etapa del Camino de Santiago por la sierra.' },
    { name: 'Subida al Cerro del Calvario', desc: 'Corta, con vistas al pueblo y la sierra.' },
  ],
  'el-real-de-la-jara': [{ name: 'Vía de la Plata', desc: 'Etapa del Camino de Santiago hacia Extremadura.' }],
  algamitas: [{ name: 'Subida a El Terril', desc: 'El techo de la provincia de Sevilla. Exigente, con vistas enormes.' }],
  aznalcazar: [{ name: 'Pinares de Aznalcázar y Vado del Quema', desc: 'Por el pinar, en el camino del Rocío.' }],
  'la-puebla-del-rio': [{ name: 'Dehesa de Abajo', desc: 'Paseo con observatorios de aves junto a la marisma.' }],
  lantejuela: [{ name: 'Paseo por las lagunas', desc: 'Observación de aves en la reserva natural.' }],
  estepa: [{ name: 'Subida al Cerro de San Cristóbal', desc: 'Del casco histórico a la Torre de la Victoria y el «Balcón de Andalucía».' }],
  osuna: [{ name: 'Paseo a Las Canteras', desc: 'Antiguas canteras de piedra a las afueras del pueblo.' }],
  sevilla: [{ name: 'Ribera del Guadalquivir y Parque del Alamillo', desc: 'Paseo llano junto al río, a pie o en bici.' }],
};
for (const [id, rutas] of Object.entries(RUTAS)) INFO[id] = { ...INFO[id], rutas };

// Domingo de Resurrección (algoritmo de Meeus/Jones/Butcher).
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export const SEMANA_SANTA = { name: 'Semana Santa', easter: [-7, 0] };

const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);

// Fechas (de inicio y fin) de una fiesta en un año. Para las de mes: todo el mes.
export function fiestaRange(fiesta, year) {
  if (fiesta.easter) {
    const e = easterSunday(year);
    return [addDays(e, fiesta.easter[0]), addDays(e, fiesta.easter[1])];
  }
  return [new Date(year, fiesta.month - 1, 1), new Date(year, fiesta.month, 0)];
}

export function townFiestas(townId) {
  return [...(INFO[townId]?.fiestas ?? []), SEMANA_SANTA];
}
