import { createScene, createCamera } from './core/scene';
import { createRenderer } from './core/renderer';
import { setupLighting } from './core/lighting';
import { InputManager } from './systems/input';
import { PlayerController } from './systems/player';
import { createMap } from './world/map';
import { initPhysics } from './physics/physics';
import { useGameStore } from './store/gameStore';
import { LampSystem } from './systems/lamp';
import { TerminalSystem } from './systems/terminal';
import { CollectiblesSystem } from './world/collectibles';

async function main() {
  // Suppress unhandled promise rejections caused by browser pointer lock rate-limiting
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason &&
      (event.reason.name === 'SecurityError' ||
        (typeof event.reason.message === 'string' && event.reason.message.includes('Pointer lock')))
    ) {
      event.preventDefault();
    }
  });

  const scene = createScene();
  const camera = createCamera();
  scene.add(camera);
  const { render } = createRenderer(scene, camera);
  setupLighting(scene);

  // Initialize Rapier3D physics engine
  const physicsWorld = await initPhysics();

  // Create map meshes and physics colliders
  const map = createMap(scene, physicsWorld);

  const input = new InputManager();
  const player = new PlayerController(camera, document.body, input, physicsWorld);
  const lamp = new LampSystem(camera, input);
  new TerminalSystem(input);

  // Pass player directly, which now conforms to the expected interface
  const collectibles = new CollectiblesSystem(scene, camera, player);

  let lastTime = performance.now();
  let frames = 0;
  let lastFpsTime = lastTime;
  const fpsElement = document.getElementById('fps');
  const batteryUi = document.getElementById('battery-ui');
  const batteryBar = document.getElementById('battery-bar');
  const batteryText = document.getElementById('battery-text');
  const appContainer = document.getElementById('app');
  let hasPlayedGlitch = false;

  function animate(time: number) {
    requestAnimationFrame(animate);

    const delta = (time - lastTime) / 1000;
    lastTime = time;

    // Step physics simulation
    physicsWorld.step();

    // Update map dynamic objects, player, camera position, and collectibles
    map?.update(delta);
    player.update(delta);
    lamp.update(delta);
    collectibles.update(delta);

    // Sync Battery HUD
    const storeState = useGameStore.getState();
    const batteryLevel = storeState.battery;
    if (batteryBar && batteryText && batteryUi) {
      batteryBar.style.width = `${batteryLevel}%`;
      batteryText.textContent = `${Math.ceil(batteryLevel)}%`;

      // Cyberpunk color logic
      if (batteryLevel < 20) {
        batteryBar.style.backgroundColor = '#ff003c';
        batteryBar.style.boxShadow = '0 0 10px #ff003c';
        batteryUi.classList.add('battery-critical');

        if (!hasPlayedGlitch) {
          hasPlayedGlitch = true;
          batteryUi.classList.add('battery-low-glitch');
          setTimeout(() => {
            batteryUi.classList.remove('battery-low-glitch');
          }, 2000);
        }
      } else {
        // Reset glitch trigger when battery is recharged above 20%
        hasPlayedGlitch = false;
        batteryUi.classList.remove('battery-critical', 'battery-low-glitch');

        if (batteryLevel < 50) {
          batteryBar.style.backgroundColor = '#ffb300';
          batteryBar.style.boxShadow = '0 0 10px #ffb300';
        } else {
          batteryBar.style.backgroundColor = '#0ff';
          batteryBar.style.boxShadow = '0 0 10px #0ff';
        }
      }
    }

    // Corrupted component visual screen glitch sync
    if (appContainer) {
      if (storeState.triggerGlitch) {
        appContainer.classList.add('screen-glitch');
        // Stop glitch after 5 seconds automatically
        setTimeout(() => {
          storeState.setTriggerGlitch(false);
        }, 5000);
      } else {
        appContainer.classList.remove('screen-glitch');
      }
    }

    // Render ASCII post-processed scene
    render(scene, camera);

    frames++;
    if (time > lastFpsTime + 1000) {
      const fps = Math.round((frames * 1000) / (time - lastFpsTime));
      useGameStore.getState().setFps(fps);
      if (fpsElement) fpsElement.textContent = `FPS: ${fps}`;

      frames = 0;
      lastFpsTime = time;
    }
  }

  requestAnimationFrame(animate);
}

main().catch(console.error);
