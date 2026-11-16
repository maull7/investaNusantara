import { motion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

export const ease = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const item: Variants = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

/** Page enter animation: <Reveal> children appear one after another. */
export function Stagger({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className={className}
        >
            {children}
        </motion.div>
    );
}

/** Fade-up child; inside <Stagger> it follows the stagger, elsewhere it reveals on scroll. */
export function Reveal({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            variants={item}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
