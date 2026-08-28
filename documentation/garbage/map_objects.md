# Guía Técnica: Creación de Objetos, Físicas y Movimiento en el Mapa

Esta guía documenta técnicamente cómo crear, personalizar y mover objetos en la escena 3D, integrando las geometrías y materiales de **Three.js** con la simulación física de **Rapier3D**.

---

## 1. Arquitectura General de un Objeto

En este motor, cualquier objeto interactivo o del mapa consta de dos componentes principales:

```
                  +-----------------------------------+
                  |         Objeto del Mapa           |
                  +-----------------------------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+-----------------------+                       +-----------------------+
|   Componente Visual   |                       |   Componente Físico   |
|      (Three.js)       |                       |       (Rapier3D)      |
+-----------------------+                       +-----------------------+
| - Geometry (Forma)    |                       | - RigidBody (Tipo)    |
| - Material (Color/Tex)|                       | - Collider (Límites)  |
| - Mesh (Pos/Rot)      |                       | - Fricción/Rebote     |
+-----------------------+                       +-----------------------+
```

---

## 2. Componente Visual (Three.js)

### A. Geometrías Básicas (`THREE.BufferGeometry`)
Formas predefinidas disponibles en Three.js:

```typescript
import * as THREE from 'three';

const boxGeo      = new THREE.BoxGeometry(width, height, depth);        // Cajas / Cubos
const sphereGeo   = new THREE.SphereGeometry(radius, widthSeg, heightSeg); // Esferas
const cylGeo      = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSeg); // Cilindros
const capsuleGeo  = new THREE.CapsuleGeometry(radius, length, capSeg, radialSeg); // Cápsulas
const planeGeo    = new THREE.PlaneGeometry(width, height);             // Planos 2D / Suelos
```

### B. Materiales y Sombreado
El renderizador ASCII traduce la **luminancia (brillo)** de los píxeles en caracteres. Por ello, los materiales deben reaccionar correctamente a las luces:

```typescript
// Material Phong: Ideal para objetos retro brillantes con luces especulares
const matPhong = new THREE.MeshPhongMaterial({
  color: 0x888888,     // Color base (hexadecimal)
  shininess: 30,       // Intensidad del brillo especular
  specular: 0x222222   // Color del reflejo de luz
});

// Material Standard: Basado en físicas reales (PBR)
const matStandard = new THREE.MeshStandardMaterial({
  color: 0x00ff00,
  roughness: 0.4,      // Rugosidad (0 = espejo, 1 = mate)
  metalness: 0.2       // Metalicidad (0 = dieléctrico, 1 = metal)
});
```

### C. Texturas Procedurales (HTML Canvas -> Three.js)
Puedes generar texturas en código sin cargar archivos de imagen externos:

```typescript
function createCustomTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Dibujar patrones en el canvas 2D
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#000000';
  ctx.fillRect(50, 50, 156, 156);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4); // Repetir 4x4 veces
  texture.magFilter = THREE.NearestFilter; // Filtrado pixelado/retro

  return texture;
}

// Aplicar al material
const matWithTexture = new THREE.MeshPhongMaterial({ map: createCustomTexture() });
```

---

## 3. Componente Físico (Rapier3D)

Rapier3D gestiona la simulación de colisiones y gravedad. Para añadir físicas a un objeto necesitas un `RigidBody` (cuerpo) y un `Collider` (colisionador).

### A. Tipos de Cuerpos Rígidos (`RigidBodyDesc`)

| Tipo | Método | Uso Típico |
| :--- | :--- | :--- |
| **Estático (`fixed`)** | `RAPIER.RigidBodyDesc.fixed()` | Muros, suelos, plataformas fijas, obstáculos inamovibles. No le afecta la gravedad ni recibe impulsos. |
| **Dinámico (`dynamic`)** | `RAPIER.RigidBodyDesc.dynamic()` | Jugador, cajas empujables, proyectiles, objetos que caen. Afectado por gravedad y fuerzas. |
| **Kinemático (`kinematicPositionBased`)** | `RAPIER.RigidBodyDesc.kinematicPositionBased()` | Plataformas móviles, puertas que se abren, elevadores. El programador controla su posición y empuja a objetos dinámicos. |

### B. Descriptores de Colisionadores (`ColliderDesc`)
> **IMPORTANTE**: Rapier utiliza **semiextensiones (mitad del tamaño total)** para las dimensiones de las cajas y cilindros.

