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

  // Encapsular la renderización sin inyectar comportamiento destructivo en la instancia global de WebGLRenderer
  // Creamos un wrapper proxy/heredado del renderer original donde anulamos render() para pasarlo a AsciiEffect
  const fakeRenderer = Object.create(renderer);
  fakeRenderer.render = () => { };

  const effect = new AsciiEffect(fakeRenderer as THREE.WebGLRenderer, asciiChars, {
    resolution: 0.13,
    invert: true,
    color: false,
    alpha: false,
    block: false,
  });

  effect.setSize(window.innerWidth, window.innerHeight);

  // Manejador de cambio de tamaño de ventana (Resize) para mantener pantalla completa
  const onResize = () => {
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
  };

  window.addEventListener('resize', onResize);

  const cleanup = () => {
    window.removeEventListener('resize', onResize);
  };

  const appContainer = document.getElementById('app');
  if (appContainer) {
    appContainer.appendChild(effect.domElement);

    // High-performance colorization: overlay the WebGL canvas on top of the monochrome ASCII text
    // using mix-blend-mode: multiply. The black background remains black, and white text gets colored.
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.pointerEvents = 'none'; // Let clicks pass through
    renderer.domElement.style.mixBlendMode = 'multiply';
    appContainer.appendChild(renderer.domElement);
  }

  // Nueva función limpia de renderizado que no monkey-patchea el renderer global
  const render = (s: THREE.Scene, c: THREE.Camera) => {
    composer.render();
    effect.render(s, c);
  };

  return { renderer, effect, composer, render, cleanup };
}
