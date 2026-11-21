export type TokenSize = 'small' | 'medium' | 'large' | 'extralarge';

export type RadiusTokens = Record<TokenSize, string>;

export interface ColorPalette {
  // Superfícies e textos semânticos
  primary: string;
  secondary: string;
  tertiary: string;
  foreground: string;
  foregroundSecondary: string;
  foregroundTertiary: string;

  // Bordas e separadores
  borderprimary: string;
  bordersecondary: string;
  borderforeground: string;

  // Escala neutra (System Grays)
  gray: string;
  gray2: string;
  gray3: string;
  gray4: string;
  gray5: string;
  gray6: string;

  // Cores de destaque (System Colors)
  red: string;
  orange: string;
  yellow: string;
  green: string;
  mint: string;
  teal: string;
  cyan: string;
  blue: string;
  indigo: string;
  purple: string;
  pink: string;
  brown: string;
}

export interface ColorTokens {
  dark: ColorPalette;
  light: ColorPalette;
}

export interface ProgressiveBlurStyle {
  backdropFilter: string;
  maskImage: string;
}

export interface BlurTokens {
  normal: Record<TokenSize, string>;
  progressive: Record<TokenSize, ProgressiveBlurStyle>;
}

export interface AppleTokens {
  radius: RadiusTokens;
  color: ColorTokens;
  blur: BlurTokens;
}

// Tipos utilitários para usar nas props dos seus componentes (ex: <GlassCard blur="medium" radius="large" />)
export type ColorScheme = keyof ColorTokens;         // 'dark' | 'light'
export type ColorName = keyof ColorPalette;          // 'primary' | 'blue' | 'gray2' | ...
export type RadiusSize = keyof RadiusTokens;         // 'small' | 'medium' | 'large' | 'extralarge'
export type BlurSize = keyof BlurTokens['normal'];   // 'small' | 'medium' | 'large' | 'extralarge'
