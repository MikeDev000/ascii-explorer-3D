---
name: Project Architecture and Coding Standards
description: Core guidelines, performance rules, and code style for ascii-game-3D development
---

# ASCII 3D Game - System Instructions & Standards

This document establishes the architecture, coding standards, and performance constraints for the `ascii-game-3D` project. All AI agents must read and strictly adhere to these rules before modifying or writing any code.

## 1. Architecture & Stack
- **Engine:** Three.js for 3D rendering.
- **Physics:** Rapier3D (`@dimforge/rapier3d`) for collision detection and rigid body physics.
- **State Management:** Zustand (via `gameStore.ts`) for global game state, inventory, and cross-system event triggers.
- **Rendering Pipeline:** Custom `AsciiEffect` acting as a post-processing layer. The underlying 3D scene is rendered and converted into ASCII characters. UI elements (like the HUD and Terminal) are standard HTML/CSS overlaid on top using absolute positioning.
- **Modularity:** Systems are decoupled. `GameManager.ts` acts as the orchestrator/state machine. Specific mechanics exist in their own classes (e.g., `LampSystem`, `TerminalSystem`, `CollectiblesSystem`).

## 2. Performance & Optimization (CRITICAL)
Performance is a top priority to maintain a stable 60+ FPS despite the heavy `AsciiEffect`.
- **Zero Garbage Collection (GC) en Render Loops:** Never allocate new objects (e.g., `new THREE.Vector3()`, `new RAPIER.Ray()`, or arrays) inside `update()` or `render()` methods. Pre-allocate these as class properties and reuse them using `.set()`, `.copy()`, or `.subVectors()`.
- **DOM Manipulations:** Avoid querying the DOM (e.g., `document.getElementById`) inside loops. Cache DOM references in the constructor.
- **Lighting:** Avoid excessive dynamic lights. Use `THREE.PointLight` only when strictly necessary, and strictly limit their `distance` and set `castShadow = false`.
- **Physics Raycasting:** Prefer Rapier3D's `world.castRay` for line-of-sight and occlusion checks as it is highly optimized via WebAssembly. Ensure proper exclusion of the player's own collider to prevent auto-occlusion.

## 3. Coding Style & Documentation
- **Comments:** Escribe comentarios concretos y estrictamente técnicos. Solo comenta lógica compleja, el "por qué" de una decisión o matemáticas específicas. **NO comentes absolutamente todo lo que hace el código.**
- **No Emojis:** No uses emojis en comentarios de código, console logs o strings internos, a menos que sea estrictamente necesario para un elemento de UI dentro del juego.
- **Naming Conventions:** Usa nombres claros y descriptivos. PascalCase para Clases/Interfaces, y camelCase para instancias y métodos.
- **Types:** Tipado estricto en TypeScript. Evita usar `any` a menos que sea absolutamente necesario.

## 4. Terminal UNIX System Guidelines
- La terminal (`TerminalSystem`) es un overlay fijo del DOM que simula una interfaz UNIX.
- **Visuals:** El fondo de la terminal debe ser estático. Asegurar que cualquier contenedor con `overflow-y` sólo haga scroll en el cuerpo del texto (`#terminal-body`) y no afecte el background.
- **Command Structure:** Mantener una estructura limpia de parseo (ej. `switch/case` o arreglos `includes`).
- **State Side-Effects:** Los comandos de terminal deben comunicarse directamente con `gameStore.ts` o Servicios específicos (ej. `CraftingService`), manteniendo la lógica separada del sistema de la terminal.

## 5. UI and Rendering Overlay
- Elementos del HUD y etiquetas (como los nombres de coleccionables) se renderizan en 2D (`CanvasRenderingContext2D` o DOM) por encima del canvas 3D.
- Asegura que los elementos de UI 2D hagan comprobación de oclusión 3D (Línea de Visión / Raycast) antes de renderizar para evitar dibujar información a través de paredes sólidas.
