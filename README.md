# ASCII Explorer 3D v1.0.0

**ASCII Explorer 3D** es un videojuego minimalista de exploración en primera persona con gráficos renderizados mediante caracteres ASCII. El proyecto está construido con Three.js y AsciiEffect, empaquetado con Vite y desarrollado en TypeScript.

## Características Principales

- **Gráficos ASCII**: Entorno 3D renderizado exclusivamente con caracteres ASCII (`.,:;i1tfLCG08@`).
- **Estilo "Low-Fi"**: Interfaz y HUD minimalista que complementan la estética retro.
- **Controles Modernos**:
  - **W, A, S, D**: Movimiento (adelante, izquierda, atrás, derecha).
  - **Mouse**: Rotación de cámara.
  - **Espacio**: Saltar (con física simple).
  - **Esc**: Bloquear/desbloquear cursor.
- **Persistencia**:
  - **LocalStorage**: Guarda automáticamente la posición y estado del jugador.
  - **Sincronización en Tiempo Real**: Estado compartido entre diferentes componentes del juego.
- **Estado del Jugador**:
  - **Salud**: Sistema de vida con regeneración automática.
  - **Posición**: Coordenadas (x, y, z).
  - **Mirada (Look)**: Ángulos Horizontales (yaw) y verticales (pitch).
  - **Is Sprinting**: Estado de carrera.
  - **Is Crouching**: Estado de agachado.
  - **Mundo de Prueba**:
  - **Terreno Modular**: Generación procedural de bloques para simular un mundo infinito.
  - **Interacción con Objetos**: Detección de colisión con el suelo y obstáculos.

## Stack Tecnológico

- **[Vite](https://vitejs.dev/)**: Entorno de desarrollo rápido y empaquetador.
- **[Three.js](https://threejs.org/)**: Librería de gráficos 3D.
- **[AsciiEffect](https://github.com/sunseeker/three-ascii-effect)**: Efecto de post-procesado para renderizado ASCII.
- **[TypeScript](https://www.typescriptlang.org/)**: Lenguaje de programación con tipado estático.
- **[Zustand](https://github.com/pmndrs/zustand)**: Gestión de estado global ligero.
- **[Cannon-es](https://github.com/pmndrs/cannon-es)**: Motor de física (integrado en `world.ts`).

## Estructura del Proyecto

```
src/
├── core/
│   ├── camera.ts       # Configuración de la cámara 3D.
│   ├── controls.ts     # Lógica de control del jugador (input, movimiento).
│   ├── lighting.ts     # Configuración de luces (Direccional + Ambiente).
│   ├── renderer.ts     # Inicialización de Three.js y AsciiEffect.
│   ├── scene.ts        # Creación de la escena y gestión del terreno.
│   └── world.ts        # Mundo del juego y física (Cannon-es).
├── store/
│   └── playerStore.ts  # Gestión del estado del jugador (Zustand).
├── types/
│   └── index.ts        # Definiciones de tipos TypeScript.
├── main.ts             # Punto de entrada de la aplicación.
└── index.html          # HTML principal con el contenedor del canvas.
```

## Instalación y Ejecución

1. **Clonar el repositorio**:
   ```bash
   git clone <url-del-repositorio>
   cd ascii-explorer-3D
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

4. **Compilar para producción**:
   ```bash
   npm run build
   ```

## Cómo Jugar

Al iniciar, aparecerás en un mundo plano con bloques generados aleatoriamente.

- Usa **WASD** para moverte.
- Mira alrededor con el **mouse**.
- Presiona **Espacio** para saltar.
- Usa **F** para encender y apagar la linterna.
- Usa la tecla **|** (debajo de Esc) para abrir y cerrar la terminal.
- Escribe **hello** en la terminal y presiona **Enter** para saludar.

---
*Hecho con ❤️ para una experiencia única y retro.*
