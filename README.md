# AplicacionGym — Macros Gym

Aplicación web (PWA) para registrar los **macros diarios** según el **tipo de entrenamiento** de cada día.
Pensada para **iPhone**: se instala desde Safari en la pantalla de inicio, se abre a pantalla completa
como una app normal y funciona sin conexión. No necesita App Store, Mac ni cuenta: los datos se guardan en el iPhone.

## Instalar en el iPhone

1. Publica la app en una dirección HTTPS (por ejemplo GitHub Pages:
   *Settings → Pages → Deploy from a branch*, rama `main`, carpeta `/`).
2. Abre esa dirección en **Safari** en el iPhone.
3. Toca **Compartir** (el cuadrado con la flecha) → **Añadir a pantalla de inicio**.
4. Ábrela desde el icono **Macros Gym**.

> Usa siempre la app desde el icono: así iOS conserva los datos. Haz de vez en cuando
> *Ajustes → Exportar JSON* (puedes guardarlo en Archivos/iCloud) como copia de seguridad.

## Funcionalidades

- **Día**: elige la fecha y el tipo de entrenamiento (viene del plan semanal y puedes cambiarlo).
  Ves tus objetivos de proteína, carbohidratos, grasas y calorías con barras de progreso y lo que te falta.
  - **Dieta por defecto**: hoy y los días futuros se rellenan solos con la dieta del tipo de entreno
    (desayuno, comida, merienda y cena), con las cantidades ajustadas a tus macros. Borra lo que no
    comas y añade solo los extras. Si cambias el tipo de día o tu peso, la dieta se recalcula
    (salvo que la hayas editado; entonces usa «Recalcular dieta»).
  - Añade comidas de tu lista de alimentos o personalizadas (en gramos, ml o unidades).
  - Carga la rutina de ejercicios del tipo de día y apunta series × reps × kg y marca los hechos.
- **Semana**: asigna un tipo de entrenamiento a cada día de la semana.
- **Entrenos**: crea/edita tipos de entrenamiento (Pierna, Empuje, Tirón, Full body, Cardio, Descanso…),
  cada uno con sus macros en **gramos por kg de peso**, su **dieta por defecto** (editable) y su lista de ejercicios.
- **Historial**: últimos 7/14/30/90 días con kcal consumidas vs objetivo, macros, ejercicios y medias.
- **Ajustes**: peso corporal, alimentos guardados y copia de seguridad (exportar/importar JSON).

Objetivo del día = g/kg del tipo de entrenamiento × peso. Calorías = 4·P + 4·C + 9·G.
Para ajustar la dieta, los alimentos se agrupan por su macro principal (proteína, carbohidrato o grasa)
y se calcula un factor por grupo que acerca el total a tu objetivo; las cantidades se redondean
a 5–10 g o a media unidad.

## Uso

```bash
npm start        # sirve la app en http://localhost:8080
npm test         # pruebas de la lógica (node --test)
```

Son archivos estáticos: se pueden publicar tal cual en GitHub Pages, Netlify, etc.

## Estructura

```
index.html        Estructura de la app
css/styles.css    Estilos (modo claro/oscuro, diseño móvil)
js/core.js        Lógica pura: cálculo de macros, fechas, plan semanal
js/app.js         Interfaz y almacenamiento (localStorage)
sw.js             Service worker para uso sin conexión
icons/            Iconos PNG (apple-touch-icon para iPhone)
test/             Pruebas unitarias
```
