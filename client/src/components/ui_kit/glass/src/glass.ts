import { appleTokens } from '../tokens';
import type { GlassOptions, GlassStyleOutput } from '../types/glasstypes';
import type { BlurSize, ColorName, ColorScheme, RadiusSize } from '../types/index';

function resolveRadius(size: RadiusSize = 'medium'): string {
  switch (size) {
    case 'small':
      return appleTokens.radius.small;
    case 'medium':
      return appleTokens.radius.medium;
    case 'large':
      return appleTokens.radius.large;
    case 'extralarge':
      return appleTokens.radius.extralarge;
    default:
      return appleTokens.radius.medium;
  }
}

function resolveColor(color: ColorName = 'primary', scheme: ColorScheme = 'dark'): string {
  switch (scheme) {
    case 'light':
      switch (color) {
        case 'primary':
          return appleTokens.color.light.primary;
        case 'secondary':
          return appleTokens.color.light.secondary;
        case 'tertiary':
          return appleTokens.color.light.tertiary;
        case 'foreground':
          return appleTokens.color.light.foreground;
        case 'foregroundSecondary':
          return appleTokens.color.light.foregroundSecondary;
        case 'foregroundTertiary':
          return appleTokens.color.light.foregroundTertiary;
        case 'borderprimary':
          return appleTokens.color.light.borderprimary;
        case 'bordersecondary':
          return appleTokens.color.light.bordersecondary;
        case 'borderforeground':
          return appleTokens.color.light.borderforeground;
        case 'gray':
          return appleTokens.color.light.gray;
        case 'gray2':
          return appleTokens.color.light.gray2;
        case 'gray3':
          return appleTokens.color.light.gray3;
        case 'gray4':
          return appleTokens.color.light.gray4;
        case 'gray5':
          return appleTokens.color.light.gray5;
        case 'gray6':
          return appleTokens.color.light.gray6;
        case 'red':
          return appleTokens.color.light.red;
        case 'orange':
          return appleTokens.color.light.orange;
        case 'yellow':
          return appleTokens.color.light.yellow;
        case 'green':
          return appleTokens.color.light.green;
        case 'mint':
          return appleTokens.color.light.mint;
        case 'teal':
          return appleTokens.color.light.teal;
        case 'cyan':
          return appleTokens.color.light.cyan;
        case 'blue':
          return appleTokens.color.light.blue;
        case 'indigo':
          return appleTokens.color.light.indigo;
        case 'purple':
          return appleTokens.color.light.purple;
        case 'pink':
          return appleTokens.color.light.pink;
        case 'brown':
          return appleTokens.color.light.brown;
        default:
          return appleTokens.color.light.primary;
      }

    case 'dark':
    default:
      switch (color) {
        case 'primary':
          return appleTokens.color.dark.primary;
        case 'secondary':
          return appleTokens.color.dark.secondary;
        case 'tertiary':
          return appleTokens.color.dark.tertiary;
        case 'foreground':
          return appleTokens.color.dark.foreground;
        case 'foregroundSecondary':
          return appleTokens.color.dark.foregroundSecondary;
        case 'foregroundTertiary':
          return appleTokens.color.dark.foregroundTertiary;
        case 'borderprimary':
          return appleTokens.color.dark.borderprimary;
        case 'bordersecondary':
          return appleTokens.color.dark.bordersecondary;
        case 'borderforeground':
          return appleTokens.color.dark.borderforeground;
        case 'gray':
          return appleTokens.color.dark.gray;
        case 'gray2':
          return appleTokens.color.dark.gray2;
        case 'gray3':
          return appleTokens.color.dark.gray3;
        case 'gray4':
          return appleTokens.color.dark.gray4;
        case 'gray5':
          return appleTokens.color.dark.gray5;
        case 'gray6':
          return appleTokens.color.dark.gray6;
        case 'red':
          return appleTokens.color.dark.red;
        case 'orange':
          return appleTokens.color.dark.orange;
        case 'yellow':
          return appleTokens.color.dark.yellow;
        case 'green':
          return appleTokens.color.dark.green;
        case 'mint':
          return appleTokens.color.dark.mint;
        case 'teal':
          return appleTokens.color.dark.teal;
        case 'cyan':
          return appleTokens.color.dark.cyan;
        case 'blue':
          return appleTokens.color.dark.blue;
        case 'indigo':
          return appleTokens.color.dark.indigo;
        case 'purple':
          return appleTokens.color.dark.purple;
        case 'pink':
          return appleTokens.color.dark.pink;
        case 'brown':
          return appleTokens.color.dark.brown;
        default:
          return appleTokens.color.dark.primary;
      }
  }
}

function resolveBorderColor(scheme: ColorScheme = 'dark'): string {
  switch (scheme) {
    case 'light':
      return appleTokens.color.light.borderforeground;
    case 'dark':
    default:
      return appleTokens.color.dark.borderforeground;
  }
}

function resolveBlur(size: BlurSize = 'medium', progressive = false) {
  if (progressive) {
    switch (size) {
      case 'small':
        return appleTokens.blur.progressive.small;
      case 'medium':
        return appleTokens.blur.progressive.medium;
      case 'large':
        return appleTokens.blur.progressive.large;
      case 'extralarge':
        return appleTokens.blur.progressive.extralarge;
      default:
        return appleTokens.blur.progressive.medium;
    }
  }

  switch (size) {
    case 'small':
      return { backdropFilter: appleTokens.blur.normal.small };
    case 'medium':
      return { backdropFilter: appleTokens.blur.normal.medium };
    case 'large':
      return { backdropFilter: appleTokens.blur.normal.large };
    case 'extralarge':
      return { backdropFilter: appleTokens.blur.normal.extralarge };
    default:
      return { backdropFilter: appleTokens.blur.normal.medium };
  }
}

export function glass(options: GlassOptions = {}): GlassStyleOutput {
  const scheme = options.scheme ?? 'dark';
  const radius = resolveRadius(options.radius);
  const backgroundColor = resolveColor(options.tintColor, scheme);
  const borderColor = resolveBorderColor(scheme);
  const blurStyles = resolveBlur(options.blur, options.progressive);

  return {
    borderRadius: radius,
    backgroundColor,
    borderColor,
    backdropFilter: blurStyles.backdropFilter,
    WebkitBackdropFilter: blurStyles.backdropFilter,
    ...('maskImage' in blurStyles && {
      maskImage: blurStyles.maskImage,
      WebkitMaskImage: blurStyles.maskImage,
    }),
  };
}

// Exporta também como `ui` para bater direto com o import do seu AppLayoutHeader.vue
export const ui = {
  glass,
  tokens: appleTokens,
};
