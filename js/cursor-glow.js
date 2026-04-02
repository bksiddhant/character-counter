/* ============================================================
   cursor-glow.js — Subtle Amber Glow That Follows the Cursor
   
   Uses lerp (linear interpolation) for a smooth, trailing feel.
   Automatically hides on touch devices & respects reduced motion.
   ============================================================ */

(() => {
  'use strict';

  const glow = document.getElementById('cursor-glow');
  if (!glow) return;

  // Skip on touch-only devices
  const isTouchOnly = matchMedia('(hover: none)').matches;
  if (isTouchOnly) { glow.style.display = 'none'; return; }

  // Skip if user prefers reduced motion
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) { glow.style.display = 'none'; return; }

  // Current and target positions
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  let visible = false;

  // Smooth factor — lower = more trail (0.08–0.15 feels organic)
  const LERP = 0.12;

  document.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;

    if (!visible) {
      visible = true;
      glow.style.opacity = '1';
    }
  });

  document.addEventListener('mouseleave', () => {
    visible = false;
    glow.style.opacity = '0';
  });

  function animate() {
    // Lerp toward the target
    currentX += (targetX - currentX) * LERP;
    currentY += (targetY - currentY) * LERP;

    glow.style.transform = `translate(${currentX}px, ${currentY}px)`;

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();
