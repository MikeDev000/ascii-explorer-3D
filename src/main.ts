import { createScene, createCamera } from './core/scene';
import { createRenderer } from './core/renderer';
import { setupLighting } from './core/lighting';
import { InputManager } from './systems/input';
import { PlayerController } from './systems/player';
import { createMap } from './world/map';
import { initPhysics } from './physics/physics';
import { useGameStore } from './store/gameStore';

async function main() {
  const scene = createScene();
  const camera = createCamera();
  const { effect } = createRenderer(scene, camera);
  setupLighting(scene);

  createMap(scene);

  const input = new InputManager();
  const player = new PlayerController(camera, document.body, input);

  // Initialize physics (stubbed for now)
  await initPhysics();

  let lastTime = performance.now();
  let frames = 0;
  let lastFpsTime = lastTime;
  const fpsElement = document.getElementById('fps');

  function animate(time: number) {
    requestAnimationFrame(animate);

    const delta = (time - lastTime) / 1000;
    lastTime = time;

    player.update(delta);
    effect.render(scene, camera);

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
