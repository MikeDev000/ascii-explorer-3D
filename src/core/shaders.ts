import * as THREE from 'three';

export const FisheyeShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'strength': { value: 0.72 },
    'uResolution': { value: new THREE.Vector2(1, 1) }
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float strength;
    uniform vec2 uResolution;
    varying vec2 vUv;

    void main() {
      // Coordenadas del centro [-1, 1]
      vec2 d = vUv * 2.0 - 1.0;
      
      // Corrección de relación de aspecto
      float aspect = uResolution.x / uResolution.y;
      d.x *= aspect;
      
      float r = length(d);
      
      // Deformación de barril (Ojo de pez limpio sin recortar bordes a negro)
      float factor = 1.0 - strength * 0.10 * (r * r);
      
      vec2 dDistorted = d * factor;
      dDistorted.x /= aspect;
      vec2 uvDistorted = dDistorted * 0.5 + 0.5;
      
      // Clamp para asegurar campo de visión completo hasta los extremos de la pantalla
      uvDistorted = clamp(uvDistorted, 0.0, 1.0);
      
      gl_FragColor = texture2D(tDiffuse, uvDistorted);
    }
  `
};

export const FisheyeAberrationShader = FisheyeShader;
