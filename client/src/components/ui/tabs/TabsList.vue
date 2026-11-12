<script setup lang="ts">
import type { TabsListProps } from 'reka-ui'
import type { HTMLAttributes, ComponentPublicInstance } from 'vue'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { cn } from 'cn'
import { TabsList } from 'reka-ui'
import type { TabsListVariants } from '.'
import { tabsListVariants } from '.'

const props = withDefaults(defineProps<TabsListProps & {
  class?: HTMLAttributes['class']
  variant?: TabsListVariants['variant']
}>(), {
  variant: 'default',
})

const delegatedProps = reactiveOmit(props, 'class', 'variant')
const listRef = ref<ComponentPublicInstance | HTMLElement | null>(null)
const indicatorStyle = ref<Record<string, string>>({ opacity: '0' })

let listElement: HTMLElement | null = null
let resizeObserver: ResizeObserver | undefined
let mutationObserver: MutationObserver | undefined

function resolveListElement(value: unknown): HTMLElement | null {
  if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement)
    return value

  if (value && typeof value === 'object' && '$el' in value) {
    const root = (value as { $el?: unknown }).$el
    if (typeof HTMLElement !== 'undefined' && root instanceof HTMLElement)
      return root
  }

  return null
}

function getTriggers(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]'))
    .filter(tab => tab.closest('[role="tablist"]') === root)
}

async function updateIndicator(): Promise<void> {
  await nextTick()
  listElement = resolveListElement(listRef.value)

  const root = listElement
  if (!root || props.variant !== 'default') {
    indicatorStyle.value = { opacity: '0' }
    return
  }

  const activeTab = getTriggers(root).find(tab =>
    tab.getAttribute('aria-selected') === 'true'
    || tab.getAttribute('data-state') === 'active'
    || tab.hasAttribute('data-active'),
  )

  if (!activeTab) {
    indicatorStyle.value = { opacity: '0' }
    return
  }

  const rootRect = root.getBoundingClientRect()
  const tabRect = activeTab.getBoundingClientRect()
  const vertical = (root.getAttribute('data-orientation') ?? 'horizontal') === 'vertical'

  indicatorStyle.value = {
    width: `${tabRect.width}px`,
    height: `${tabRect.height}px`,
    transform: `translate3d(${tabRect.left - rootRect.left}px, ${tabRect.top - rootRect.top}px, 0)`,
    opacity: '1',
    ...(vertical ? { width: `${Math.max(0, rootRect.width - 8)}px`, transform: `translate3d(4px, ${tabRect.top - rootRect.top}px, 0)` } : {}),
  }
}

function observeChildren(): void {
  if (!resizeObserver || !listElement)
    return

  resizeObserver.disconnect()
  resizeObserver.observe(listElement)
  getTriggers(listElement).forEach(trigger => resizeObserver?.observe(trigger))
}

watch(() => props.variant, () => void updateIndicator(), { flush: 'post' })
watch(() => props.class, () => void updateIndicator(), { flush: 'post' })

onMounted(async () => {
  await nextTick()
  listElement = resolveListElement(listRef.value)
  if (!listElement) {
    void updateIndicator()
    return
  }

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => void updateIndicator())
    observeChildren()
  }

  if (typeof MutationObserver !== 'undefined') {
    mutationObserver = new MutationObserver((records) => {
      if (records.some(record => record.type === 'childList'))
        observeChildren()
      void updateIndicator()
    })
    mutationObserver.observe(listElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-selected', 'data-state', 'data-active', 'data-orientation'],
    })
  }

  window.addEventListener('resize', updateIndicator, { passive: true })
  void updateIndicator()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  mutationObserver?.disconnect()
  window.removeEventListener('resize', updateIndicator)
})
</script>

<template>
  <TabsList
    ref="listRef"
    data-slot="tabs-list"
    :data-variant="variant"
    v-bind="delegatedProps"
    :class="cn(tabsListVariants({ variant }), 'relative isolate', props.class)"
  >
    <span
      v-if="variant === 'default'"
      aria-hidden="true"
      class="nt-tabs-liquid-indicator pointer-events-none absolute left-0 top-1/2 -translate-y-[62.5%] z-0 rounded-full border border-white/80 bg-white/70 shadow-[0_2px_12px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-700/80 dark:shadow-black/20"
      :style="indicatorStyle"
    />
    <slot />
  </TabsList>
</template>

<style scoped>
.nt-tabs-liquid-indicator {
  transition:
    transform 0.4s cubic-bezier(.43,1.08,.55,1.14),
    width 0.4s cubic-bezier(.43,1.08,.55,1.14),
    height 0.4s cubic-bezier(.43,1.08,.55,1.14),
    opacity 0.2s ease;
  will-change: transform, width, height;
}

@media (prefers-reduced-motion: reduce) {
  .nt-tabs-liquid-indicator {
    transition-duration: 1ms !important;
    will-change: auto;
  }
}
</style>
