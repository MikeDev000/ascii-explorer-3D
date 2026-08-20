# Workpath: División en Fases — Corrección y Escalabilidad al 100%

> Basado íntegramente en `Hoja de Ruta Restante: Corrección y Escalabilidad del 100%`.
> Criterio de división: agrupar tareas por **archivo/subsistema afectado**, mezclando complejidad
> baja + media cuando tocan el mismo archivo (evita context-switching y conflictos de merge), y
> dejando las tareas de **complejidad alta** que dependen de otros subsistemas para el final.

---

## Lógica de la división

| Fase | Squad / Responsable | Complejidad mezclada | Depende de |
| :--- | :--- | :--- | :--- |
| 0 | Housekeeping | 🟢 | — |
| 1 | Renderer | 🟢 + 🟡 | — |
| 2 | Input / Terminal | 🟢 + 🟢 | — |
| 3 | Badges / Collectibles | 🟡 | — |
| 4 | Mapa (Factory Pattern) | 🔴 | — |
| 5 | Game Lifecycle Manager | 🔴 | Fases 1, 2, 3 (necesita los `dispose()` ya definidos) |

Las Fases 0, 1, 2, 3 y 4 son **paralelizables entre sí** (no comparten archivos ni dependencias
declaradas en el documento original). La Fase 5 debe ir **al final** porque, según el roadmap, el
gestor centralizado debe "instanciar, ejecutar e invocar el método `dispose()` de todos los
subsistemas (`Physics`, `Player`, `Lamp`, `Terminal`, `Collectibles`)" — por lo tanto necesita que
esos métodos de limpieza ya existan y sean consistentes.

---

## 🧹 Fase 0 — Housekeeping Inicial
**Complejidad:** 🟢 Baja
**Squad sugerido:** cualquier agente disponible, sin prerequisitos.
**Dependencias:** ninguna.

### Tarea 0.1 — Eliminación de archivos basura (boilerplate obsoleto)
**Archivos implicados:**
- `src/counter.ts`
- `src/style.css`

**Prompt técnico:**
```
Los archivos src/counter.ts y src/style.css son remanentes del boilerplate inicial
del proyecto. Añaden ruido y confunden a nuevos desarrolladores. Elimínalos
físicamente del disco y revisa que no existan imports/referencias rotas hacia
ellos en el resto del código antes de confirmar el cambio.
```

---

## 🖥️ Fase 1 — Renderer (limpieza + refactor estructural)
**Complejidad:** 🟢 Baja + 🟡 Media
**Squad sugerido:** agente enfocado en `src/core/renderer.ts`.
**Dependencias:** ninguna.
**Justificación de la mezcla:** ambas tareas tocan el mismo archivo (`renderer.ts`), así que se
resuelven en la misma sesión de trabajo para evitar tocar el archivo dos veces por separado.

### Tarea 1.1 — Fuga de listener `resize` (🟢 Baja)
**Archivo:** `src/core/renderer.ts`

**Prompt técnico:**
```
En src/core/renderer.ts existe un manejador agregado a window para el evento
'resize' que nunca se remueve, acumulándose si el juego se recarga o reinicia.
Modifica la función/clase responsable para que devuelva una función de limpieza
(cleanup function) que ejecute window.removeEventListener('resize', handler)
correctamente, de modo que pueda invocarse cuando el renderer se destruya.
```

### Tarea 1.2 — Reemplazo del Monkey-Patching (🟡 Media)
**Archivo:** `src/core/renderer.ts`

**Descripción del problema:** sobrescribir `renderer.render = () => {}` en cada cuadro para obligar
a `AsciiEffect` a procesar el framebuffer de posprocesamiento es una solución frágil.

**Impacto:** si Three.js se actualiza o cambian las firmas internas del ciclo de renderizado, el
posprocesamiento se romperá.

**Prompt técnico:**
```
En src/core/renderer.ts se está sobrescribiendo renderer.render = () => {} en cada
frame para forzar a AsciiEffect a procesar el framebuffer de posprocesamiento. Esto
es frágil: si Three.js actualiza las firmas internas del ciclo de renderizado, el
posprocesamiento se romperá.

Elimina este monkey-patching y reemplázalo por una de estas dos alternativas:
1. Crear un Custom Pass formal para EffectComposer que procese la salida ASCII, o
2. Encapsular la renderización sin inyectar comportamiento destructivo en la
   instancia global de WebGLRenderer.

No debe quedar ninguna reasignación directa del método .render en la instancia
global del renderer.
```

