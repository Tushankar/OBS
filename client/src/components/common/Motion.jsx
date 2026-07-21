import { motion } from 'framer-motion';

// ── Shared framer-motion primitives for the PUBLIC site ────────────────────
// Portals (admin/organizer) intentionally stay static. All primitives animate
// transform/opacity only (GPU-cheap), fire once on scroll into view, and are
// disabled automatically for prefers-reduced-motion users via the
// <MotionConfig reducedMotion="user"> wrapper in App.jsx.

// Premium ease-out (fast start, soft landing) used across every reveal.
export const EASE = [0.22, 1, 0.36, 1];

// Fade + rise reveal, triggered once when the element scrolls into view.
// `as` renders any tag (div, section, h1…) so wrappers don't break layout.
export function Reveal({ children, className, as = 'div', delay = 0, y = 24, duration = 0.55, ...rest }) {
  const M = motion[as] || motion.div;
  return (
    <M
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -70px 0px' }}
      transition={{ duration, delay, ease: EASE }}
      className={className}
      {...rest}
    >
      {children}
    </M>
  );
}

// Stagger container — children (StaggerItem) cascade in when the container
// enters the viewport. Use on grids, rails and hero copy.
export function Stagger({ children, className, as = 'div', delay = 0, interval = 0.07, ...rest }) {
  const M = motion[as] || motion.div;
  return (
    <M
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -70px 0px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: interval, delayChildren: delay } } }}
      className={className}
      {...rest}
    >
      {children}
    </M>
  );
}

// One staggered child. Must live (at any depth of plain elements) inside a
// <Stagger>; inherits its cascade timing through variant propagation.
export function StaggerItem({ children, className, as = 'div', y = 18, ...rest }) {
  const M = motion[as] || motion.div;
  return (
    <M
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
      }}
      className={className}
      {...rest}
    >
      {children}
    </M>
  );
}

// Dropdown/popover entrance (header menus): quick fade + settle from above.
export const dropdownMotion = {
  initial: { opacity: 0, y: -6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
  transition: { duration: 0.16, ease: 'easeOut' },
  style: { transformOrigin: 'top' },
};
