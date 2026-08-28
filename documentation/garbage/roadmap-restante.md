# Hoja de Ruta Restante: Corrección y Escalabilidad del 100%

Este documento complementa el reporte inicial de `auditoria-1.md` detallando las tareas que aún están pendientes para alcanzar el **100% de cumplimiento técnico**, estructuradas por niveles de complejidad.

---

## 🟢 Complejidad Baja: Limpieza Básica y fugas menores de listeners

### 1. Eliminación de Archivos Basura (Obsoletos)
* **Descripción:** Los remanentes del boilerplate inicial añaden ruido y confunden a nuevos desarrolladores.
* **Archivos implicados:** 
  * `src/counter.ts`
  * `src/style.css`
* **Acción:** Eliminar físicamente del disco.

### 2. Control de Event Listeners Zombies (Memory Leaks en Eventos)
* **Descripción:** Ciertos manejadores se agregan a `window` y nunca se remueven, acumulándose si el juego se recarga o reinicia.
* **Acciones:**
  * **InputManager (`src/systems/input.ts`):** Añadir un método `dispose()` que haga `window.removeEventListener('keydown' / 'keyup')`.
  * **TerminalSystem (`src/systems/terminal.ts`):** Remover el listener `window.addEventListener('mousedown')` al cerrar o destruir la consola.
  * **Renderer (`src/core/renderer.ts`):** Devolver una función de limpieza para el evento `resize` asignado a `window`.

---

## 🟡 Complejidad Media: Refactorización Estructural Media

### 1. Reemplazo del Monkey-Patching en `renderer.ts`
* **Descripción:** Sobrescribir `renderer.render = () => {}` en cada cuadro para obligar a `AsciiEffect` a procesar el framebuffer de posprocesamiento es una solución frágil.
* **Impacto:** Si Three.js se actualiza o cambian las firmas internas del ciclo de renderizado, el posprocesamiento se romperá.
* **Acción:** Crear un *Custom Pass* formal para `EffectComposer` que procese la salida ASCII o encapsular la renderización sin inyectar comportamiento destructivo en la instancia global de `WebGLRenderer`.

### 2. Optimización del Sistema de Badges (Eliminación de Elementos DOM a 60 FPS)
* **Descripción:** Proyectar etiquetas HTML (`.collectible`) usando `element.style.left` y `.top` fuerza el cálculo continuo del layout del navegador (*DOM Reflow*).
* **Impacto:** Con más de 10-20 coleccionables activos, el rendimiento sufrirá drásticamente en CPU.
* **Acción:** 
  * Migrar a **Sprites 2D** dentro de la escena de Three.js.
  * O bien, dibujar todas las etiquetas en un único elemento `<canvas>` que sirva de overlay (una sola llamada de renderizado por frame para todo el texto 2D).

---

## 🔴 Complejidad Alta: Rediseño Arquitectónico del Core del Motor

### 1. Desacoplamiento de Física y Visuales del Mapa (Factory Pattern)
* **Descripción:** En `map.ts`, la construcción del mapa es puramente imperativa y secuencial, duplicando esfuerzos al crear el objeto visual en Three.js y el colisionador en Rapier3D por separado.
* **Impacto:** Imposible cargar mapas dinámicos o niveles desde archivos (JSON/GLB) sin reescribir todo el código.
* **Acción:** Implementar un **Factory** de entidades físicas-visuales. El mapa debería generarse leyendo una estructura de datos (matriz, JSON) e invocando creadores abstractos tipo `createWall(x, y, z, width, height, depth)`.

### 2. Ciclo de Vida y Máquina de Estados del Juego (Game Lifecycle Manager)
* **Descripción:** Todo se arranca de manera inmediata y estática en `main.ts`. No existe estado de menú, pausa, reinicio o muerte.
* **Impacto:** Crear transiciones de pantalla requerirá reinicializar todo el navegador (F5), lo cual merma la experiencia de usuario.
* **Acción:**
  * Implementar una máquina de estados del juego (Ej: `booting`, `menu`, `playing`, `paused`, `gameover`).
  * Diseñar un gestor centralizado que instancie, ejecute e invoque el método `dispose()` de todos los subsistemas (`Physics`, `Player`, `Lamp`, `Terminal`, `Collectibles`) durante los cambios de estado.

---

## 📊 Tabla Comparativa de Rendimiento y Arquitectura

| Aspecto Técnico | Estado Original | Estado Actual (Post Fase 2/3) | Estado Objetivo (100% Corrección) |
| :--- | :--- | :--- | :--- |
| **Puntaje Global** | 3 / 10 | 7.5 / 10 | **10 / 10** |
| **Memory Leak GPU** | Crítico | Resuelto (`disposeItem`) | Resuelto |
| **GC Thrashing** | Alto (FPS Drops) | Resuelto (Variables Cacheadas) | Resuelto |
| **Manejo de Eventos** | Caótico | Centralizado (Zustand) | Seguro (Con ciclo de vida de desuscripción) |
| **Monkey Patching** | Sí | Sí | No (Uso de Composers nativos) |
| **Layout Thrashing** | Sí (DOM Flotante) | Sí (DOM Flotante) | No (Texturas / Sprites 3D o Canvas Overlay) |
| **Carga de Niveles** | Manual / Código | Manual / Código | Data-Driven (JSON / GLTF) |
