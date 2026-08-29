import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { HiddenMessage } from './HiddenMessage';

// ─────────────────────────────────────────────────────────────────────────────
//  SECTOR-7 / DATA CRYPT — Level Layout
//
//  Narrativa: Instalación subterránea de procesamiento de datos, abandonada tras
//  una corrupción masiva de kernel. El jugador despierta en el corredor central
//  (spawn) y debe explorar tres zonas: la Sala de Reactores (norte), el Pasillo
//  de Archivos (este) y la Celda Roja (oeste, zona corrupta).
//
//  Coordenadas: Suelo en Y=0. El jugador spawna en (0, 0, 0).
//  El mapa es 60x60 unidades. Norte = -Z, Sur = +Z, Este = +X, Oeste = -X.
// ─────────────────────────────────────────────────────────────────────────────

const levelData = {
  floor: { w: 60, d: 60 },

  walls: [
    // ── Perímetro Exterior ──────────────────────────────────────────────────
    { x: 0, y: 3, z: -30, w: 60, h: 6, d: 1 },   // Norte
    { x: 0, y: 3, z: 30, w: 60, h: 6, d: 1 },   // Sur
    { x: 30, y: 3, z: 0, w: 1, h: 6, d: 60 },  // Este
    { x: -30, y: 3, z: 0, w: 1, h: 6, d: 60 },  // Oeste

    // ── Corredor Central (columna vertebral Norte-Sur) ──────────────────────
    // Muro oeste del corredor central — con apertura en Z=0 para spawn
    { x: -8, y: 3, z: -16, w: 1, h: 6, d: 28 },  // norte del hueco
    { x: -8, y: 3, z: 16, w: 1, h: 6, d: 28 },  // sur del hueco (hueco entre -2..+2 para spawn)
    // Muro este del corredor central
    { x: 8, y: 3, z: 0, w: 1, h: 6, d: 60 },

    // ── Sala de Reactores (noroeste) ─────────────────────────────────────────
    // Divisor interior que separa reactor del corredor
    { x: -19, y: 3, z: -12, w: 22, h: 6, d: 1 },   // muro sur de la sala
    // Pilar central del reactor (estructura)
    { x: -19, y: 3, z: -21, w: 4, h: 6, d: 4 },

    // ── Pasillo de Archivos (este) ────────────────────────────────────────────
    { x: 19, y: 3, z: 8, w: 1, h: 6, d: 22 },  // muro que separa archivo norte de sur
    // Estantes / divisores de archivos (crean pasillos estrechos)
    { x: 16, y: 2, z: -10, w: 6, h: 4, d: 1 },
    { x: 16, y: 2, z: -6, w: 6, h: 4, d: 1 },
    { x: 16, y: 2, z: -2, w: 6, h: 4, d: 1 },

    // ── Celda Roja (suroeste, zona corrupta) ──────────────────────────────────
    { x: -19, y: 3, z: 12, w: 22, h: 6, d: 1 },   // muro norte de la celda
    { x: -8, y: 3, z: 21, w: 1, h: 6, d: 18 },  // muro este de la celda (compartido con corredor)

    // ── Cámara Blindada (extremo norte) ──────────────────────────────────────
    { x: 0, y: 3, z: -22, w: 16, h: 6, d: 1 },   // muro sur de la cámara blindada
    // Puerta sellada (bloque sólido, indica área bloqueada narrativamente)
    { x: 0, y: 1.5, z: -22.5, w: 4, h: 3, d: 0.5 },
  ],

  // Cubos estáticos: servidores, terminales, consolas caídas
  staticCubes: [
    // Sala de Reactores: servidor principal caído
    { x: -22, y: 1.5, z: -24, size: 3, hasMessage: true },
    // Pasillo de Archivos: rack de datos
    { x: 25, y: 1, z: -18, size: 2, hasMessage: false },
    { x: 25, y: 1, z: -10, size: 2, hasMessage: false },
    // Corredor central: terminal rota
    { x: 0, y: 0.75, z: -5, size: 1.5, hasMessage: false },
    // Celda Roja: caja de contención corrupta
    { x: -20, y: 1, z: 22, size: 2, hasMessage: false },
    // Cámara Blindada: consola de acceso
    { x: -5, y: 1, z: -27, size: 2, hasMessage: false },
    { x: 5, y: 1, z: -27, size: 2, hasMessage: false },
  ],

  // Esferas dinámicas: fragmentos de energía sueltos
  dynamicSpheres: [
    { x: 12, y: 2, z: -5, radius: 0.4 },
    { x: -12, y: 2, z: -20, radius: 0.4 },
    { x: 20, y: 2, z: 15, radius: 0.4 },
  ],

  // Cubos kinéticos: guardias de bloqueo que oscilan de lado a lado
  // No pueden ser movidos por el jugador (kinematicPositionBased)
  kineticBlocks: [
    // Corredor central — bloque oscilante vertical (bloquea en X)
    {
      x: 0, y: 1, z: -18, w: 2, h: 2, d: 2,
      axis: 'x' as const, amplitude: 3.5, speed: 0.8, phase: 0
    },
    // Acceso a la Sala de Reactores
    {
      x: -8, y: 1, z: -14, w: 1.5, h: 2, d: 1.5,
      axis: 'z' as const, amplitude: 2.5, speed: 1.1, phase: 1.0
    },
    // Pasillo de Archivos — bloque estrecho que oscila en Z
    {
      x: 19, y: 1, z: -15, w: 1.5, h: 2, d: 1.5,
      axis: 'z' as const, amplitude: 3, speed: 0.9, phase: 0.5
    },
    // Entrada a la Celda Roja
    {
      x: -14, y: 1, z: 12, w: 2, h: 2, d: 2,
      axis: 'x' as const, amplitude: 4, speed: 1.3, phase: 2.1
    },
    // Guarda de la Cámara Blindada
    {
      x: 0, y: 1, z: -24, w: 2.5, h: 2, d: 1,
      axis: 'x' as const, amplitude: 5, speed: 0.7, phase: 3.1
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  Entity Factory
// ─────────────────────────────────────────────────────────────────────────────
class EntityFactory {
  private scene: THREE.Scene;
  private world?: RAPIER.World;

  // Materiales cacheados
  private floorMat: THREE.Material;
  private wallMat: THREE.Material;
  private cubeMat: THREE.Material;
  private sphereMat: THREE.Material;
  private kineticMat: THREE.Material;

  public dynamicEntities: { mesh: THREE.Object3D, body: RAPIER.RigidBody }[] = [];

  // Bloques kinéticos: tienen referencia al cuerpo para moverlo por código (kinematic)
  public kineticEntities: {
    mesh: THREE.Mesh;
    body: RAPIER.RigidBody;
    origin: THREE.Vector3;
    axis: 'x' | 'z';
    amplitude: number;
    speed: number;
    phase: number;
  }[] = [];

  private allMeshes: THREE.Mesh[] = [];
  private allBodies: RAPIER.RigidBody[] = [];

  constructor(scene: THREE.Scene, world?: RAPIER.World) {
    this.scene = scene;
    this.world = world;

    // Textura del suelo: cuadrícula procedural con patrón visible y buen contraste
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#262626';
    ctx.fillRect(0, 0, 512, 512);
    // Cuadrícula definida
    ctx.strokeStyle = '#484848';
    ctx.lineWidth = 2;
    for (let i = 0; i < 512; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }
    // Nodos de cruce claros
    ctx.fillStyle = '#707070';
    for (let x = 0; x < 512; x += 32) {
      for (let y = 0; y < 512; y += 32) {
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
    }
    const floorTexture = new THREE.CanvasTexture(canvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(30, 30);
    floorTexture.magFilter = THREE.NearestFilter;

    // Suelo con respuesta especular para reflejar luces de coleccionables y linterna
    this.floorMat = new THREE.MeshPhongMaterial({ map: floorTexture, shininess: 35, specular: 0x555555 });
    // Paredes y objetos reducidos en un 10%
    this.wallMat = new THREE.MeshPhongMaterial({ color: 0xd6d6d6, shininess: 35, specular: 0x333333 });
    this.cubeMat = new THREE.MeshPhongMaterial({ color: 0xb8b8b8, shininess: 25, specular: 0x282828 });
    this.sphereMat = new THREE.MeshStandardMaterial({ color: 0xe5e5e5, roughness: 0.25, metalness: 0.1 });
    this.kineticMat = new THREE.MeshPhongMaterial({ color: 0xa89990, shininess: 45, specular: 0x332820 });
  }

  public createFloor(width: number, depth: number) {
    const geo = new THREE.PlaneGeometry(width, depth);
    const mesh = new THREE.Mesh(geo, this.floorMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.allMeshes.push(mesh);

    if (this.world) {
      const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0);
      const body = this.world.createRigidBody(bodyDesc);
      const colliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, 0.1, depth / 2);
      this.world.createCollider(colliderDesc, body);
      this.allBodies.push(body);
    }
  }

  public createWall(x: number, y: number, z: number, w: number, h: number, d: number) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, this.wallMat);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.allMeshes.push(mesh);

    if (this.world) {
      const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
      const body = this.world.createRigidBody(bodyDesc);
      const colliderDesc = RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2);
      this.world.createCollider(colliderDesc, body);
      this.allBodies.push(body);
    }
  }

  public createStaticCube(x: number, y: number, z: number, size: number, hasMessage: boolean = false) {
    const geo = new THREE.BoxGeometry(size, size, size);
    const mesh = new THREE.Mesh(geo, this.cubeMat);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.allMeshes.push(mesh);

    if (hasMessage) {
      const msg = new HiddenMessage('SYS://DATA_CRYPT\nSECTOR-7 OFFLINE', size * 0.83, size * 0.83);
      msg.position.set(0, 0, size / 2 + 0.01);
      mesh.add(msg);
    }

    if (this.world) {
      const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
      const body = this.world.createRigidBody(bodyDesc);
      const colliderDesc = RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2);
      this.world.createCollider(colliderDesc, body);
      this.allBodies.push(body);
    }
  }

  public createDynamicSphere(x: number, y: number, z: number, radius: number) {
    const geo = new THREE.SphereGeometry(radius, 16, 12);
    const mesh = new THREE.Mesh(geo, this.sphereMat);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.allMeshes.push(mesh);

    if (this.world) {
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, y, z)
        .setLinearDamping(0.4)
        .setAngularDamping(0.4);
      const body = this.world.createRigidBody(bodyDesc);
      const colliderDesc = RAPIER.ColliderDesc.ball(radius)
        .setFriction(0.5)
        .setRestitution(0.55);
      this.world.createCollider(colliderDesc, body);
      body.wakeUp();
      this.dynamicEntities.push({ mesh, body });
      this.allBodies.push(body);
    }
  }

  /**
   * Crea un bloque kinéticoPositionBased que se desplaza de lado a lado.
   * El jugador NO puede moverlo. El motor lo trata como un cuerpo cinemático:
   * empuja otros cuerpos (como el jugador) pero no cede ante fuerzas externas.
   */
  public createKineticBlock(
    x: number, y: number, z: number,
    w: number, h: number, d: number,
    axis: 'x' | 'z', amplitude: number, speed: number, phase: number
  ) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, this.kineticMat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.allMeshes.push(mesh);

    if (this.world) {
      // kinematicPositionBased: el cuerpo es movido por código (setNextKinematicTranslation),
      // tiene masa pero no es afectado por fuerzas externas.
      const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z);
      const body = this.world.createRigidBody(bodyDesc);
      const colliderDesc = RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
        .setFriction(0.0)
        .setRestitution(0.0);
      this.world.createCollider(colliderDesc, body);
      this.allBodies.push(body);

      this.kineticEntities.push({
        mesh,
        body,
        origin: new THREE.Vector3(x, y, z),
        axis,
        amplitude,
        speed,
        phase
      });
    }
  }

  public dispose() {
    this.floorMat.dispose();
    this.wallMat.dispose();
    this.cubeMat.dispose();
    this.sphereMat.dispose();
    this.kineticMat.dispose();

    for (const mesh of this.allMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }

    if (this.world) {
      for (const body of this.allBodies) {
        this.world.removeRigidBody(body);
      }
    }

    this.allMeshes = [];
    this.allBodies = [];
    this.dynamicEntities = [];
    this.kineticEntities = [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Collectibles del Sector-7 (posiciones en el mapa)
//  Exportadas para ser usadas por CollectiblesSystem en GameManager
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna los coleccionables del nivel Sector-7 con posiciones distribuidas
 * narrativamente por el mapa. Cada ejecución mezcla el orden con un seed aleatorio
 * para que el jugador explore el mapa completo en cada partida.
 */
export function getSector7Collectibles() {
  // Posiciones base (dentro de zonas accesibles del mapa)
  const positions = [
    // Corredor central — justo al frente del spawn, fácil de ver
    { x: 2, y: 1, z: -6 },
    // Sala de Reactores (noroeste) — junto al servidor caído
    { x: -20, y: 1, z: -20 },
    // Pasillo de Archivos (este) — en el espacio entre estantes
    { x: 22, y: 1, z: -8 },
    // Pasillo de Archivos (norte) — zona alta, requiere exploración
    { x: 22, y: 1, z: -22 },
    // Celda Roja (suroeste) — zona corrupta
    { x: -20, y: 1, z: 20 },
    // Corredor sur
    { x: 3, y: 1, z: 20 },
    // Cámara Blindada (requiere pasar al guardián kinético)
    { x: 0, y: 1, z: -27 },
  ];

  // Mezcla aleatoria de posiciones para variedad en cada partida
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  return [
    // ── 3 componentes normales ─────────────────────────────────────────────
    {
      data: { id: 'cap_s7_1', type: 'cap' as const, name: 'Cycle_Cap.o', ascii: '[~~~~]', corrupted: false },
      position: positions[0]
    },
    {
      data: { id: 'ptr_s7_1', type: 'pointer' as const, name: 'Raw_Pointer.h', ascii: '{;:;}', corrupted: false },
      position: positions[1]
    },
    {
      data: { id: 'hex_s7_1', type: 'hex' as const, name: 'Hex_Payload.bin', ascii: '0x', corrupted: false },
      position: positions[2]
    },
    // ── 1 componente corrupto (en la Celda Roja) ──────────────────────────
    {
      data: { id: 'hex_s7_corrupt', type: 'hex' as const, name: 'Hex_Payload.bin', ascii: '0x?', corrupted: true },
      position: positions[4]  // Siempre en zona corrupta (índice 4 = Celda Roja, no mezclado con rest)
    },
    // ── Componentes extra (bonus, no obligatorios) ──────────────────────────
    {
      data: { id: 'cap_s7_2', type: 'cap' as const, name: 'Cycle_Cap.o', ascii: '[~~~~]', corrupted: false },
      position: positions[5]
    },
    {
      data: { id: 'ptr_s7_2', type: 'pointer' as const, name: 'Raw_Pointer.h', ascii: '{;:;}', corrupted: false },
      position: positions[6]
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
//  Construcción del Nivel — createMap()
// ─────────────────────────────────────────────────────────────────────────────
export function createMap(scene: THREE.Scene, world?: RAPIER.World) {
  const factory = new EntityFactory(scene, world);

  // Suelo
  factory.createFloor(levelData.floor.w, levelData.floor.d);

  // Muros
  levelData.walls.forEach(w => factory.createWall(w.x, w.y, w.z, w.w, w.h, w.d));

  // Cubos estáticos
  levelData.staticCubes.forEach(c => factory.createStaticCube(c.x, c.y, c.z, c.size, c.hasMessage));

  // Esferas dinámicas (gravedad, colisiones, rebote)
  levelData.dynamicSpheres.forEach(s => factory.createDynamicSphere(s.x, s.y, s.z, s.radius));

  // Bloques kinéticos (guardianes oscilantes, no movibles por el jugador)
  levelData.kineticBlocks.forEach(k =>
    factory.createKineticBlock(k.x, k.y, k.z, k.w, k.h, k.d, k.axis, k.amplitude, k.speed, k.phase)
  );

  // Acento ambiental sombrío para la Celda Roja (rojo tenue y apagado)
  const redAmbient = new THREE.PointLight(0x550a0a, 0.6, 16);
  redAmbient.position.set(-19, 3, 21);
  scene.add(redAmbient);

  // Acento ambiental sombrío para la Sala de Reactores (azul noche apagado)
  const reactorLight = new THREE.PointLight(0x0a1428, 0.5, 16);
  reactorLight.position.set(-19, 3, -21);
  scene.add(reactorLight);

  return {
    update: (_delta: number) => {
      const t = performance.now() * 0.001;

      // Sincronizar esferas dinámicas (física → visual)
      factory.dynamicEntities.forEach(({ mesh, body }) => {
        const pos = body.translation();
        const rot = body.rotation();
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
      });

      // Animar bloques kinéticos: movimiento sinusoidal por eje
      factory.kineticEntities.forEach(ent => {
        const offset = Math.sin(t * ent.speed + ent.phase) * ent.amplitude;
        const nx = ent.axis === 'x' ? ent.origin.x + offset : ent.origin.x;
        const nz = ent.axis === 'z' ? ent.origin.z + offset : ent.origin.z;
        const ny = ent.origin.y;

        // Actualizar posición en Rapier (kinematic: sin fuerzas externas)
        ent.body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });

        // Sincronizar visual con físicas
        ent.mesh.position.set(nx, ny, nz);
      });
    },
    dispose: () => {
      factory.dispose();
      scene.remove(redAmbient);
      scene.remove(reactorLight);
      redAmbient.dispose();
      reactorLight.dispose();
    }
  };
}