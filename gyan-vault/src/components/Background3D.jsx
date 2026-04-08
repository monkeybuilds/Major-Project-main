import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTheme } from '../context/ThemeContext';
import * as THREE from 'three';

// A clean, moving galaxy starfield
const Starfield = ({ isDark }) => {
  const points = useRef();

  // Create a dense starfield
  const starsCount = 3000;

  const [positions, colors, scales] = useMemo(() => {
    const p = new Float32Array(starsCount * 3);
    const c = new Float32Array(starsCount * 3);
    const s = new Float32Array(starsCount);

    const colorGen = new THREE.Color();

    for (let i = 0; i < starsCount; i++) {
      // Create a spherical shell distribution for a wrapping galaxy feel
      const radius = 20 + Math.random() * 80;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);

      p[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = radius * Math.cos(phi) - 20; // Push back behind the immediate view

      // Mostly white/blue stars, occasional yellow/orange
      const mix = Math.random();
      if (mix < 0.7) colorGen.setHSL(0, 0, 0.8 + Math.random() * 0.2); // White/bright grey
      else if (mix < 0.9) colorGen.setHSL(0.6, 0.8, 0.7); // Light blue
      else colorGen.setHSL(0.1, 0.6, 0.6); // Warm orange/yellow

      c[i * 3] = colorGen.r;
      c[i * 3 + 1] = colorGen.g;
      c[i * 3 + 2] = colorGen.b;

      // Varying star sizes
      s[i] = Math.random() * 1.5;
    }
    return [p, c, s];
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (points.current) {
      // Very slow, majestic rotation like a galaxy
      points.current.rotation.y = time * 0.02;
      points.current.rotation.x = time * 0.005;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={starsCount} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={starsCount} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-aScale" count={starsCount} array={scales} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors={true}
        sizeAttenuation={true}
        transparent={true}
        opacity={isDark ? 0.8 : 0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

export default function Background3D() {
  const { isDark } = useTheme();

  return (
    // Fixed inset-0 covers the screen, z-[-10] keeps it behind everything.
    // We add pointer-events-none so it never intercepts clicks meant for the UI.
    <div className="fixed inset-0 pointer-events-none z-[-10] transition-colors duration-700">
      <Canvas camera={{ position: [0, 0, 10], fov: 60 }} style={{ background: isDark ? '#0a0a14' : '#0f172a' }}>
        {/* Very subtle ambient light */}
        <ambientLight intensity={0.1} />

        <Starfield isDark={isDark} />

        {/* Subtle fog to blend distant stars into the background color */}
        <fog attach="fog" args={[isDark ? '#0a0a14' : '#f8fafc', 30, 90]} />
      </Canvas>
    </div>
  );
}
