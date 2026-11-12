import type { Directive } from 'vue';

function onPointerDown(e: PointerEvent): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const el = e.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;

  const span = document.createElement('span');
  span.className = 'md-ripple';
  span.style.width = `${size}px`;
  span.style.height = `${size}px`;
  span.style.left = `${e.clientX - rect.left - size / 2}px`;
  span.style.top = `${e.clientY - rect.top - size / 2}px`;

  el.appendChild(span);
  span.addEventListener('animationend', () => span.remove());
}

const ripple: Directive<HTMLElement> = {
  mounted(el) {
    el.classList.add('md-ripple-host');
    el.addEventListener('pointerdown', onPointerDown);
  },
  unmounted(el) {
    el.removeEventListener('pointerdown', onPointerDown);
  },
};

export default ripple;