```typescript
// Caja de 3x3x3 metros -> Semiextensiones = 1.5, 1.5, 1.5
const boxCollider = RAPIER.ColliderDesc.cuboid(1.5, 1.5, 1.5);

// Esfera de radio 2 metros
const sphereCollider = RAPIER.ColliderDesc.ball(2.0);

// Cilindro de altura 4m (semi-altura 2m) y radio 1m
const cylCollider = RAPIER.ColliderDesc.cylinder(2.0, 1.0);

// Cápsula de semi-altura 0.5m y radio 0.4m (usada por el jugador)
const capsuleCollider = RAPIER.ColliderDesc.capsule(0.5, 0.4);

// Configuración adicional de propiedades físicas
boxCollider
  .setFriction(0.5)      // Fricción (superficie resbaladiza vs rugosa)
  .setRestitution(0.2);   // Rebote (0.0 = nulo, 1.0 = rebote perfecto)
```

---

## 4. Ejemplos Prácticos Completos

### Ejemplo 1: Objeto Estático Fijo (Estructura / Muro)

```typescript
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';

export function createStaticPillar(scene: THREE.Scene, world: RAPIER.World, x: number, z: number) {
  const width = 2, height = 6, depth = 2;

  // 1. Crear Mesh Visual
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mat = new THREE.MeshPhongMaterial({ color: 0x666666, shininess: 40 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // 2. Crear Cuerpo y Colisionador Estático
  const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, height / 2, z);
  const rigidBody = world.createRigidBody(rigidBodyDesc);
  const colliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2);
  world.createCollider(colliderDesc, rigidBody);

  return mesh;
}
```

---

### Ejemplo 2: Objeto Dinámico que Cae y es Empujable (Caja Física)

```typescript
export class DynamicCrate {
  public mesh: THREE.Mesh;
  public rigidBody: RAPIER.RigidBody;

  constructor(scene: THREE.Scene, world: RAPIER.World, x: number, y: number, z: number) {
    const size = 1.5;

    // 1. Mesh Visual
    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    // 2. Cuerpo Dinámico en Rapier
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setLinearDamping(0.5) // Resistencia al movimiento
      .setAngularDamping(0.5); // Resistencia a girar
    this.rigidBody = world.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2)
      .setFriction(0.6)
      .setRestitution(0.1);
    world.createCollider(colliderDesc, this.rigidBody);
  }

  // 3. Sincronización en el Game Loop (Llamar en main.ts o update)
  public update() {
    const position = this.rigidBody.translation();
    const rotation = this.rigidBody.rotation();

    // Copiar la transformación de la física hacia el mesh visual
    this.mesh.position.set(position.x, position.y, position.z);
    this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  }
}
```

---

### Ejemplo 3: Plataforma Móvil Kinemática (Movimiento Programado)

```typescript
export class MovingPlatform {
  public mesh: THREE.Mesh;
  public rigidBody: RAPIER.RigidBody;
  private time: number = 0;
  private startX: number;
  private startY: number;
  private startZ: number;

  constructor(scene: THREE.Scene, world: RAPIER.World, x: number, y: number, z: number) {
    this.startX = x;
    this.startY = y;
    this.startZ = z;

    // Mesh
    const geo = new THREE.BoxGeometry(4, 0.5, 4);
    const mat = new THREE.MeshPhongMaterial({ color: 0x00aaff, shininess: 80 });
    this.mesh = new THREE.Mesh(geo, mat);
    scene.add(this.mesh);

    // Cuerpo Kinemático Basado en Posición
    const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(x, y, z);
    this.rigidBody = world.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(2, 0.25, 2);
    world.createCollider(colliderDesc, this.rigidBody);
  }

  public update(delta: number) {
    this.time += delta;

    // Calcular nueva posición oscilante (Mover 5m en el eje X de lado a lado)
    const newX = this.startX + Math.sin(this.time * 2) * 5;
    const newY = this.startY;
    const newZ = this.startZ;

    // 1. Mover el cuerpo físico kinemático en Rapier (esto empujará al jugador si está encima)
    this.rigidBody.setNextKinematicTranslation({ x: newX, y: newY, z: newZ });

    // 2. Sincronizar el mesh visual
    this.mesh.position.set(newX, newY, newZ);
  }
}
```

---

## 5. Resumen de Buenas Prácticas

1. **Relación 1:1 entre Escala de Geometry y Collider**: Asegúrate de que las dimensiones en Three.js coincidan con el collider en Rapier (recordando dividir entre 2 para `cuboid`).
2. **Sincronización del Game Loop**:
   - Cuerpos **Estáticos**: No necesitan `update()`. Se posicionan una vez al crear.
   - Cuerpos **Dinámicos**: La física domina -> `Mesh.position = RigidBody.translation()`.
   - Cuerpos **Kinemáticos**: El código domina -> `RigidBody.setNextKinematicTranslation(...)` y `Mesh.position = nuevaPosicion`.
3. **Optimización de Rendimiento**: Reutiliza geometrías y materiales compartidos cuando crees múltiples objetos idénticos.
