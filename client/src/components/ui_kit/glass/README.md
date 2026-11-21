# Glass UI Kit

Um pequeno pacote Vue 3 + TypeScript + Vite para adicionar **somente o specular highlight** do Liquid Glass: uma borda com gradiente recortado. O componente não adiciona `backdrop-filter`, blur, transparência, background ou drop shadow.

## Estrutura

```text
glass.pkg/
├── css/
│   ├── before.module.scss
│   ├── glass.module.scss
│   └── outline.module.scss
├── design-tokens/
│   ├── _colors.scss
│   ├── _radii.scss
│   ├── index.scss
│   └── index.ts
├── examples/
│   └── GlassExample.vue
├── src/
│   └── glass.vue
├── types/
│   └── index.ts
├── index.ts
└── README.md
```

## 1. Instalação do Sass

Execute na raiz do projeto Vue/Vite:

```bash
pnpm add -D sass-embedded
```

O Vite reconhece arquivos `.scss` e `.module.scss` sem plugin adicional.

## 2. Importação

Considerando que a pasta esteja em `src/components/uikitpkg/glass.pkg`:

```ts
import { Glass } from '@/components/uikitpkg/glass.pkg'
```

O `index.ts` importa os design tokens globais automaticamente.

## 3. Uso básico

```vue
<script setup lang="ts">
import { Glass } from '@/components/uikitpkg/glass.pkg'
</script>

<template>
  <Glass class="my-card">
    Conteúdo dentro do Glass
  </Glass>

  <Glass as="button" shape="capsule" highlight="strong" type="button">
    Salvar
  </Glass>
</template>
```

## 4. Props

| Prop | Valores | Padrão | Descrição |
|---|---|---|---|
| `as` | tag HTML ou componente Vue | `div` | Elemento raiz renderizado |
| `shape` | `rounded`, `capsule`, `popover` | `rounded` | Formato do raio da borda |
| `highlight` | `none`, `subtle`, `standard`, `strong` | `standard` | Intensidade do highlight |
| `radius` | qualquer valor CSS | — | Sobrescreve o raio por instância |
| `highlightWidth` | qualquer valor CSS | — | Sobrescreve a espessura do highlight |

Todos os atributos HTML não declarados como props, como `id`, `aria-*`, `type`, `disabled`, `title`, `class` e `@click`, são encaminhados ao elemento raiz.

Ao usar `as="button"`, informe `type="button"` quando não quiser que o botão envie um formulário.

## 5. Personalização global

Os tokens são CSS Custom Properties e podem ser sobrescritos no CSS global do app:

```scss
:root {
  --glass-highlight-width: 1.25px;
  --glass-highlight-gradient: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.98),
    rgba(255, 255, 255, 0.12) 48%,
    rgba(255, 255, 255, 0.82)
  );

  --glass-radius-md: 16px;
  --glass-radius-xl: 22px;
}
```

Para alterar apenas uma instância:

```vue
<Glass radius="18px" highlight-width="2px">
  Conteúdo
</Glass>
```

## Observações

- O efeito é apenas um highlight de borda; o fundo e a elevação ficam sob responsabilidade do componente consumidor.
- `before.module.scss`, `glass.module.scss` e `outline.module.scss` são CSS Modules compilados pelo Vite.
- O pacote não importa nem depende de shadcn-vue ou Lucide.
