# Documentación Técnica: Sistema de Pistas Ocultas (`HiddenMessage`)

El sistema `HiddenMessage` permite colocar texto o pistas invisibles en el mapa (sobre paredes, suelo, objetos, puertas o cajas) que únicamente se revelan cuando la lámpara del jugador (`F`) las ilumina directamente.

---

## 1. Arquitectura y Funcionamiento Técnico

### Aislamiento de Luces
A diferencia de los materiales estándar de Three.js (`MeshPhongMaterial`, `MeshStandardMaterial`), `HiddenMessage` utiliza un **`ShaderMaterial` personalizado**.
- **Independencia de Luces Globales**: Ignora por completo luces ambientales (`AmbientLight`), direccionales (`DirectionalLight`) y puntuales (`PointLight`).
- **Cálculo en View Space**: El shader calcula en tiempo real la distancia (máximo 10m) y el ángulo de visión desde la cámara del jugador (donde reside la linterna).
- **Control Global**: Escucha la variable uniforme global `SharedUniforms.uLampOn`, la cual activa o desactiva el renderizado mediante la tecla `F`.
- **Transparencia y Blend Mode**: Utiliza `THREE.AdditiveBlending` con `depthWrite: false` para sumar su color verde (`#00FF00`) sobre cualquier superficie existente sin alterar la geometría de fondo.
- **Evitado de Z-Fighting**: Incluye `polygonOffset` nativo para evitar parpadeos visuales al colocarse a distancias mínimas de otras superficies.

---

## 2. Firma de la Clase

```typescript
import { HiddenMessage } from './path/to/HiddenMessage';

const message = new HiddenMessage(text, width, height);
```

### Parámetros del Constructor
| Parámetro | Tipo | Descripción |
| :--- | :--- | :--- |
| `text` | `string` | El mensaje a mostrar. Admite saltos de línea `\n` para texto multilínea. |
| `width` | `number` | Ancho físico del plano en unidades 3D (metros). |
| `height` | `number` | Alto físico del plano en unidades 3D (metros). |

---

## 3. Formas de Uso y Acoplamiento

Existen dos métodos principales para integrar un `HiddenMessage` en el mundo:

### Opción A: Añadir a la Escena Global (Independiente)
Ideal para paredes estáticas del mapa o suelos.

```typescript
// 1. Crear el mensaje
const hiddenMessage = new HiddenMessage("CÓDIGO:\n4042", 2.0, 2.0);

// 2. Posicionar en coordenadas globales
hiddenMessage.position.set(0, 1.5, -6.49);

// 3. (Opcional) Rotar según la orientación del muro
// Ejemplo: Rotar 90 grados para pegarlo a un muro lateral este/oeste
hiddenMessage.rotation.y = Math.PI / 2;

// 4. Agregar a la escena
scene.add(hiddenMessage);
```

---

### Opción B: Acoplarlo como Hijo de un Objeto (`Object3D.add`) — **Recomendado para Propiedades y Muebles**
Ideal para cajas, puertas, enemigos u objetos que se mueven o se instancian en grupo. Al hacerlo hijo de un objeto:
- El mensaje **hereda automáticamente la posición, rotación y escala** del padre.
- Las coordenadas `position` y `rotation` pasan a ser **locales** al padre.

#### Ejemplo: Pegar calcomanía en la cara frontal de una caja

```typescript
// 1. Crear la caja padre (3x3x3 metros)
const cubeGeo = new THREE.BoxGeometry(3, 3, 3);
const cubeMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
const cube = new THREE.Mesh(cubeGeo, cubeMat);
cube.position.set(10, 1.5, -5);
scene.add(cube);

// 2. Crear la pista
const clue = new HiddenMessage("PELIGRO", 2.0, 1.0);

// 3. Posicionar de manera LOCAL respecto al centro de la caja (3m de ancho -> cara frontal en Z = +1.5)
// Le sumamos un pequeño offset (0.01) para asegurar prioridad visual
clue.position.set(0, 0, 1.51); 

// 4. Hacerlo hijo del cubo
cube.add(clue);
```

#### Ejemplo: Pegar calcomanía en diferentes caras de un Cubo 3D

```typescript
// Cara Frontal (+Z)
const frontClue = new HiddenMessage("FRENTE", 1.5, 1.5);
frontClue.position.set(0, 0, 1.51);
cube.add(frontClue);

// Cara Trasera (-Z)
const backClue = new HiddenMessage("ATRÁS", 1.5, 1.5);
backClue.position.set(0, 0, -1.51);
backClue.rotation.y = Math.PI; // Girar 180 grados hacia atrás
cube.add(backClue);

// Cara Derecha (+X)
const rightClue = new HiddenMessage("DERECHA", 1.5, 1.5);
rightClue.position.set(1.51, 0, 0);
rightClue.rotation.y = Math.PI / 2; // Girar 90 grados
cube.add(rightClue);

// Cara Izquierda (-X)
const leftClue = new HiddenMessage("IZQUIERDA", 1.5, 1.5);
leftClue.position.set(-1.51, 0, 0);
leftClue.rotation.y = -Math.PI / 2; // Girar -90 grados
cube.add(leftClue);
```

---

## 4. Guía de Rotación y Orientación

| Superficie Destino | Configuración de Posición y Rotación |
| :--- | :--- |
| **Pared Norte (Mirando al Sur)** | `rotation.y = 0`<br>`position.z += offset` |
| **Pared Sur (Mirando al Norte)** | `rotation.y = Math.PI`<br>`position.z -= offset` |
| **Pared Este (Mirando al Oeste)** | `rotation.y = Math.PI / 2`<br>`position.x += offset` |
| **Pared Oeste (Mirando al Este)** | `rotation.y = -Math.PI / 2`<br>`position.x -= offset` |
| **Suelo (Piso)** | `rotation.x = -Math.PI / 2`<br>`position.y += offset` |
| **Techo** | `rotation.x = Math.PI / 2`<br>`position.y -= offset` |

---

## 5. Buenas Prácticas

1. **Evitar Z-Fighting en Muros**: Aunque la clase usa `polygonOffset`, siempre es aconsejable dar un pequeño margen espacial en `position` de `0.01` a `0.05` respecto a la superficie sólida.
2. **Textos Multilínea**: Usa el carácter `\n` dentro del string. El canvas interno calculará automáticamente el centrado y el interlineado.
3. **Destrucción / Limpieza**: Si eliminas un objeto que contiene un `HiddenMessage`, recuerda llamar a `geometry.dispose()` y `material.dispose()` si destruyes el objeto dinámicamente durante el juego.
