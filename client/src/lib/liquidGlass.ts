// src/lib/liquidGlass.ts
// Listeners globais (delegação): atualizam qualquer .lg-glass, inclusive os Cards.
const SELECTOR = '.lg-glass';

export function initLiquidGlass(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  let hovered: HTMLElement | null = null;
  let pressed: HTMLElement | null = null;
  let pointerType = 'mouse';
  let lastEvent: PointerEvent | null = null;
  let frame = 0;

  const glassAt = (target: EventTarget | null): HTMLElement | null =>
    (target as Element | null)?.closest?.<HTMLElement>(SELECTOR) ?? null;

  const setVar = (el: HTMLElement, name: string, value: string | number) =>
    el.style.setProperty(name, String(value));

  // Posição do ponteiro dentro do elemento, em porcentagem
  const track = (el: HTMLElement, e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    setVar(el, '--lg-x', `${((e.clientX - r.left) / r.width) * 100}%`);
    setVar(el, '--lg-y', `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  // Uma atualização por frame, para não recalcular o layout a cada evento
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const el = pressed ?? hovered;
      if (el && lastEvent) track(el, lastEvent);
    });
  };

  const setHover = (el: HTMLElement | null) => {
    if (el === hovered) return;
    if (hovered) setVar(hovered, '--lg-hover', 0);
    hovered = el;
    if (el) setVar(el, '--lg-hover', 1);
  };

  const onMove = (e: PointerEvent) => {
    pointerType = e.pointerType;
    lastEvent = e;
    if (pressed) {
      schedule();
      return;
    }
    if (e.pointerType === 'touch') return;
    setHover(glassAt(e.target));
    if (hovered) schedule();
  };

  const onDown = (e: PointerEvent) => {
    pointerType = e.pointerType;
    const el = glassAt(e.target);
    if (!el) return;
    pressed = el;
    lastEvent = e;
    setHover(el);
    track(el, e);
    setVar(el, '--lg-press', 1);
  };

  const onUp = () => {
    if (pressed) setVar(pressed, '--lg-press', 0);
    pressed = null;
    // No toque não existe "passar o mouse": ao soltar, o brilho apaga
    if (pointerType === 'touch') setHover(null);
  };

  const onLeaveWindow = () => {
    onUp();
    setHover(null);
  };

  const opts: AddEventListenerOptions = { passive: true };
  document.addEventListener('pointermove', onMove, opts);
  document.addEventListener('pointerdown', onDown, opts);
  document.addEventListener('pointerup', onUp, opts);
  document.addEventListener('pointercancel', onUp, opts);
  document.documentElement.addEventListener('pointerleave', onLeaveWindow, opts);

  return () => {
    cancelAnimationFrame(frame);
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerdown', onDown);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    document.documentElement.removeEventListener('pointerleave', onLeaveWindow);
  };
}