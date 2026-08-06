import * as THREE from 'three';
import { AsciiEffect } from 'three/examples/jsm/effects/AsciiEffect.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FisheyeShader } from './shaders';

export function createRenderer(scene: THREE.Scene, camera: THREE.Camera) {
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(1); // Low internal resolution for performance

  // Configurar EffectComposer
  const composer = new EffectComposer(renderer);
  composer.setSize(window.innerWidth, window.innerHeight);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const fisheyePass = new ShaderPass(FisheyeShader);
  fisheyePass.uniforms['uResolution'].value.set(window.innerWidth, window.innerHeight);
  composer.addPass(fisheyePass);

  const asciiChars = " .\'\`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  const effect = new AsciiEffect(renderer, asciiChars, {
    resolution: 0.15,
    invert: true,
    color: false,
    alpha: false,
    block: false,
  });

  effect.setSize(window.innerWidth, window.innerHeight);

  // Manejador de cambio de tamaño de ventana (Resize) para mantener pantalla completa
  window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    renderer.setSize(width, height);
    composer.setSize(width, height);
    effect.setSize(width, height);
    fisheyePass.uniforms['uResolution'].value.set(width, height);
  });

  const appContainer = document.getElementById('app');
  if (appContainer) {
    appContainer.appendChild(effect.domElement);
  }

  // Intercept effect.render to run post-processing composer first,
  // then pass the rendered canvas to AsciiEffect without re-rendering the raw scene.
  const realAsciiRender = effect.render.bind(effect);

  effect.render = function (s: THREE.Scene, c: THREE.Camera) {
    // 1. Post-processing pipeline (RenderPass + Shaders -> renderer.domElement)
    composer.render();

    // 2. Temporarily bypass renderer.render so AsciiEffect doesn't overwrite the processed canvas
    const originalRender = renderer.render;
    renderer.render = () => { };

    // 3. AsciiEffect processes the post-processed canvas
    realAsciiRender(s, c);

    // 4. Restore original renderer.render
    renderer.render = originalRender;
  };

  return { renderer, effect, composer };
}
