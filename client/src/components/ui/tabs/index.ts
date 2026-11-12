import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Tabs } from './Tabs.vue'
export { default as TabsContent } from './TabsContent.vue'
export { default as TabsList } from './TabsList.vue'
export { default as TabsTrigger } from './TabsTrigger.vue'

export const tabsListVariants = cva(
  'group/tabs-list relative inline-flex w-fit min-w-0 items-center justify-center text-muted-foreground group-data-horizontal/tabs:h-10 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col',
  {
    variants: {
      variant: {
        default: 'gap-1 rounded-full border border-white/60 bg-white/45 p-1 shadow-sm shadow-black/5 backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/45 dark:shadow-black/20 bg-primary/10',
        line: 'gap-1 rounded-none border-0 bg-transparent p-0 shadow-none backdrop-blur-none',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type TabsListVariants = VariantProps<typeof tabsListVariants>
