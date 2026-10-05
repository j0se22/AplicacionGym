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
    Cada ejercicio muestra tu **última marca** para aplicar sobrecarga progresiva.
  - **Agua**: contador con objetivo de ~35 ml por kg.
- **Semana**: asigna un tipo de entrenamiento a cada día de la semana.
- **Progreso**:
  - **Fases**: volumen, volumen limpio, definición, mini-cut, recomposición, descanso de dieta y
    mantenimiento, con su fecha de inicio e historial. Cada fase cambia las kcal (±%), la proteína
    mínima, la grasa mínima y el ritmo de peso objetivo (todo editable). Opcional: peso objetivo.
  - **Peso y medidas** (cintura, % grasa) con **tendencia** que filtra las fluctuaciones diarias,
    gráfica y ritmo semanal comparado con el de tu fase.
  - **Ajuste adaptativo**: con 2-3 semanas de pesajes y comidas, calcula tu mantenimiento real
    (ingesta media − cambio de peso × 7700 kcal/kg) y te propone corregir los objetivos.
  - **Avisos**: descanso de dieta tras ~10 semanas de definición, duración máxima del mini-cut,
    peso objetivo alcanzado, ritmo demasiado rápido o lento.
- **Mis ejercicios** (en Entrenos): biblioteca con buscador, agrupada por músculo. Crea tus propios
  ejercicios con grupo muscular, tipo (con peso, peso corporal o cardio por tiempo), series/reps o
  minutos por defecto y notas de técnica. Si renombras uno, se actualiza en tus rutinas y en tu
  historial (no pierdes tus marcas); si lo borras, se quita de las rutinas pero el historial se conserva.
- **Entrenos**: crea/edita tipos de entrenamiento (Pierna, Empuje, Tirón, Full body, Cardio, Descanso…),
  cada uno con sus macros en **gramos por kg de peso**, su **dieta por defecto** (editable) y su lista de ejercicios.
- **Historial**: últimos 7/14/30/90 días con kcal consumidas vs objetivo, macros, ejercicios y medias.
- **Ajustes**: perfil (peso, sexo, edad, altura, actividad) con el **mantenimiento estimado**
  (Mifflin-St Jeor) y botón para ajustar tus entrenos a él; alimentos guardados; copia de seguridad.

### Cómo se calculan los macros del día

1. **Base (mantenimiento)** = g/kg del tipo de entreno × peso (tendencia) + ajuste adaptativo.
2. **Fase**: kcal × (1 ± %). La proteína sube al mínimo de la fase si hace falta, la grasa no baja
   de su mínimo y el resto se reparte entre carbos y grasas como en la base (se mantiene el
   ciclado: más carbos en pierna que en descanso).
3. Calorías = 4·P + 4·C + 9·G.

### Valores por defecto de las fases (basados en la evidencia)

| Fase | Kcal | Proteína | Ritmo de peso |
|---|---|---|---|
| Volumen | +15 % | ≥1,8 g/kg | +0,5 %/sem |
| Volumen limpio | +8 % | ≥1,8 g/kg | +0,25 %/sem |
| Mantenimiento | 0 % | ≥1,8 g/kg | 0 |
| Recomposición | −5 % | ≥2,2 g/kg | 0 |
| Definición | −20 % | ≥2,3 g/kg | −0,7 %/sem |
| Mini-cut (≤6 sem) | −30 % | ≥2,5 g/kg | −1 %/sem |
| Descanso de dieta (1-2 sem) | 0 % | ≥2,0 g/kg | 0 |

Fuentes: Iraki et al. 2019 (volumen: superávit 10-20 %, +0,25-0,5 %/sem, proteína 1,6-2,2 g/kg,
grasa 0,5-1,5 g/kg); Helms et al. 2014 e ISSN 2017 (definición: −0,5-1 %/sem, proteína
2,3-3,1 g/kg de masa magra, grasa 15-30 % de las kcal); Morton et al. 2018 (más de ~1,6 g/kg
apenas añade músculo fuera del déficit).
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
