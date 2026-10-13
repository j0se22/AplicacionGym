# Pueblos de Sevilla

App móvil (PWA) para **puntuar los 106 pueblos de la provincia de Sevilla** por aspectos:
🍽️ comida, 🏛️ lugar y monumentos, 🛏️ estancia y alojamiento, 🤝 gente, 💃 fiestas y ambiente,
🌳 naturaleza y entorno y 💶 precios (de 1 a 5 estrellas).

Funciona en **iPhone y Android** sin pasar por la App Store ni Google Play: se instala desde el
navegador, se abre a pantalla completa y funciona sin conexión.

## Instalar

1. Publica la app en una dirección HTTPS (por ejemplo GitHub Pages: *Settings → Pages → Deploy from a
   branch*, rama `main`, carpeta `/`; la app quedará en `https://<usuario>.github.io/AplicacionGym/pueblos-sevilla/`).
2. **iPhone**: ábrela en Safari → **Compartir** → **Añadir a pantalla de inicio**.
3. **Android**: ábrela en Chrome → menú ⋮ → **Instalar aplicación** (o «Añadir a pantalla de inicio»).

## Funcionalidades

- **🏘️ Pueblos** — lista con buscador y filtros, o **🗺️ mapa** de la provincia con cada municipio coloreado
  según su nota (o según tus visitas: visitado / quiero ir / pendiente). Se puede ampliar y tocar cada pueblo.
- **Ficha del pueblo** — nota global y por aspecto, distancia a Sevilla, **📸 qué ver, 🍴 qué comer y
  🎉 fiestas**, **📷 fotos** de las valoraciones, **📍 sitios recomendados** (bares, restaurantes,
  alojamientos… con su nota y «cómo llegar»), «Quiero ir», «Visitado», añadir a la ruta y **🖼️ tarjeta**
  (imagen lista para WhatsApp o Instagram).
- **📅 Plan para un día** en cada pueblo: desayuno, qué ver, ruta, comida, tarde y (si está lejos) dónde dormir.
  Usa primero lo que recomienda la gente, después los sitios del mapa y, si no hay nada, un consejo.
- **✨ Recomendaciones** en cada pueblo, por apartados: ☕ desayunar, 🍽️ comer, 🛏️ dormir, 🥾 rutas y 📸 ver.
  - **👍 Recomendado por la gente**: los sitios que habéis recomendado y puntuado, los mejores primero.
  - **🗺️ En el mapa**: cafeterías, panaderías, bares, restaurantes, alojamientos, miradores y senderos reales
    del pueblo según **OpenStreetMap** (con horario y distancia cuando los hay). Con ⭐ lo puntúas y pasa a
    «recomendado por la gente». Se descargan desde el móvil al abrir la ficha y se guardan una semana.
  - Rutas conocidas (14 pueblos) y botón «Buscar más» en Google Maps o Wikiloc.
- **⭐ Valorar** — estrellas por aspecto, comentario, recomendación y hasta 6 fotos (se reducen para que ocupen poco).
- **🏆 Ranking** — global, **🎯 Para ti** (según lo que más te importa, en Ajustes) o por aspecto; de toda la
  provincia o de una comarca.
- **🧭 Explorar**
  - **🎲 Pueblo sorpresa**: elige uno al azar que no conozcas o de tu lista, a la distancia que quieras.
  - **🚗 Rutas**: arma tu ruta (se ordena para hacer menos kilómetros saliendo de Sevilla) y ábrela en
    Google Maps, o pide una **ruta sugerida de un día** por comarca.
  - **🎉 Próximas fiestas** de los dos próximos meses. La Semana Santa, la Feria de Abril, el Corpus y el
    Rocío se calculan con la fecha exacta de cada año.
- **🛂 Pasaporte** — un sello por cada pueblo visitado, **logros** (10, 25, 50 y 106 pueblos, comarcas
  completas, fotos, sitios…), tu lista «Quiero ir» y tus valoraciones.
