import * as THREE from 'three';
import { AsciiEffect } from 'three/examples/jsm/effects/AsciiEffect.js';

export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(1); // Low internal resolution for performance

  const asciiChars = " .\'\`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  const effect = new AsciiEffect(renderer, asciiChars, {
    resolution: 0.15,
    invert: true,
    color: false,
    alpha: false,
    block: false,
    // strResolution: 'low'
  });

  effect.setSize(window.innerWidth, window.innerHeight);

  const appContainer = document.getElementById('app');
  if (appContainer) {
    appContainer.appendChild(effect.domElement);
  }

  return { renderer, effect };
}
