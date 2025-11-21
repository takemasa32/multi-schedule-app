'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Lightformer, OrbitControls, Text } from '@react-three/drei';
import { useMotionValueEvent } from 'framer-motion';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import type { MotionValue } from 'framer-motion';

const cardsPreset = [
  { color: '#38bdf8', label: '最適日', position: [-1.4, 0.4, 0] as const },
  { color: '#a855f7', label: '参加可', position: [1.1, -0.1, 0.2] as const },
  { color: '#f59e0b', label: '保留', position: [0.2, 1.1, -0.4] as const },
] as const;

/**
 * Canvas内の3Dオブジェクトをまとめるサブコンポーネント。
 * useFrameはCanvasコンテキスト内でのみ利用できるため、別コンポーネントに分割している。
 */
function SceneContent({ cards, scrollProgress }: { cards: typeof cardsPreset; scrollProgress: MotionValue<number> }) {
  const groupRef = useRef<Group>(null);
  const scrollValueRef = useRef(0);

  useMotionValueEvent(scrollProgress, 'change', (latest) => {
    scrollValueRef.current = latest;
  });

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    const scrollInfluence = scrollValueRef.current * 1.2;

    if (groupRef.current) {
      groupRef.current.rotation.x = 0.4 + scrollInfluence * 0.3 + Math.sin(elapsed * 0.6) * 0.03;
      groupRef.current.rotation.y = -0.6 + scrollInfluence * 1.1 + Math.cos(elapsed * 0.4) * 0.06;
    }
  });

  return (
    <group ref={groupRef}>
      {cards.map((card, index) => (
        <Float
          key={card.label}
          speed={2}
          rotationIntensity={0.2}
          floatIntensity={0.8}
          position={card.position}
          delay={index * 0.4}
        >
          <mesh castShadow receiveShadow scale={[1.6, 1, 0.08]}>
            <boxGeometry args={[1, 0.6, 0.14]} />
            <meshStandardMaterial color={card.color} metalness={0.5} roughness={0.28} />
          </mesh>
          <Text
            position={[0, 0, 0.12]}
            fontSize={0.18}
            color="#0f172a"
            anchorX="center"
            anchorY="middle"
            maxWidth={1.4}
          >
            {card.label}
          </Text>
        </Float>
      ))}
      <Lightformer position={[0, 0, 8]} scale={5} intensity={1.4} color="#38bdf8" />
      <Lightformer position={[-6, -4, -6]} scale={4} intensity={0.8} color="#a855f7" />
    </group>
  );
}

/**
 * ヒーローセクションで使用する3Dシーン。
 * スクロール量に合わせて回転を変化させ、閲覧者が進むほど立体感が強まる演出にしている。
 */
export function HeroScene({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  const cards = useMemo(() => cardsPreset, []);

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
      {/* Canvas自体のラッパー。OrbitControlsはマウスドラッグで動かせるように軽めに有効化 */}
      <Canvas shadows camera={{ position: [0, 0, 6], fov: 48 }}>
        <color attach="background" args={["#0f172a"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
        <SceneContent cards={cards} scrollProgress={scrollProgress} />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent" />
      <div className="absolute left-3 top-3 rounded-full bg-white/5 px-3 py-1 text-xs text-white/80 ring-1 ring-white/10">
        スクロールと連動した3Dプレビュー
      </div>
    </div>
  );
}
