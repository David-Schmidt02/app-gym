# Gym

> **Versión** 1.3.1 · **Última actualización** 2026-10-29 · [Desarrollo, APK e historial de versiones](docs/DESARROLLO.md)

Libreta de gimnasio que te dice qué toca hoy, con cuánto peso arrancar cada ejercicio y cuándo descargar. La hice para volver a entrenar después de mucho tiempo con un plan que crece conmigo: dos días por semana al principio, después tres y en unos meses cuatro.

Esta rama es la **app Android**: todo queda en el teléfono, anda sin señal en el gimnasio y no necesita servidor. La versión web, con backend propio, está en [`main`](https://github.com/David-Schmidt02/app-gym).

[![APK](https://github.com/David-Schmidt02/app-gym/actions/workflows/apk.yml/badge.svg?branch=mobile-nativo)](https://github.com/David-Schmidt02/app-gym/actions/workflows/apk.yml)
![Android](https://img.shields.io/badge/Android-3DDC84?logo=android&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/capturas/celular-oscuro.webp">
  <img src="docs/capturas/celular-claro.webp" alt="Hoy con la semana y el entrenamiento que toca, Entrenar con la sugerencia de peso, Progreso de la sentadilla y Cuerpo con el peso y las medidas, en el celular" width="100%">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/capturas/escritorio-hoy-oscuro.webp">
  <img src="docs/capturas/escritorio-hoy-claro.webp" alt="Hoy en pantalla grande: la semana con lo hecho y lo programado, el Día B que toca, en qué semana del ciclo estás y los últimos entrenamientos" width="100%">
</picture>

<sub>Las capturas usan datos inventados: ocho semanas de la rutina de 2 días. Siguen el tema claro u oscuro de GitHub, igual que la app sigue el del dispositivo.</sub>

## Qué hace

- **Hoy**: en qué semana del ciclo estás (adaptación, progresión o descarga), la semana con lo hecho y lo programado, y el entrenamiento que toca, listo para empezar. Si un día no podés, «Pasar a mañana» corre lo que sigue respetando los días de descanso.
- **Entrenar**: cada ejercicio muestra lo que hiciste la vez pasada y la sugerencia de hoy con su motivo («Mismo peso: buscá sumar una rep»). Las series ya vienen con el peso; pesos y reps se ajustan deslizando el dedo sobre un carrusel, sin abrir el teclado. Marcás la serie y arranca el descanso. Si cerrás la app a mitad de camino, lo anotado sigue ahí.
- **Progreso**: por ejercicio, el récord de peso, el 1RM estimado y la curva de cada sesión, con las descargas marcadas. Desde ahí se corrige o se borra cualquier entrenamiento.
- **Cuerpo**: peso, cintura, cadera, pecho, brazo y muslo, con la diferencia contra la anotación anterior y contra la primera, y la curva.
- **Rutina**: tres rutinas de arranque (2, 3 y 4 días) que se editan a gusto, con el día de la semana de cada sesión, y un banco de ejercicios por grupo muscular con su rango de reps y cuántos kilos subir.
- **Ajustes**: semana del ciclo (para retomar, adelantar o repetir una descarga), tema claro u oscuro y copia de seguridad en un archivo `.json` que se comparte con la hoja nativa de Android.

<details>
<summary><strong>Más pantallas</strong></summary>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/capturas/escritorio-entrenar-oscuro.webp">
  <img src="docs/capturas/escritorio-entrenar-claro.webp" alt="Entrenar: cada ejercicio con la vez pasada, la sugerencia de peso y sus series, y el avance del día al costado" width="100%">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/capturas/escritorio-progreso-oscuro.webp">
  <img src="docs/capturas/escritorio-progreso-claro.webp" alt="Progreso: el banco de ejercicios por grupo muscular y, para la sentadilla, el récord, el 1RM estimado y la curva por sesión" width="100%">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/capturas/escritorio-cuerpo-oscuro.webp">
  <img src="docs/capturas/escritorio-cuerpo-claro.webp" alt="Cuerpo: el último peso y las medidas con su diferencia, la curva del peso y las anotaciones" width="100%">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/capturas/escritorio-rutina-oscuro.webp">
  <img src="docs/capturas/escritorio-rutina-claro.webp" alt="Rutina: la Fase 1 de 2 días activa y la Fase 2 de 3 días, con el día de la semana y las series de cada ejercicio" width="100%">
</picture>

</details>

## Cómo decide el peso

- **Doble progresión.** Cada ejercicio tiene un rango de reps (6–10 en los compuestos, 10–15 en los aislados). Mientras no llegues al tope en todas las series, mismo peso y una rep más; cuando llegás, sube el incremento del ejercicio (2,5 kg en torso, 5 kg en pierna) y volvés al piso del rango. Si dos sesiones seguidas con el mismo peso salen peor, baja un 10 % para volver a construir.
- **Ciclo con descarga.** Una semana de adaptación y después bloques de cinco: cuatro de progresión y una de descarga, con la mitad de las series y 15 % menos de peso. Las descargas no cuentan para la progresión.
- **Por ejercicio, no por rutina.** Al pasar de 2 a 3 o 4 días, cada ejercicio sigue desde donde quedó.

## Decisiones técnicas

- **Local-first.** Los datos viven en IndexedDB, en el teléfono: sin cuentas, sin servidor y sin costo de mantenimiento, y anda igual sin señal. La copia de seguridad es un `.json` para exportar e importar.
- **Las mismas pantallas que la versión web.** Un router local (`frontend/src/local/router.js`) responde con la misma forma que la API REST de `main`, así la interfaz de React es la misma en las dos versiones y solo cambia de dónde salen los datos.
- **La lógica, con tests.** Progresión, ciclo y agenda están portados a JavaScript y probados con Vitest sobre un IndexedDB en memoria.
- **APK en cada cambio.** GitHub Actions corre los tests y el lint, compila el frontend, lo empaqueta con Capacitor y deja el `app-gym.apk` listo para bajar.
- **Interfaz sin librería de componentes:** CSS propio con tokens para el tema claro y el oscuro, gráficos en SVG a mano, íconos por grupo muscular y tipografías embebidas para que nada dependa de la red.

## Dos versiones

| | [`main`](https://github.com/David-Schmidt02/app-gym) | `mobile-nativo` (esta rama) |
|---|---|---|
| Dónde corre | Navegador, instalable como app | App Android (APK) |
| Datos | SQLite en el servidor, con cuenta | IndexedDB en el teléfono, sin cuenta |
| Stack | FastAPI + React en un contenedor | React + Capacitor, sin backend |

Las dos ramas están protegidas y tienen su propio CI.

## Stack

React 19, Vite y Capacitor 8; IndexedDB para los datos; Vitest con fake-indexeddb para los tests; GitHub Actions para compilar el APK. Cómo levantarla en local y compilarla está en [docs/DESARROLLO.md](docs/DESARROLLO.md).

## Licencia

[MIT](LICENSE).
