import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { createScene, createCamera } from './scene';
import { createRenderer } from './renderer';
import { setupLighting } from './lighting';
import { InputManager } from '../systems/input';
import { PlayerController } from '../systems/player';
import { LampSystem } from '../systems/lamp';
import { TerminalSystem } from '../systems/terminal';
import { CollectiblesSystem } from '../world/collectibles';
import { createMap } from '../world/map';
import { useGameStore } from '../store/gameStore';

export const GameState = {
  BOOTING: 'BOOTING',
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER'
} as const;

export type GameState = typeof GameState[keyof typeof GameState];

export class GameManager {
  private state: GameState = GameState.BOOTING;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private render!: (s: THREE.Scene, c: THREE.Camera) => void;
  private cleanupRenderer!: () => void;
  private physicsWorld: RAPIER.World;

  private input!: InputManager;
  private player!: PlayerController;
  private lamp!: LampSystem;
  private terminal!: TerminalSystem;
  private collectibles!: CollectiblesSystem;
  private map!: { update: (delta: number) => void, dispose: () => void };

  private lastTime = 0;
  private frames = 0;
  private lastFpsTime = 0;
  private hasPlayedGlitch = false;

  // UI Elements
  private uiMenu = document.getElementById('main-menu')!;
  private uiPause = document.getElementById('pause-menu')!;
  private uiGameOver = document.getElementById('gameover-menu')!;
  private uiHud = document.getElementById('hud')!;
  private uiBatteryUi = document.getElementById('battery-ui');
  private uiBatteryBar = document.getElementById('battery-bar');
  private uiBatteryText = document.getElementById('battery-text');
  private uiApp = document.getElementById('app');
  private uiLoadingBar = document.getElementById('loading-bar');

