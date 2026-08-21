import { initPhysics } from './physics/physics';
import { GameManager } from './core/GameManager';

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

  // Initialize Rapier3D physics engine
  const physicsWorld = await initPhysics();

  // Iniciar la máquina de estados del juego
  new GameManager(physicsWorld);
}

main().catch(console.error);
