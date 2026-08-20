# 🗺️ Guía de Creación de Mapas y Entidades (Arquitectura Data-Driven & Factory)

Esta guía explica cómo diseñar nuevos niveles, colocar estructuras y crear objetos interactivos/físicos en la nueva arquitectura del motor tras las refactorizaciones de las Fases 3 y 4.

---

## 🏗️ 1. Arquitectura General

La creación del mundo ahora está dividida en dos capas limpias:

1. **Capa de Datos (`levelData`):** Un objeto declarativo tipo JSON donde defines las coordenadas, tamaños y propiedades de las entidades sin tocar lógica de Three.js ni Rapier3D.
2. **Capa Factory (`EntityFactory`):** Una fábrica que toma los datos y se encarga internamente de:
   - Crear las geometrías y mallas 3D en **Three.js**.
   - Asignar materiales reutilizados (optimizados en memoria).
   - Generar simultáneamente los colisionadores y cuerpos rígidos en el motor de físicas **Rapier3D**.
   - Registrar las entidades dinámicas para sincronización automática en el bucle de render (`update`).

```
  ┌──────────────────────────┐
  │  levelData (JSON/Object) │  <- Aquí defines tu nivel
  └─────────────┬────────────┘
                │
                ▼
  ┌──────────────────────────┐
  │      EntityFactory       │  <- Instancia automáticamente:
  ├─────────────┬────────────┤
  │  Three.js   │  Rapier3D  │
  │   (Visual)  │  (Físicas) │
  └─────────────┴────────────┘
```

---

## 📐 2. Estructura de `levelData` (`src/world/map.ts`)

Para modificar el mapa actual o crear uno nuevo, edita el objeto `levelData`:

```typescript
const levelData = {
  // 1. Dimensiones del Suelo
  floor: { 
    w: 50, // Ancho (X)
    d: 50  // Profundidad (Z)
  },

  // 2. Muros Perimetrales o Estructuras Sólidas
  walls: [
    // x: posición X, y: altura centro Y, z: posición Z
    // w: ancho X, h: alto Y, d: profundidad Z
    { x: 0, y: 2.5, z: -25, w: 50, h: 5, d: 1 },
    { x: 0, y: 2.5, z: 25,  w: 50, h: 5, d: 1 },
    { x: 25, y: 2.5, z: 0,  w: 1,  h: 5, d: 50 },
    { x: -25, y: 2.5, z: 0, w: 1,  h: 5, d: 50 },
    
    // Ejemplo: Agregar un muro divisorio interior
    { x: 0, y: 2.5, z: 0, w: 20, h: 5, d: 1 }
  ],

  // 3. Bloques / Obstáculos Estáticos
  staticCubes: [
    { 
      x: 0, 
      y: 1.5, 
      z: -8, 
      size: 3, 
      hasMessage: true // Si lleva calcomanía con mensaje oculto
    }
  ],

  // 4. Objetos Físicos Dinámicos (Interactúan con gravedad y colisiones)
  dynamicSpheres: [
    { 
      x: -6, 
      y: 3.0, 
      z: -8, 
      radius: 1.0 // Radio de la esfera
    }
  ]
};
```

---

## 🛠️ 3. Métodos Disponibles en `EntityFactory`

Si deseas extender la fábrica con nuevos métodos o usarlos manualmente:

| Método | Parámetros | Descripción |
| :--- | :--- | :--- |
| `createFloor(w, d)` | `width: number, depth: number` | Genera un plano con textura procedural de cuadrícula + colisionador fijo en el suelo (`y = 0`). |
| `createWall(x, y, z, w, h, d)` | `pos y dimensiones (X, Y, Z)` | Genera un muro estático con sombras y colisionador cúbico de Rapier3D. |
| `createStaticCube(x, y, z, size, hasMessage?)` | `pos, tamaño, flag opcional` | Crea un cubo sólido inamovible. Si `hasMessage = true`, adjunta el mensaje UV oculto `"HELLO WORLD"`. |
| `createDynamicSphere(x, y, z, radius)` | `pos, radio` | Crea una pelota dinámica con rebote (*restitution 0.7*), fricción y amortiguamiento, vinculada para auto-sincronizarse en cada cuadro. |

---

## 🏷️ 4. Cómo Agregar Nuevos Coleccionables (`src/world/collectibles.ts`)

Los coleccionables no usan el `map.ts` directamente, sino el `CollectiblesSystem`, el cual proyecta sus badges 2D directamente en un Canvas Overlay de alto rendimiento:

Para spawnear un nuevo objeto en el mapa, añade una llamada a `this.spawnItem(...)`:

```typescript
this.spawnItem({
  id: 'unique_item_id',       // Identificador único
  type: 'cap',                // Tipo ('cap' | 'pointer' | 'hex')
  name: 'Memory_Chunk.dat',   // Nombre legible en HUD
  ascii: '[###]',             // Símbolo ASCII representativo
  corrupted: false            // true para parpadeo rojo/corrupto
}, new THREE.Vector3(x, y, z));
```

### Características Automáticas de los Coleccionables:
- **Núcleo Octaédrico + Jaula Icosaédrica:** Rotación dual inversa a 60 FPS con brillo emisivo.
- **Luz Puntual Neón:** Ilumina los muros circundantes según si es normal (Cyan/Magenta) o corrupto (Rojo).
- **Badge Canvas 2D:** Se proyecta con su nombre y símbolo ASCII sobre el objeto en pantalla completa sin afectar el rendimiento DOM.
- **Recolección:** Se detecta automáticamente cuando el jugador se acerca a menos de `1.2` unidades.

---

## 💡 5. Buenas Prácticas al Diseñar Niveles

1. **Evitar Instanciar Materiales en el Bucle:** `EntityFactory` ya almacena en caché `floorMat`, `wallMat`, `cubeMat` y `sphereMat`. Si agregas un nuevo tipo de entidad, añade su material como propiedad privada en el constructor de `EntityFactory`.
2. **Sincronización de Físicas:** Al crear cualquier objeto dinámico (`dynamicBody`), asegúrate de registrar `{ mesh, body }` en `this.dynamicEntities.push(...)` para que el método `update()` actualice su posición y rotación automáticamente.
3. **Escalabilidad hacia Archivos Externos:** Gracias a la estructura de `levelData`, en el futuro puedes sustituir la constante estática por un `fetch('/levels/level1.json')` sin tener que alterar ninguna línea de la lógica de renderizado ni de físicas.
