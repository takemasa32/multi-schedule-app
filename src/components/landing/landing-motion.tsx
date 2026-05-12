'use client';

import type { ReactNode } from 'react';
import { easeOut } from 'motion';
import { motion } from 'motion/react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: easeOut },
  }),
} as const;

type MotionProps = {
  children: ReactNode;
  index?: number;
  className?: string;
};

export function AnimatedItem({ children, index = 0, className }: MotionProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      variants={fadeUp}
      custom={index}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedListItem({ children, index = 0, className }: MotionProps) {
  return (
    <motion.li
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      variants={fadeUp}
      custom={index}
    >
      {children}
    </motion.li>
  );
}

export function AnimatedDetails({ children, index = 0, className }: MotionProps) {
  return (
    <motion.details
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      variants={fadeUp}
      custom={index}
    >
      {children}
    </motion.details>
  );
}