**Criterio de aceptación (según tabla comparativa del roadmap):** "Monkey Patching" pasa de `Sí` a
`No (Uso de Composers nativos)`.

---

## 🎮 Fase 2 — Input / Terminal (listeners zombies)
**Complejidad:** 🟢 Baja + 🟢 Baja
**Squad sugerido:** agente enfocado en sistemas de entrada/UI (`src/systems/`).
**Dependencias:** ninguna.
**Justificación de la mezcla:** ambas tareas son del mismo tipo (fuga de event listeners en
`window`) y de baja complejidad; se agrupan para resolverlas en un solo barrido.

### Tarea 2.1 — InputManager sin `dispose()`
**Archivo:** `src/systems/input.ts`

**Prompt técnico:**
```
En src/systems/input.ts los manejadores de teclado se agregan a window y nunca se
remueven, acumulándose si el juego se recarga o reinicia. Añade un método
dispose() a InputManager que ejecute:
- window.removeEventListener('keydown', ...)
- window.removeEventListener('keyup', ...)
Asegúrate de que las referencias a los handlers usadas en addEventListener sean
las mismas que se pasan a removeEventListener (mismo binding/referencia).
```

### Tarea 2.2 — TerminalSystem sin limpieza de `mousedown`
**Archivo:** `src/systems/terminal.ts`

**Prompt técnico:**
```
En src/systems/terminal.ts existe un listener window.addEventListener('mousedown')
que nunca se remueve. Implementa la remoción de este listener al cerrar o destruir
la consola (terminal), de forma que no quede acumulado si la terminal se
abre/cierra repetidamente durante la sesión de juego.
```

**Criterio de aceptación (según tabla comparativa del roadmap):** "Manejo de Eventos" pasa a
`Seguro (Con ciclo de vida de desuscripción)`.

---

## 🏷️ Fase 3 — Optimización del Sistema de Badges
**Complejidad:** 🟡 Media
**Squad sugerido:** agente enfocado en el sistema de coleccionables / overlay 2D.
**Dependencias:** ninguna.

**Descripción del problema:** proyectar etiquetas HTML (`.collectible`) usando `element.style.left`
y `.top` fuerza el cálculo continuo del layout del navegador (*DOM Reflow*).

**Impacto:** con más de 10-20 coleccionables activos, el rendimiento sufrirá drásticamente en CPU.

### Tarea 3.1 — Eliminar Layout Thrashing en badges de coleccionables

**Prompt técnico:**
```
El sistema de badges proyecta etiquetas HTML (clase .collectible) usando
element.style.left y element.style.top en cada frame, lo cual fuerza recálculo
continuo de layout del navegador (DOM Reflow). Con más de 10-20 coleccionables
activos esto degrada drásticamente el rendimiento en CPU.

Implementa UNA de estas dos soluciones:
1. Migrar las etiquetas a Sprites 2D dentro de la escena de Three.js, o
2. Dibujar todas las etiquetas en un único elemento <canvas> que sirva de overlay,
   de forma que exista una sola llamada de renderizado por frame para todo el
   texto 2D.

El resultado no debe seguir manipulando .style.left/.top por elemento en cada
frame de renderizado.
```

**Criterio de aceptación (según tabla comparativa del roadmap):** "Layout Thrashing" pasa de
`Sí (DOM Flotante)` a `No (Texturas / Sprites 3D o Canvas Overlay)`.

> Nota de coordinación: el sistema de `Collectibles` es uno de los subsistemas que la Fase 5
> (Lifecycle Manager) deberá poder instanciar/destruir vía `dispose()`. Si esta fase decide migrar
> a Sprites 3D o a un canvas overlay, es recomendable dejar documentado cómo debe limpiarse ese
> nuevo recurso, ya que no está detallado explícitamente en el roadmap original.

---

## 🗺️ Fase 4 — Desacoplamiento de Física y Visuales del Mapa (Factory Pattern)
**Complejidad:** 🔴 Alta
**Squad sugerido:** agente enfocado en arquitectura de `map.ts`.
**Dependencias:** ninguna declarada en el roadmap (puede correr en paralelo a las Fases 1-3).

**Descripción del problema:** en `map.ts`, la construcción del mapa es puramente imperativa y
secuencial, duplicando esfuerzos al crear el objeto visual en Three.js y el colisionador en
Rapier3D por separado.

