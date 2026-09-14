import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────
const TOTAL_DURATION = 5.2;



// ─── Procedural Bullet Train Geometry ────────────────────────
// Creates an aerodynamic arched cross-section with true spherical bullet-nose dome and clean wireframe grid
function createBulletTrainGeometry(): THREE.BufferGeometry {
  const slices = 38; // along Z (20 for nose, 18 for body)
  const segments = 32; // around perimeter

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const W = 1.45; // half-width
  const H_TOP = 2.85; // dome peak height
  const H_SHOULDER = 1.55; // shoulder height where vertical sides meet dome arch
  const H_BOTTOM = 0.52; // flat bottom clearance above rails
  const Y_CENTER = 1.65; // vertical center of nose dome

  // Precompute cross-section perimeter points (rounded dome top, vertical walls, flat bottom)
  const perimeter: { x: number; y: number }[] = [];
  for (let j = 0; j <= segments; j++) {
    const angle = (j / segments) * Math.PI * 2;
    let px = 0;
    let py = 0;

    if (angle >= 0 && angle <= Math.PI) {
      // Upper dome arch (smooth semicircular cap)
      px = Math.cos(angle) * W;
      py = H_SHOULDER + Math.sin(angle) * (H_TOP - H_SHOULDER);
    } else {
      // Lower sides and flat bottom
      const t = (angle - Math.PI) / Math.PI; // 0 to 1
      if (t < 0.22) {
        // Left vertical side
        const s = t / 0.22;
        px = -W;
        py = H_SHOULDER - s * (H_SHOULDER - H_BOTTOM);
      } else if (t > 0.78) {
        // Right vertical side
        const s = (t - 0.78) / 0.22;
        px = W;
        py = H_BOTTOM + s * (H_SHOULDER - H_BOTTOM);
      } else {
        // Flat horizontal bottom
        const s = (t - 0.22) / 0.56; // 0 to 1
        px = -W + s * 2 * W;
        py = H_BOTTOM;
      }
    }
    perimeter.push({ x: px, y: py });
  }

  // Generate vertices along slices
  for (let i = 0; i <= slices; i++) {
    let z = 0;
    let scaleX = 1;
    let scaleY = 1;

    if (i <= 20) {
      // Aerodynamic spherical bullet nose dome
      // u from 0.04 (front tip) to 1.0 (body junction)
      const u = (i + 0.4) / 20.4;
      // Ellipsoid coordinates: z^2 / 2.8^2 + scale^2 = 1
      z = 2.8 * Math.cos(u * Math.PI * 0.5);
      scaleX = Math.sin(u * Math.PI * 0.5);
      scaleY = Math.sin(u * Math.PI * 0.5);
    } else {
      // Body section: extends backwards along the tracks
      const t = (i - 20) / (slices - 20);
      z = -t * 45;
      scaleX = 1;
      scaleY = 1;
    }

    for (let j = 0; j <= segments; j++) {
      const p = perimeter[j];
      const vx = p.x * scaleX;
      // Curves top and bottom smoothly into center of nose
      const vy = Y_CENTER + (p.y - Y_CENTER) * scaleY;
      const vz = z;

      positions.push(vx, vy, vz);
      uvs.push(j / segments, i / slices);
    }
  }

  // Connect quads (two triangles per grid cell)
  const stride = segments + 1;
  for (let i = 0; i < slices; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ─── 3D Train Model ──────────────────────────────────────────
// Aerodynamic bullet train nose with clean wireframe grid and warm amber headlights
function StraightTrainModel({ trainRef }: { trainRef: React.RefObject<THREE.Group | null> }) {
  // Wireframe material (vibrant cyan/electric blue)
  const wireMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#00E5FF'),
        wireframe: true,
        transparent: true,
        opacity: 0.75,
      }),
    []
  );

  // Dark translucent fuselage material
  const bodyMat = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: new THREE.Color('#030F22'),
        transparent: true,
        opacity: 0.8,
        shininess: 95,
        specular: new THREE.Color('#00E5FF'),
        side: THREE.DoubleSide,
      }),
    []
  );

  // Cockpit windshield tint
  const windshieldMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#010712'),
        transparent: true,
        opacity: 0.9,
      }),
    []
  );

  // Amber headlight emissive material
  const amberLightMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#FFAA33'),
      }),
    []
  );

  // Amber side marker light material
  const sideLightMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#FF7700'),
      }),
    []
  );

  // Soft glowing sprite texture for headlights
  const glowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(255, 180, 50, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 120, 20, 0.7)');
      gradient.addColorStop(0.7, 'rgba(255, 90, 0, 0.25)');
      gradient.addColorStop(1, 'rgba(255, 60, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Aerodynamic bullet train geometry
  const trainGeo = useMemo(() => createBulletTrainGeometry(), []);

  // Speed line rays radiating outward from train sides
  const speedRays = useMemo(() => {
    const rays: { start: [number, number, number]; end: [number, number, number] }[] = [];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const x = Math.cos(angle) * 1.8;
      const y = Math.sin(angle) * 1.4 + 1.6;
      const length = 10 + Math.random() * 14;
      rays.push({
        start: [x, y, 0],
        end: [x * 1.7, y * 1.4, -length],
      });
    }
    return rays;
  }, []);

  return (
    <group ref={trainRef} position={[0, 0, -45]}>
      {/* ── UNIFIED BULLET TRAIN FUSELAGE & NOSE ── */}
      <mesh geometry={trainGeo} material={bodyMat} />
      <mesh geometry={trainGeo} material={wireMat} />

      {/* ── WINDSHIELD VISOR STRIP ── */}
      <mesh position={[0, 1.95, 1.55]} rotation={[-0.24, 0, 0]}>
        <boxGeometry args={[1.8, 0.45, 0.05]} />
        <meshBasicMaterial color="#020612" transparent opacity={0.92} />
      </mesh>
      <mesh position={[0, 1.95, 1.55]} rotation={[-0.24, 0, 0]}>
        <boxGeometry args={[1.8, 0.45, 0.05]} />
        <meshBasicMaterial color="#00E5FF" wireframe transparent opacity={0.65} />
      </mesh>

      {/* ── AMBER HEADLIGHTS (angled almond shape matching reference image) ── */}
      {/* Left Headlight */}
      <group position={[-0.74, 1.48, 1.52]} rotation={[0.06, -0.2, 0.35]}>
        <mesh material={amberLightMat} scale={[0.46, 0.9, 0.25]}>
          <sphereGeometry args={[0.5, 24, 24]} />
        </mesh>
        {/* Inner white-hot core */}
        <mesh position={[0, 0, 0.06]} scale={[0.28, 0.58, 0.18]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#FFF9E6" />
        </mesh>
        <pointLight color="#FFE090" intensity={9} distance={45} decay={1.8} />
        <pointLight color="#FF7700" intensity={15} distance={65} decay={1.8} />
        <sprite scale={[3.4, 3.4, 1]}>
          <spriteMaterial
            map={glowTexture}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      </group>

      {/* Right Headlight */}
      <group position={[0.74, 1.48, 1.52]} rotation={[0.06, 0.2, -0.35]}>
        <mesh material={amberLightMat} scale={[0.46, 0.9, 0.25]}>
          <sphereGeometry args={[0.5, 24, 24]} />
        </mesh>
        {/* Inner white-hot core */}
        <mesh position={[0, 0, 0.06]} scale={[0.28, 0.58, 0.18]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#FFF9E6" />
        </mesh>
        <pointLight color="#FFE090" intensity={9} distance={45} decay={1.8} />
        <pointLight color="#FF7700" intensity={15} distance={65} decay={1.8} />
        <sprite scale={[3.4, 3.4, 1]}>
          <spriteMaterial
            map={glowTexture}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      </group>

      {/* ── SIDE GLOW MARKERS (lower cheeks) ── */}
      {/* Left side marker */}
      <group position={[-1.38, 1.05, 0.6]} rotation={[0, -0.25, 0]}>
        <mesh material={sideLightMat}>
          <boxGeometry args={[0.06, 0.14, 0.55]} />
        </mesh>
        <pointLight color="#FF6600" intensity={3} distance={15} decay={2} />
        <sprite scale={[1.8, 1.8, 1]}>
          <spriteMaterial map={glowTexture} transparent opacity={0.65} blending={THREE.AdditiveBlending} />
        </sprite>
      </group>

      {/* Right side marker */}
      <group position={[1.38, 1.05, 0.6]} rotation={[0, 0.25, 0]}>
        <mesh material={sideLightMat}>
          <boxGeometry args={[0.06, 0.14, 0.55]} />
        </mesh>
        <pointLight color="#FF6600" intensity={3} distance={15} decay={2} />
        <sprite scale={[1.8, 1.8, 1]}>
          <spriteMaterial map={glowTexture} transparent opacity={0.65} blending={THREE.AdditiveBlending} />
        </sprite>
      </group>

      {/* ── RADIATING SPEED LIGHT RAYS ── */}
      {speedRays.map((ray, i) => (
        <line key={`speed-ray-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([...ray.start, ...ray.end])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#38BDF8"
            transparent
            opacity={0.45}
            blending={THREE.AdditiveBlending}
          />
        </line>
      ))}
    </group>
  );
}

// ─── Straight Railway Track & Raised Ballast Bed ──────────────
// Features elevated track structure, wireframe grid sleepers, rails, and flanking orange laser streaks
function StraightRailwayTracks() {
  const TRACK_LENGTH = 340;
  const SLEEPER_SPACING = 0.9;
  const sleeperCount = Math.floor(TRACK_LENGTH / SLEEPER_SPACING);

  // Sleepers data along straight Z axis
  const sleepers = useMemo(() => {
    const list: number[] = [];
    for (let i = 0; i < sleeperCount; i++) {
      list.push(-240 + i * SLEEPER_SPACING);
    }
    return list;
  }, [sleeperCount]);

  // Rails along straight Z axis
  const railGeo = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.1, 0.14, TRACK_LENGTH);
    return geo;
  }, [TRACK_LENGTH]);

  return (
    <group position={[0, 0, 0]}>
      {/* ── RAISED TRACK BED (Embankment) ── */}
      <mesh position={[0, 0.1, -60]}>
        <boxGeometry args={[3.8, 0.2, TRACK_LENGTH]} />
        <meshPhongMaterial color="#020815" transparent opacity={0.9} />
      </mesh>
      {/* Embankment wireframe grid */}
      <mesh position={[0, 0.1, -60]}>
        <boxGeometry args={[3.8, 0.2, TRACK_LENGTH]} />
        <meshBasicMaterial color="#00E5FF" wireframe transparent opacity={0.35} />
      </mesh>

      {/* ── SLEEPERS (Wireframe Blocks) ── */}
      {sleepers.map((z, idx) => (
        <group key={`sleeper-${idx}`} position={[0, 0.26, z]}>
          {/* Sleeper body */}
          <mesh>
            <boxGeometry args={[3.2, 0.16, 0.44]} />
            <meshPhongMaterial color="#041226" transparent opacity={0.88} />
          </mesh>
          {/* Sleeper glowing wireframe grid */}
          <mesh>
            <boxGeometry args={[3.2, 0.16, 0.44]} />
            <meshBasicMaterial
              color="#00E5FF"
              wireframe
              transparent
              opacity={idx % 2 === 0 ? 0.8 : 0.5}
            />
          </mesh>
        </group>
      ))}

      {/* ── STEEL RAILS (Glowing Cyan) ── */}
      {/* Left Rail */}
      <mesh geometry={railGeo} position={[-1.2, 0.4, -60]}>
        <meshBasicMaterial color="#00E5FF" />
      </mesh>
      {/* Right Rail */}
      <mesh geometry={railGeo} position={[1.2, 0.4, -60]}>
        <meshBasicMaterial color="#00E5FF" />
      </mesh>

      {/* Rail glow lines underneath */}
      <mesh position={[-1.2, 0.4, -60]}>
        <boxGeometry args={[0.2, 0.04, TRACK_LENGTH]} />
        <meshBasicMaterial color="#38BDF8" transparent opacity={0.5} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[1.2, 0.4, -60]}>
        <boxGeometry args={[0.2, 0.04, TRACK_LENGTH]} />
        <meshBasicMaterial color="#38BDF8" transparent opacity={0.5} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* ── FLANKING AMBER / ORANGE GROUND LASER LINES ── */}
      {/* These match the prominent orange streaks on left and right in the reference image */}
      <mesh position={[-5.0, 0.02, -60]}>
        <boxGeometry args={[0.16, 0.04, TRACK_LENGTH]} />
        <meshBasicMaterial color="#FF7700" />
      </mesh>
      <mesh position={[-5.0, 0.02, -60]}>
        <boxGeometry args={[0.6, 0.02, TRACK_LENGTH]} />
        <meshBasicMaterial color="#FF5500" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh position={[5.0, 0.02, -60]}>
        <boxGeometry args={[0.16, 0.04, TRACK_LENGTH]} />
        <meshBasicMaterial color="#FF7700" />
      </mesh>
      <mesh position={[5.0, 0.02, -60]}>
        <boxGeometry args={[0.6, 0.02, TRACK_LENGTH]} />
        <meshBasicMaterial color="#FF5500" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

// ─── Digital Ground Grid ─────────────────────────────────────
function GroundGrid() {
  return (
    <group position={[0, -0.01, -50]}>
      {/* Central perspective grid */}
      <gridHelper args={[400, 100, new THREE.Color('#00E5FF'), new THREE.Color('#081E38')]} />
      {/* Deep black ground plane below grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[450, 450]} />
        <meshBasicMaterial color="#020612" transparent opacity={0.96} />
      </mesh>
    </group>
  );
}

// ─── Wireframe Mountains on Left and Right Horizon ──────────
function HorizonMountains() {
  // Left mountain range
  const leftMountainGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(160, 45, 24, 12);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (y > -20) {
        const heightFactor = Math.sin((x + 80) * 0.05) * Math.cos(y * 0.1) * 8 + Math.sin(x * 0.12) * 5;
        pos.setZ(i, Math.abs(heightFactor));
      }
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Right mountain range
  const rightMountainGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(160, 45, 24, 12);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (y > -20) {
        const heightFactor = Math.cos((x - 80) * 0.05) * Math.sin(y * 0.1) * 8 + Math.cos(x * 0.14) * 5;
        pos.setZ(i, Math.abs(heightFactor));
      }
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group position={[0, 4, -200]}>
      {/* Left Wireframe Mountains */}
      <mesh geometry={leftMountainGeo} position={[-95, 6, 0]}>
        <meshBasicMaterial color="#0088CC" wireframe transparent opacity={0.16} />
      </mesh>
      {/* Right Wireframe Mountains */}
      <mesh geometry={rightMountainGeo} position={[95, 6, 0]}>
        <meshBasicMaterial color="#0088CC" wireframe transparent opacity={0.16} />
      </mesh>
    </group>
  );
}

// ─── High-Speed Cosmic Particles ─────────────────────────────
function SpeedParticles({ progressRef }: { progressRef: React.RefObject<number> }) {
  const count = 300;
  const meshRef = useRef<THREE.Points>(null);
  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = 0.5 + Math.random() * 16;
      pos[i * 3 + 2] = -220 + Math.random() * 240;
      spd[i] = 1.0 + Math.random() * 2.5;
    }
    return [pos, spd];
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    const p = progressRef.current ?? 0;
    const posArr = meshRef.current.geometry.attributes.position.array as Float32Array;
    const velocityFactor = 0.8 + p * 3.5;

    for (let i = 0; i < count; i++) {
      posArr[i * 3 + 2] += speeds[i] * velocityFactor;
      if (posArr[i * 3 + 2] > 20) {
        posArr[i * 3 + 2] = -220;
      }
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color="#00E5FF"
        size={0.15}
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// ─── Scene Master Orchestrator ───────────────────────────────
function Scene({
  progressRef,
  onTrainArrived,
}: {
  progressRef: React.MutableRefObject<number>;
  onTrainArrived: () => void;
}) {
  const trainRef = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now());
  const arrivedRef = useRef(false);
  const { camera } = useThree();

  useFrame(() => {
    const elapsed = (Date.now() - startTime.current) / 1000;
    const rawT = Math.min(elapsed / TOTAL_DURATION, 1);
    progressRef.current = rawT;

    if (!trainRef.current) return;

    // Train travels STRAIGHT along Z-axis:
    // 1) 0% -> 44%: Train speeds down straight track from z=-48 to hero position z=-2.8
    // 2) 44% -> 80%: Train holds hero position right in front of camera matching reference image
    // 3) 80% -> 100%: Train rushes into camera with white light bloom transition into dashboard
    let currentZ = -48;
    if (rawT < 0.44) {
      const t = rawT / 0.44;
      const ease = 1 - Math.pow(1 - t, 2.6);
      currentZ = -48 + (-2.8 - (-48)) * ease;
    } else if (rawT < 0.82) {
      // Hold hero reference framing with subtle forward glide
      const t = (rawT - 0.44) / 0.38;
      currentZ = -2.8 + (-2.0 - (-2.8)) * t;
    } else {
      // Final rush past camera with light bloom
      const t = (rawT - 0.82) / 0.18;
      const easeRush = Math.pow(t, 2.2);
      currentZ = -2.0 + (9.5 - (-2.0)) * easeRush;
    }

    trainRef.current.position.set(0, 0, currentZ);

    // Subtle high-speed micro-vibration
    trainRef.current.position.x = Math.sin(elapsed * 32) * 0.003;
    trainRef.current.position.y = Math.cos(elapsed * 36) * 0.002;

    // Camera stays centered on tracks, with subtle cinematic track tremor near arrival
    const proximity = Math.max(0, 1 - Math.abs(currentZ) / 18);
    camera.position.x = Math.sin(elapsed * 22) * 0.015 * proximity;
    camera.position.y = 2.15 + Math.sin(elapsed * 16) * 0.01 * proximity;
    camera.position.z = 7.5;
    camera.lookAt(0, 1.48, -40);

    // Trigger arrival transition
    if (rawT >= 1 && !arrivedRef.current) {
      arrivedRef.current = true;
      onTrainArrived();
    }
  });

  return (
    <>
      <ambientLight intensity={0.12} color="#061A3A" />
      <directionalLight position={[0, 15, 20]} intensity={0.25} color="#00E5FF" />
      <fog attach="fog" args={['#020612', 25, 260]} />

      <HorizonMountains />
      <GroundGrid />
      <StraightRailwayTracks />
      <StraightTrainModel trainRef={trainRef} />
      <SpeedParticles progressRef={progressRef} />
    </>
  );
}

// ─── Audio Synthesizer ───────────────────────────────────────
function useTrainAudio(progressRef: React.MutableRefObject<number>, muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (muted) return;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      ctxRef.current = ctx;

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(28, ctx.currentTime);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(80, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      const bufferSize = ctx.sampleRate * 2;
      const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const noiseData = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) noiseData[i] = (Math.random() * 2 - 1) * 0.2;
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuf;
      noiseSrc.loop = true;
      const noiseFilt = ctx.createBiquadFilter();
      noiseFilt.type = 'bandpass';
      noiseFilt.frequency.setValueAtTime(160, ctx.currentTime);
      noiseFilt.Q.setValueAtTime(0.5, ctx.currentTime);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0, ctx.currentTime);
      noiseSrc.connect(noiseFilt);
      noiseFilt.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSrc.start();

      const interval = setInterval(() => {
        const p = progressRef.current;
        if (ctx.state === 'closed') return;
        gain.gain.setTargetAtTime(Math.min(p * 0.45, 0.35), ctx.currentTime, 0.15);
        osc.frequency.setTargetAtTime(28 + p * 45, ctx.currentTime, 0.15);
        filter.frequency.setTargetAtTime(80 + p * 260, ctx.currentTime, 0.15);
        noiseGain.gain.setTargetAtTime(Math.min(p * 0.18, 0.12), ctx.currentTime, 0.15);
      }, 100);

      return () => {
        clearInterval(interval);
        try { osc.stop(); } catch (_) {}
        try { noiseSrc.stop(); } catch (_) {}
        ctx.close().catch(() => {});
      };
    } catch {
      // silent fail
    }
  }, [muted, progressRef]);
}

// ─── Main Component ──────────────────────────────────────────
interface LoadingIntroProps {
  onComplete: () => void;
}

export const LoadingIntro: React.FC<LoadingIntroProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [trainArrived, setTrainArrived] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [visible, setVisible] = useState(true);
  const [muted, setMuted] = useState(false);
  const progressRef = useRef(0);

  useTrainAudio(progressRef, muted);

  useEffect(() => {
    const interval = setInterval(() => {
      const p = progressRef.current;
      setProgress(p);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  const handleTrainArrived = useCallback(() => {
    setTrainArrived(true);
    setTimeout(() => setFadingOut(true), 350);
    setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 1100);
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    setFadingOut(true);
    setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 400);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="cinematic-train-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: fadingOut ? 0 : 1 }}
        transition={{ duration: fadingOut ? 0.8 : 0.4 }}
        className="fixed inset-0 z-[99999] bg-[#020612] overflow-hidden select-none"
      >
        {/* 3D WebGL Canvas */}
        <Canvas
          camera={{ position: [0, 2.45, 10], fov: 55, near: 0.1, far: 500 }}
          gl={{ antialias: true, alpha: false }}
          className="absolute inset-0"
          dpr={[1, 1.5]}
        >
          <Scene progressRef={progressRef} onTrainArrived={handleTrainArrived} />
        </Canvas>

        {/* Dynamic Headlight Ambient Glow Overlay */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(255, 120, 0, 0.14) 0%, rgba(255, 80, 0, 0.05) 25%, transparent 50%)',
            opacity: Math.min(0.15 + progress * 0.5, 0.75),
          }}
        />

        {/* Transition Flash on Train Arrival */}
        {(trainArrived || progress > 0.94) && (
          <motion.div
            className="absolute inset-0 bg-white pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: trainArrived ? [0.9, 0] : (progress - 0.94) / 0.06 }}
            transition={{ duration: 0.4 }}
          />
        )}

        {/* ────────────────────────────────────────────────────────
            UI SCREEN OVERLAY (Identical to user reference image)
           ──────────────────────────────────────────────────────── */}
        <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-10 pointer-events-none">
          {/* TOP SECTION: Headline + Buttons (Left) and Stats Cards (Right) */}
          <div className="flex justify-between items-start w-full">
            {/* Top Left: Hero Headline & Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-md lg:max-w-xl"
            >
              <h1 className="text-2xl sm:text-4xl lg:text-[42px] font-bold text-white tracking-tight leading-tight">
                Experience Seamless Train Travel
              </h1>
              <p className="text-sm sm:text-lg text-slate-300/90 font-medium mt-1.5 sm:mt-2.5">
                Your Journey, Our Commitment!
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 sm:gap-4 mt-4 sm:mt-6 pointer-events-auto">
                <button
                  onClick={handleSkip}
                  className="bg-white text-black font-semibold text-xs sm:text-sm px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg shadow-lg hover:bg-slate-100 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  Contact Us
                </button>
                <button
                  onClick={handleSkip}
                  className="border border-white/30 text-white font-medium text-xs sm:text-sm px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all duration-200 backdrop-blur-sm cursor-pointer"
                >
                  Our Services
                </button>
              </div>
            </motion.div>

            {/* Top Right: Vertically Stacked Glass Stats Cards */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col gap-3 sm:gap-4 pointer-events-auto"
            >
              {/* Card 1: Train */}
              <div className="border border-white/20 bg-slate-950/40 backdrop-blur-md rounded-xl py-3 px-4 sm:py-4 sm:px-6 w-24 sm:w-32 text-center shadow-xl">
                <div className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                  +100
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 font-normal mt-0.5">
                  Train
                </div>
              </div>

              {/* Card 2: Passenger */}
              <div className="border border-white/20 bg-slate-950/40 backdrop-blur-md rounded-xl py-3 px-4 sm:py-4 sm:px-6 w-24 sm:w-32 text-center shadow-xl">
                <div className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                  +50K
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 font-normal mt-0.5">
                  Passenger
                </div>
              </div>

              {/* Card 3: City */}
              <div className="border border-white/20 bg-slate-950/40 backdrop-blur-md rounded-xl py-3 px-4 sm:py-4 sm:px-6 w-24 sm:w-32 text-center shadow-xl">
                <div className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                  +19
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 font-normal mt-0.5">
                  City
                </div>
              </div>
            </motion.div>
          </div>

          {/* BOTTOM SECTION: Loading Bar & Subtitle + Audio Mute */}
          <div className="relative w-full flex flex-col items-center mb-2 sm:mb-4">
            {/* Center Loading Bar Container */}
            <div className="w-full max-w-sm sm:max-w-lg flex flex-col items-center">
              {/* Sleek Orange Progress Bar */}
              <div className="w-full h-1.5 sm:h-2 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 backdrop-blur-sm">
                <div
                  className="h-full bg-gradient-to-r from-[#FF8A00] to-[#FF5500] rounded-full transition-all duration-75 shadow-[0_0_12px_rgba(255,107,0,0.85)]"
                  style={{ width: `${Math.min(progress * 100, 100)}%` }}
                />
              </div>

              {/* "LOADING..." text */}
              <div className="text-[11px] sm:text-xs font-semibold text-slate-400 tracking-[0.35em] uppercase mt-3">
                L O A D I N G . . .
              </div>

              {/* Tagline */}
              <div className="text-[9px] sm:text-[11px] font-medium text-slate-400/80 tracking-[0.3em] uppercase mt-1">
                INDIAN RAILWAYS &nbsp;•&nbsp; A STRONGER TOMORROW
              </div>
            </div>

            {/* Bottom Right: Audio Equalizer Indicator & Skip Button */}
            <div className="absolute right-0 bottom-0 flex items-center gap-3 pointer-events-auto">
              <button
                onClick={handleSkip}
                className="text-[10px] sm:text-xs text-slate-400 hover:text-white px-2 py-1 rounded border border-white/10 hover:border-white/30 bg-slate-900/40 backdrop-blur-sm transition cursor-pointer"
              >
                Skip
              </button>

              <button
                onClick={() => setMuted((m) => !m)}
                className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-900/40 hover:bg-slate-800/60 border border-white/10 hover:border-white/20 text-slate-300 transition cursor-pointer"
                title={muted ? 'Unmute audio' : 'Mute audio'}
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-slate-300" />
                    {/* Animated Orange Equalizer Bars */}
                    <div className="flex items-end gap-[2px] h-3">
                      <span className="w-[3px] bg-[#FF7700] rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-2" />
                      <span className="w-[3px] bg-[#FF7700] rounded-full animate-[pulse_0.9s_ease-in-out_infinite] h-3" />
                      <span className="w-[3px] bg-[#FF7700] rounded-full animate-[pulse_0.75s_ease-in-out_infinite] h-1.5" />
                    </div>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
