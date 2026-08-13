import * as THREE from 'three';
import { SharedUniforms } from '../systems/lamp';

export class HiddenMessage extends THREE.Mesh {
  constructor(text: string, width: number, height: number) {
    const canvas = document.createElement('canvas');
    // Using high resolution for clear text
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    
    // Transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 150px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const lines = text.split('\n');
    const lineHeight = 160;
    const startY = (canvas.height - (lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
    });

    const texture = new THREE.CanvasTexture(canvas);

    // Custom Shader that only reacts to the flashlight (in view space)
    const vertexShader = `
      varying vec3 vViewPosition;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec3 vViewPosition;
      varying vec2 vUv;
      
      uniform sampler2D tDiffuse;
      uniform float uLampOn;

      void main() {
        if (uLampOn < 0.5) {
          gl_FragColor = vec4(0.0);
          return;
        }

        // Calculate distance from the camera (origin in view space)
        float dist = length(vViewPosition);
        
        // SpotLight max distance is 10.0 in lamp.ts
        if (dist > 10.0) {
          gl_FragColor = vec4(0.0);
          return;
        }

        // SpotLight direction is -Z in view space
        vec3 lightDir = vec3(0.0, 0.0, -1.0);
        vec3 dirToFragment = normalize(vViewPosition);
        
        // Calculate angle between flashlight and fragment
        float cosAngle = dot(dirToFragment, lightDir);
        float angle = acos(cosAngle);
        
        // Flashlight angle is Math.PI / 5 (from lamp.ts)
        float maxAngle = 3.14159 / 5.0;
        float penumbra = 0.4;
        float innerAngle = maxAngle * (1.0 - penumbra);

        // Angle attenuation (cone edge fading)
        float angleFalloff = smoothstep(maxAngle, innerAngle, angle);
        
        // Distance attenuation (decay=1 in lamp.ts implies linear or physical decay)
        float distFalloff = clamp(1.0 - (dist / 10.0), 0.0, 1.0);
        
        float intensity = angleFalloff * distFalloff;
        
        if (intensity <= 0.0) {
          gl_FragColor = vec4(0.0);
          return;
        }

        vec4 texColor = texture2D(tDiffuse, vUv);
        
        // Multiply by green light color (0x00ff00)
        // Ensure black background pixels are black
        vec3 finalColor = texColor.rgb * vec3(0.0, 1.0, 0.0) * intensity;
        
        gl_FragColor = vec4(finalColor, texColor.a * intensity);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: texture },
        uLampOn: SharedUniforms.uLampOn
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false, // Prevents z-fighting on walls
      polygonOffset: true,
      polygonOffsetFactor: -4, // Pulls the decal slightly forward
      polygonOffsetUnits: -4
    });

    const geometry = new THREE.PlaneGeometry(width, height);
    super(geometry, material);
  }
}
