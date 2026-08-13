# ASCII Explorer 3D

## Resumen Básico (Para cualquier usuario)

¡Bienvenido a **ASCII Explorer 3D**! Este es un juego de exploración en primera persona que se juega directamente en tu navegador web. Lo que lo hace especial es su estilo visual: en lugar de utilizar gráficos convencionales, todo el entorno 3D está renderizado utilizando únicamente caracteres de texto (ASCII).

### ¿Cómo jugar?
- **Iniciar el juego:** Haz clic en la pantalla de inicio para entrar al juego y capturar el cursor del ratón.
- **Movimiento:** Usa las teclas `W`, `A`, `S`, `D` para caminar por el mundo.
- **Mirar alrededor:** Mueve el ratón para girar la vista.
- **Correr:** Mantén presionada la tecla `Shift` para moverte más rápido.
- **Salir:** Presiona la tecla `Esc` (Escape) para liberar el cursor y pausar el juego.

El mundo incluye laberintos, muros y columnas generadas proceduralmente, lo que significa que la estructura central puede variar. Además, en la pantalla podrás ver los fotogramas por segundo (FPS) y una mira (crosshair) en el centro para orientarte.

---

## Explicación Técnica (Para desarrolladores)

Este proyecto está construido como una aplicación web moderna utilizando **TypeScript** sin necesidad de frameworks de interfaz de usuario como React o Vue, priorizando el rendimiento y el minimalismo. 

### Stack Tecnológico

1. **Three.js**: Utilizado como motor de renderizado 3D principal. Se encarga de gestionar la escena, luces, cámaras y geometrías.
2. **AsciiEffect (Three.js JSM)**: El componente principal que transforma la salida del `WebGLRenderer` en una matriz de caracteres de texto. Renderiza la escena utilizando un conjunto de caracteres basado en la luminancia (` .,:;i1tfLCG08@`).
3. **Vite**: El empaquetador (bundler) y servidor de desarrollo. Está configurado para compilar a código moderno (`esnext`) permitiendo el uso de características avanzadas como `top-level await` y WebAssembly.
4. **Zustand (Vanilla)**: Se usa para el manejo de estado global (como el contador de FPS) sin necesidad de React (`zustand/vanilla`).
5. **Rapier3D**: Motor de físicas basado en WebAssembly. Está configurado de forma asíncrona para manejar en un futuro las colisiones, gravedad y dinámicas de los cuerpos rígidos.

### Arquitectura del Proyecto

El código está estructurado de manera modular dentro del directorio `src/`:

- **`/core/`**: Contiene la inicialización fundamental del motor 3D.
  - `scene.ts`: Configura la escena y la cámara de perspectiva.
  - `renderer.ts`: Inicializa `WebGLRenderer` y `AsciiEffect`, vinculándolos al DOM.
  - `lighting.ts`: Añade la iluminación direccional y ambiental necesaria para que `AsciiEffect` pueda calcular las sombras y el sombreado correcto de los caracteres.
- **`/systems/`**: Manejo de lógicas interactivas.
  - `player.ts`: Lógica del jugador en primera persona. Usa `PointerLockControls` de Three.js y maneja la velocidad, la fricción y la aplicación del movimiento en función de las teclas presionadas.
  - `input.ts`: Un gestor de eventos del teclado (`keydown`/`keyup`) que mantiene el estado actual de cada tecla.
- **`/world/`**: Generación del entorno.
  - `map.ts`: Genera los límites (paredes perimetrales) y estructuras pseudo-aleatorias en el centro del mapa utilizando mallas estándar.
- **`/physics/`**: Integración con el motor de físicas.
  - `physics.ts`: Inicializa el mundo de físicas de `Rapier3D` (preparado para integrar colisiones de forma activa).
- **`/store/`**: Estado global.
  - `gameStore.ts`: Estado centralizado implementado con Zustand Vanilla para desacoplar la lógica UI/HUD del bucle de renderizado.
- **`main.ts`**: Punto de entrada principal de la aplicación. Orquesta todos los módulos, inicializa las variables y ejecuta el bucle de renderizado principal (game loop) usando `requestAnimationFrame`.

### Bucle de Juego (Game Loop)

El ciclo de vida en `main.ts` calcula el `delta time` (tiempo entre fotogramas) para asegurar que el movimiento y la física sean consistentes independientemente de la velocidad de los fotogramas. En cada iteración:
1. Se actualiza el controlador del jugador (`player.update`).
2. Se renderiza la escena a través del `AsciiEffect`.
3. Se actualiza el estado de los FPS en el DOM y en Zustand.