**Impacto:** imposible cargar mapas dinámicos o niveles desde archivos (JSON/GLB) sin reescribir
todo el código.

### Tarea 4.1 — Implementar Factory de entidades físicas-visuales

**Prompt técnico:**
```
En map.ts la construcción del mapa es imperativa y secuencial: se crea el objeto
visual en Three.js y el colisionador en Rapier3D por separado, duplicando
esfuerzo. Esto hace imposible cargar mapas dinámicos o niveles desde archivos
(JSON/GLB) sin reescribir todo el código.

Implementa un Factory de entidades físicas-visuales. El mapa debe generarse
leyendo una estructura de datos (matriz o JSON) e invocando creadores abstractos
del tipo:

    createWall(x, y, z, width, height, depth)

Cada creador abstracto debe encapsular la creación simultánea y coherente del
objeto visual (Three.js) y su colisionador correspondiente (Rapier3D), evitando
la duplicación de lógica actual.
```

**Criterio de aceptación (según tabla comparativa del roadmap):** "Carga de Niveles" pasa de
`Manual / Código` a `Data-Driven (JSON / GLTF)`.

---

## 🔄 Fase 5 — Ciclo de Vida y Máquina de Estados del Juego (Game Lifecycle Manager)
**Complejidad:** 🔴 Alta
**Squad sugerido:** agente de integración final / arquitectura core.
**Dependencias:** requiere que las Fases 1, 2 y 3 hayan dejado listos los métodos `dispose()` /
limpieza de sus respectivos subsistemas, ya que este gestor los invocará directamente.

**Descripción del problema:** todo se arranca de manera inmediata y estática en `main.ts`. No
existe estado de menú, pausa, reinicio o muerte.

**Impacto:** crear transiciones de pantalla requerirá reinicializar todo el navegador (F5), lo cual
merma la experiencia de usuario.

### Tarea 5.1 — Máquina de estados del juego

**Prompt técnico:**
```
Actualmente todo se arranca de forma inmediata y estática en main.ts. No existe
estado de menú, pausa, reinicio o muerte, por lo que cualquier transición de
pantalla obliga a recargar el navegador (F5).

Implementa una máquina de estados del juego con (al menos) los siguientes
estados: booting, menu, playing, paused, gameover.
```

### Tarea 5.2 — Gestor centralizado de subsistemas

**Prompt técnico:**
```
Diseña un gestor centralizado que instancie, ejecute e invoque el método
dispose() de todos los subsistemas del juego (Physics, Player, Lamp, Terminal,
Collectibles) durante los cambios de estado de la máquina de estados definida en
la Tarea 5.1.

Prerrequisito: verifica que Terminal (Fase 2) ya exponga su lógica de limpieza de
listeners, y que el resto de subsistemas listados (Physics, Player, Lamp,
Collectibles) cuenten con un método dispose() consistente antes de integrarlos
en este gestor. Si algún subsistema no lo tiene todavía, es necesario añadirlo
como parte de esta tarea antes de conectarlo a la máquina de estados.
```

**Criterio de aceptación (según tabla comparativa del roadmap):** esta fase, junto con las
anteriores, es la que permite alcanzar el **Puntaje Global objetivo: 10/10**.

---

## 📊 Tabla comparativa original (referencia de contexto)

| Aspecto Técnico | Estado Original | Estado Actual (Post Fase 2/3 del roadmap) | Estado Objetivo (100% Corrección) |
| :--- | :--- | :--- | :--- |
| **Puntaje Global** | 3 / 10 | 7.5 / 10 | **10 / 10** |
| **Memory Leak GPU** | Crítico | Resuelto (`disposeItem`) | Resuelto |
| **GC Thrashing** | Alto (FPS Drops) | Resuelto (Variables Cacheadas) | Resuelto |
| **Manejo de Eventos** | Caótico | Centralizado (Zustand) | Seguro (Con ciclo de vida de desuscripción) |
| **Monkey Patching** | Sí | Sí | No (Uso de Composers nativos) |
| **Layout Thrashing** | Sí (DOM Flotante) | Sí (DOM Flotante) | No (Texturas / Sprites 3D o Canvas Overlay) |
| **Carga de Niveles** | Manual / Código | Manual / Código | Data-Driven (JSON / GLTF) |

> Nota: los "Estados Actuales" mostrados en esta tabla son los reportados en el documento original
> (`auditoria-1.md` + hoja de ruta) previos a ejecutar las Fases 0-5 de este workpath.