  constructor(physicsWorld: RAPIER.World) {
    this.physicsWorld = physicsWorld;
    this.initUI();
    this.setupWorld();
    this.transitionTo(GameState.MENU);

    // Global key listener
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.state === GameState.PLAYING && !useGameStore.getState().isTerminalOpen) {
          this.transitionTo(GameState.PAUSED);
        } else if (this.state === GameState.PAUSED) {
          this.resumeGame();
        }
      }
    });

    // Start render loop
    this.lastTime = performance.now();
    this.lastFpsTime = this.lastTime;
    this.animate(this.lastTime);
  }

  private initUI() {
    document.getElementById('btn-play')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startGame();
    });

    document.getElementById('btn-resume')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.resumeGame();
    });

    document.getElementById('btn-quit-pause')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.transitionTo(GameState.MENU);
    });

    document.getElementById('btn-restart')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startGame();
    });
  }

  public transitionTo(newState: GameState) {
    this.state = newState;

    if (this.uiMenu) this.uiMenu.style.display = 'none';
    if (this.uiPause) this.uiPause.style.display = 'none';
    if (this.uiGameOver) this.uiGameOver.style.display = 'none';
    if (this.uiHud) this.uiHud.style.display = 'none';

    switch (newState) {
      case GameState.MENU:
        if (this.uiMenu) this.uiMenu.style.display = 'flex';
        this.player?.unlock();
        break;
      case GameState.PLAYING:
        if (this.uiHud) this.uiHud.style.display = 'block';
        break;
      case GameState.PAUSED:
        if (this.uiPause) this.uiPause.style.display = 'flex';
        this.player?.unlock();
        break;
      case GameState.GAMEOVER:
        if (this.uiGameOver) this.uiGameOver.style.display = 'flex';
        this.player?.unlock();
        break;
    }
  }

  private setupWorld() {
    // Clean previous setup
    this.stopGame();

    // Setup core Three.js components
    this.scene = createScene();
    this.camera = createCamera() as THREE.PerspectiveCamera;
    this.scene.add(this.camera);

    const rendererSystem = createRenderer(this.scene, this.camera);
    this.renderer = rendererSystem.renderer;
    this.render = rendererSystem.render;
    this.cleanupRenderer = rendererSystem.cleanup;

    setupLighting(this.scene);

    // Setup Subsystems
    this.map = createMap(this.scene, this.physicsWorld);
    this.input = new InputManager();
    this.player = new PlayerController(this.camera, document.body, this.input, this.physicsWorld);
    this.lamp = new LampSystem(this.camera, this.input);
    this.terminal = new TerminalSystem(this.input);
    this.collectibles = new CollectiblesSystem(this.scene, this.camera, this.player, this.physicsWorld);

    // Detect unlock when in-game (e.g. user pressed ESC or window lost focus)
    this.player.onUnlock(() => {
      const isTerminalOpen = useGameStore.getState().isTerminalOpen;
      if (this.state === GameState.PLAYING && !isTerminalOpen) {
        this.transitionTo(GameState.PAUSED);
      }
    });
  }

  public startGame() {
    // Reset global store state
    const store = useGameStore.getState();
    store.setBattery(100);
    store.setBatteryUnstable(false);
    store.setTerminalOpen(false);
    store.setTriggerGlitch(false);

    // Remove volatile items
    const volatileIds = store.inventory.filter(i => i.volatile).map(i => i.id);
    if (volatileIds.length > 0) {
      store.removeCollectibles(volatileIds);
    }

    // Re-build fresh world
    this.setupWorld();

    this.transitionTo(GameState.PLAYING);

    // Lock pointer immediately on button click
    this.player.lock();

    // Subtle loading bar animation & shader pre-compilation
    if (this.uiLoadingBar) {
      this.uiLoadingBar.style.opacity = '1';
      this.uiLoadingBar.style.width = '30%';
    }

    requestAnimationFrame(() => {
      if (this.uiLoadingBar) {
        this.uiLoadingBar.style.width = '70%';
      }

      // Precompile all shader variants
      this.precompileShaders();

      if (this.uiLoadingBar) {
        this.uiLoadingBar.style.width = '100%';
      }

      // Synchronize frame timer after compilation to prevent physics delta spikes
      this.lastTime = performance.now();

      setTimeout(() => {
        if (this.uiLoadingBar) {
          this.uiLoadingBar.style.opacity = '0';
          setTimeout(() => {
            if (this.uiLoadingBar) this.uiLoadingBar.style.width = '0%';
          }, 200);
        }
      }, 80);
    });
  }

  private precompileShaders() {
    if (!this.renderer || !this.scene || !this.camera) return;

    // Force lamp spotlight on to compile spotlight shader variants for all scene materials
    if (this.lamp) {
      this.lamp.setLightState(true);
    }

    // Compile materials in the scene
    this.renderer.compile(this.scene, this.camera);

    // Perform one full render pass to warm up EffectComposer passes (Fisheye, RenderPass, AsciiEffect)
    if (typeof this.render === 'function') {
      this.render(this.scene, this.camera);
    }

    // Restore lamp to its actual state (off by default)
    if (this.lamp) {
      this.lamp.setLightState(this.lamp.getIsOn());
    }
  }

  public resumeGame() {
    this.transitionTo(GameState.PLAYING);
    this.lastTime = performance.now();
    setTimeout(() => {
      this.player.lock();
    }, 50);
  }

  private stopGame() {
    if (this.map && typeof this.map.dispose === 'function') {
      this.map.dispose();
    }
    if (this.player && typeof this.player.dispose === 'function') {
      this.player.dispose();
    }
    if (this.lamp && typeof this.lamp.dispose === 'function') {
      this.lamp.dispose(this.camera);
    }
    if (this.terminal && typeof this.terminal.dispose === 'function') {
      this.terminal.dispose();
    }
    if (this.collectibles && typeof this.collectibles.dispose === 'function') {
      this.collectibles.dispose();
    }
    if (this.input && typeof this.input.dispose === 'function') {
      this.input.dispose();
    }
    if (typeof this.cleanupRenderer === 'function') {
      this.cleanupRenderer();
    }

    const appContainer = document.getElementById('app');
    if (appContainer) appContainer.innerHTML = '';
  }

  private animate = (time: number) => {
    requestAnimationFrame(this.animate);

    const delta = Math.min((time - this.lastTime) / 1000, 0.1); // Cap delta to prevent physics explosion
    this.lastTime = time;

    if (this.state === GameState.PLAYING) {
      // Step physics simulation
      this.physicsWorld.step();

      // Update active subsystems
      this.map.update(delta);
      this.player.update(delta);
      this.lamp.update(delta);
      this.collectibles.update(delta);

      this.updateHUD();

      // Check modular game over condition
      if (this.checkGameOverCondition()) {
        this.transitionTo(GameState.GAMEOVER);
      }
    } else if (this.state === GameState.MENU) {
      // Elegant camera orbit around the center of the map for background visuals
      if (this.camera) {
        const time = performance.now() * 0.0003;
        this.camera.position.x = Math.sin(time) * 16;
        this.camera.position.z = Math.cos(time) * 16;
        this.camera.position.y = 4.5 + Math.sin(time * 1.5) * 1.5;
        this.camera.lookAt(0, 1.5, -4);
      }
    }

    // Render ASCII scene in all states
    if (this.render && this.scene && this.camera) {
      this.render(this.scene, this.camera);
    }

    this.calculateFPS(time);
  };

  private checkGameOverCondition(): boolean {
    const storeState = useGameStore.getState();
    if (storeState.battery <= 0) {
      return true;
    }
    return false;
  }

  private updateHUD() {
    const storeState = useGameStore.getState();
    const batteryLevel = storeState.battery;
    const batteryUi = this.uiBatteryUi;
    const batteryBar = this.uiBatteryBar;
    const batteryText = this.uiBatteryText;
    const appContainer = this.uiApp;

    if (batteryBar && batteryText && batteryUi) {
      batteryBar.style.width = `${batteryLevel}%`;
      batteryText.textContent = `${Math.ceil(batteryLevel)}%`;

      if (batteryLevel < 20) {
        batteryBar.style.backgroundColor = '#ff003c';
        batteryBar.style.boxShadow = '0 0 10px #ff003c';
        batteryUi.classList.add('battery-critical');

        if (!this.hasPlayedGlitch) {
          this.hasPlayedGlitch = true;
          batteryUi.classList.add('battery-low-glitch');
          setTimeout(() => batteryUi.classList.remove('battery-low-glitch'), 2000);
        }
      } else {
        this.hasPlayedGlitch = false;
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

    if (appContainer) {
      if (storeState.triggerGlitch) {
        appContainer.classList.add('screen-glitch');
        setTimeout(() => storeState.setTriggerGlitch(false), 5000);
      } else {
        appContainer.classList.remove('screen-glitch');
      }
    }
  }

  private calculateFPS(time: number) {
    this.frames++;
    if (time > this.lastFpsTime + 1000) {
      const fps = Math.round((this.frames * 1000) / (time - this.lastFpsTime));
      useGameStore.getState().setFps(fps);
      const fpsElement = document.getElementById('fps');
      if (fpsElement) fpsElement.textContent = `FPS: ${fps}`;
      this.frames = 0;
      this.lastFpsTime = time;
    }
  }
}
