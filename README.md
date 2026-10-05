# AplicacionGym — Macros Gym

Aplicación web (PWA) para registrar los **macros diarios** según el **tipo de entrenamiento** de cada día.
Funciona en el móvil, se puede instalar en la pantalla de inicio y funciona sin conexión.
No necesita servidor ni cuenta: los datos se guardan en el navegador.

## Funcionalidades

- **Día**: elige la fecha y el tipo de entrenamiento (viene del plan semanal y puedes cambiarlo).
  Ves tus objetivos de proteína, carbohidratos, grasas y calorías con barras de progreso y lo que te falta.
  - Añade comidas de tu lista de alimentos o personalizadas (con raciones).
  - Carga la rutina de ejercicios del tipo de día y apunta series × reps × kg y marca los hechos.
- **Semana**: asigna un tipo de entrenamiento a cada día de la semana.
- **Entrenos**: crea/edita tipos de entrenamiento (Pierna, Empuje, Tirón, Full body, Cardio, Descanso…),
  cada uno con sus macros en **gramos por kg de peso** y su lista de ejercicios.
- **Historial**: últimos 7/14/30/90 días con kcal consumidas vs objetivo, macros, ejercicios y medias.
- **Ajustes**: peso corporal, alimentos guardados y copia de seguridad (exportar/importar JSON).

Objetivo del día = g/kg del tipo de entrenamiento × peso. Calorías = 4·P + 4·C + 9·G.

## Uso

```bash
npm start        # sirve la app en http://localhost:8080
npm test         # pruebas de la lógica (node --test)
```

También se puede publicar tal cual en GitHub Pages (son archivos estáticos).

## Estructura

```
index.html        Estructura de la app
css/styles.css    Estilos (modo claro/oscuro, diseño móvil)
js/core.js        Lógica pura: cálculo de macros, fechas, plan semanal
js/app.js         Interfaz y almacenamiento (localStorage)
sw.js             Service worker para uso sin conexión
test/             Pruebas unitarias
```