- **⚙️ Ajustes** — tu nombre, tus prioridades, valoraciones compartidas, exportar/importar.

## 🌍 Valoraciones compartidas (Supabase, gratis)

Sin configurar nada, cada móvil guarda sus datos y se pueden compartir con *Ajustes → Exportar/Importar*.
Para que **todos veáis las valoraciones, sitios y fotos de todos automáticamente**:

1. Crea una cuenta y un proyecto en [supabase.com](https://supabase.com) (el plan gratuito sobra).
2. En **Authentication → Sign In / Providers**, activa **Allow anonymous sign-ins**.
3. En **SQL Editor → New query**, pega el contenido de [`supabase.sql`](supabase.sql) y pulsa **Run**.
   Crea las tablas, la carpeta de fotos y las reglas de seguridad.
4. En **Project Settings → API** copia la **Project URL** y la clave **anon public**.
5. En la app, *Ajustes → Valoraciones compartidas*, pega los dos datos y pulsa **Conectar**.
   Pásale esos dos datos a tus amigos para que hagan lo mismo.

Cómo funciona: cada móvil entra con una sesión anónima (sin registrarse). Todo el mundo puede **leer**
todo, pero cada móvil solo puede **editar y borrar lo suyo** (lo impone la base de datos, no la app).
Lo que hagas sin conexión se sube la próxima vez que abras la app con internet. La clave *anon* es pública
por diseño; la seguridad la dan las reglas de `supabase.sql`. Si reinstalas la app o borras los datos del
navegador, tus valoraciones anteriores siguen publicadas pero ya no podrás editarlas desde ese móvil.

## Actualizaciones

Cuando se publica una versión nueva, la app la descarga sola y se recarga la siguiente vez que la abres.

## Cómo se calcula la nota

- Nota de una valoración = media de los aspectos puntuados.
- Nota global del pueblo = media de las notas de sus valoraciones (cada visita pesa igual).
- Nota de un aspecto = media de ese aspecto en las valoraciones que lo puntúan.
- Nota «para ti» = media de los aspectos del pueblo ponderada por tus prioridades (0 a 3).

## Datos

- Contornos de los municipios: Instituto Geográfico Nacional (vía [es-atlas](https://www.npmjs.com/package/es-atlas)).
- Coordenadas: INE (vía [spanish-cities-info](https://www.npmjs.com/package/spanish-cities-info)).
  Las distancias son en línea recta.
- Qué ver, qué comer, rutas y fiestas (`js/info.js`): selección orientativa; se puede ampliar.
- Bares, restaurantes, alojamientos y senderos: © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright),
  consultados en directo con la API de Overpass. No están valorados: la nota la ponéis vosotros.

## Uso en desarrollo

```bash
npm start        # sirve la app en http://localhost:8081
npm test         # pruebas (lógica, mapa, rutas, fiestas y sincronización con un Supabase simulado)
```

Para regenerar el mapa: ver las instrucciones al principio de `tools/build-geo.mjs`.

## Estructura

```
index.html          Estructura de la app
css/styles.css      Estilos (modo claro/oscuro, diseño móvil)
js/data.js          Los 106 municipios agrupados por comarca
js/geo.js           Coordenadas y contornos del mapa (generado)
js/info.js          Qué ver, qué comer y fiestas; cálculo de la Semana Santa
js/core.js          Lógica pura: notas, ranking, rutas, logros, fiestas, unión de datos
js/nearby.js        Sitios cercanos de OpenStreetMap (Overpass)
js/photos.js        Fotos en el móvil (IndexedDB)
js/sync.js          Valoraciones compartidas con Supabase (API REST)
js/app.js           Interfaz
supabase.sql        Tablas y reglas de seguridad para Supabase
tools/build-geo.mjs Generador de js/geo.js
sw.js               Service worker para uso sin conexión
test/               Pruebas
```
