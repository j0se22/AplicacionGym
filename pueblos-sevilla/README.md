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

- **Pueblos**: los 106 municipios con buscador (sin importar tildes), filtro por comarca y por estado
  (valorados, sin valorar, 📌 quiero ir, ✅ visitados) y cuántos llevas valorados.
- **Ficha del pueblo**: nota global, media de cada aspecto, todas las valoraciones con comentario y
  recomendación (un bar, un plato, un alojamiento…), marcar «Quiero ir»/«Visitado», abrir en el mapa
  y compartir la nota.
- **Valorar**: estrellas por aspecto (puedes dejar sin puntuar lo que no conozcas; toca otra vez la
  misma estrella para quitarla), comentario, recomendación, nombre y fecha. Se puede editar y borrar.
- **Ranking**: los mejores pueblos en global o por aspecto (la mejor comida, la mejor gente…), de toda la
  provincia o de una comarca. A igualdad de nota gana el que tiene más valoraciones.
- **Mis valoraciones**: tus últimas valoraciones y tu lista de «Quiero ir».
- **Compartir con amigos**: en *Ajustes → Exportar* mandas un archivo por WhatsApp, correo…; quien lo
  *Importa* suma tus valoraciones a las suyas (sin duplicar ni borrar nada) y el ranking se recalcula.

### Cómo se calcula la nota

- Nota de una valoración = media de los aspectos puntuados.
- Nota global del pueblo = media de las notas de sus valoraciones (cada visita pesa igual).
- Nota de un aspecto = media de ese aspecto en las valoraciones que lo puntúan.

Los datos se guardan en el móvil (`localStorage`). Para que todo el mundo vea las valoraciones de todos
en tiempo real haría falta un servidor (por ejemplo Firebase o Supabase); es el siguiente paso natural.

## Uso en desarrollo

```bash
npm start        # sirve la app en http://localhost:8081
npm test         # pruebas de la lógica (node --test)
```

## Estructura

```
index.html        Estructura de la app
css/styles.css    Estilos (modo claro/oscuro, diseño móvil)
js/data.js        Los 106 municipios agrupados por comarca
js/core.js        Lógica pura: medias, ranking, búsqueda, importación
js/app.js         Interfaz y almacenamiento (localStorage)
sw.js             Service worker para uso sin conexión
icons/            Iconos PNG (apple-touch-icon para iPhone)
test/             Pruebas unitarias
```
