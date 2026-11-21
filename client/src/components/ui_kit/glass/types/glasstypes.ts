import type { BlurSize, ColorName, ColorScheme, RadiusSize } from './index';

export interface GlassOptions {
  radius?: RadiusSize;
  blur?: BlurSize;
  progressive?: boolean;
  tintColor?: ColorName;
  scheme?: ColorScheme;
}

export interface GlassStyleOutput {
  borderRadius: string;
  backgroundColor: string;
  borderColor: string;
  backdropFilter: string;
  WebkitBackdropFilter: string;
  maskImage?: string;
  WebkitMaskImage?: string;
}
