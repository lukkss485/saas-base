// ui_kit/glass/index.d.ts
import type { GlassOptions, GlassStyleOutput } from './types/glasstypes';
import type { globaltypes as GlobalTokensType } from './types/tokentypes';

export * from './types';

export declare const globaltypes: GlobalTokensType;

export declare function glass(options?: GlassOptions): GlassStyleOutput;

export declare const ui: {
  glass: typeof glass;
  tokens: GlobalTokensType;
};
