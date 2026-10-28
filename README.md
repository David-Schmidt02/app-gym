# Gym (Mobile Nativo)

> **Versión** 1.2.0 · **Última actualización** 2026-10-28

Libreta de gimnasio personal nativa para Android: 100 % autónoma (*Local-First*), sin servidor ni costo de mantenimiento, con funcionamiento offline en el gimnasio, cálculo automático de carga progresiva, semanas de descarga, agenda semanal inteligente y respaldo de datos en JSON.

| Versión | Fecha | Cambios |
|---|---|---|
| 1.2.0 | 2026-10-28 | Versión móvil nativa para Android (Capacitor): 100 % Local-First en IndexedDB sin backend ni servidor, funcionamiento offline, fuentes embebidas, respaldo y restauración en JSON y compilación automática de APK en GitHub Actions. |
| 1.1.0 | 2026-10-28 | Diseño horizontal de dos columnas en escritorio, selectores desplegables propios, iconografía anatómica por grupo muscular y agenda semanal fija con descanso configurable y postergación inteligente en cascada. |
| 1.0.0 | 2026-10-26 | Primera versión: banco de ejercicios por grupo muscular, rutinas de 2, 3 y 4 días, entrenamiento con «la vez pasada» y sugerencia de peso (doble progresión), ciclo de adaptación + bloques de 4 semanas de progresión y 1 de descarga, descanso entre series, historial editable, curva de progreso por ejercicio, y peso corporal y medidas. |

## Qué hace

- **Hoy**: la semana del ciclo (adaptación, progresión 1 a 4 o descarga), el calendario semanal con la rutina asignada por día (permite postergar a mañana o mover días con reprogramación en cascada respetando los descansos), el entrenamiento que toca hoy (o aviso de día de descanso) con el botón Empezar, y los últimos entrenamientos.
- **Entrenar** (botón del centro): cada ejercicio muestra lo que hiciste la vez pasada y la sugerencia de hoy con su motivo. Las series ya vienen con el peso sugerido; anotás las reps y marcás la serie, y arranca el descanso (2 min en compuestos, 1:15 en aislados, +15 s a mano). Lo anotado queda guardado localmente en el teléfono, un borrador por día de la rutina, hasta tocar «Terminar».
- **Progreso**: por ejercicio, el récord de peso, el 1RM estimado (Epley) y la curva de peso de trabajo y 1RM por sesión (las descargas, huecas). El historial completo se corrige o se borra desde ahí.
- **Cuerpo**: peso, cintura, cadera, pecho, brazo y muslo. Cada anotación lleva lo que se midió ese día; muestra el último valor, la diferencia con el anterior y con el primero, y la curva.
- **Rutina**: las rutinas (una activa) con su editor de días, día de la semana asignado, descanso mínimo entre sesiones, ejercicios y series; y el banco de ejercicios (hasta unos 5 por grupo) con su rango de reps y cuántos kg subir.
- **Ajustes**: ciclo de entrenamiento, tema visual claro/oscuro, tu nombre de perfil y **Respaldo de datos** (exportar e importar archivo `.json` con hoja de compartir nativa de Android).

## La lógica de entrenamiento

**Doble progresión** (`frontend/src/local/progresion.js`). Cada ejercicio tiene un rango de reps (6–10 en compuestos, 10–15 en aislados) y un incremento:

| Situación (última sesión fuera de descargas, con su peso más alto) | Sugerencia |
|---|---|
| Sin registros | Elegir un peso para llegar al tope dejando 2–3 reps en reserva (3–4 en adaptación) |
| Llegaste al tope del rango en todas las series | Subir el incremento (2,5 kg torso, 5 kg pierna, 1–2 kg mancuernas) y volver al piso del rango |
| No llegaste | Mismo peso, sumar una rep |
| Las dos últimas sesiones con el mismo peso sumaron menos reps que la anterior | Bajar 10 % y volver a construir |
| Semana de descarga | La mitad de las series y 15 % menos de peso |

Los pesos sugeridos se redondean hacia abajo al medio kilo.

**Ciclo** (`frontend/src/local/ciclo.js`). Semana 0 de adaptación y después bloques de 5 semanas: 4 de progresión y la 5.ª de descarga. Cada lunes avanza una semana. Cada entrenamiento guarda el tipo de semana de su fecha; las descargas no cuentan para la progresión.

**Rutinas de arranque** (`frontend/src/local/semillas.js`, se cargan automáticamente al primer inicio): Fase 1 de 2 días (cuerpo completo A/B, activa), Fase 2 de 3 días (A/B/C) y Fase 3 de 4 días (Torso/Pierna). El progreso es por ejercicio, así que al cambiar de rutina cada uno sigue desde donde quedó.

## Stack

| Parte | Tecnología |
|---|---|
| App Móvil | Android nativo con Capacitor 8 |
| Frontend | React 19 + Vite, CSS propio, tipografías locales embebidas (`@fontsource`) |
| Persistencia | IndexedDB nativo del dispositivo (0 servidores, 100 % offline) |
| Testing | Vitest + fake-indexeddb para la suite del motor local |
| CI / Build | GitHub Actions compila `app-gym.apk` firmado automáticamente en cada push |

## Desarrollo local

```bash
cd frontend
npm install
npm run dev      # Servidor de desarrollo en http://localhost:5173
npm test         # Pruebas unitarias del motor local en Vitest
npm run lint     # Validación de código con ESLint
npm run cap:sync # Compila la web y sincroniza los assets con Android
```

## Compilación del APK

Cada push a la rama `mobile-nativo` dispara el workflow `.github/workflows/apk.yml`, el cual:
1. Instala dependencias y corre la suite de pruebas unitarias y lint.
2. Compila el frontend estático y sincroniza Capacitor.
3. Compila el APK nativo con Gradle usando Java 21 y Android SDK.
4. Publica el archivo instalable **`app-gym.apk`** en la pestaña **Actions** del repositorio para descargar directo al teléfono.
