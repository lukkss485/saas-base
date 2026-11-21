import { globaltypes } from "./../types/tokentypes";

export const appleTokens : globaltypes = {
  radius: {
    small: '8px',        // Botões compactos, tags, inputs
    medium: '12px',      // Cards padrão, menus contextuais, alertas
    large: '20px',       // Sheets, modais, widgets médios
    extralarge: '28px',  // Containers principais, Liquid Glass panels, popovers grandes
  },

  color: {
    dark: {
      // Superfícies e textos semânticos (HIG Dark Mode)
      primary: '#000000',          // systemBackground (base)
      secondary: '#1C1C1E',        // secondarySystemBackground (elevated)
      tertiary: '#2C2C2E',         // tertiarySystemBackground
      foreground: '#FFFFFF',       // label (texto primário)
      foregroundSecondary: 'rgba(235, 235, 245, 0.60)', // secondaryLabel
      foregroundTertiary: 'rgba(235, 235, 245, 0.30)',  // tertiaryLabel

      // Bordas e separadores
      borderprimary: 'rgba(84, 84, 88, 0.65)',    // separator (translúcido)
      bordersecondary: '#38383A',                 // opaqueSeparator
      borderforeground: 'rgba(255, 255, 255, 0.18)', // reflexo de borda Liquid Glass

      // Escala neutra oficial (System Grays Dark)
      gray: '#8E8E93',
      gray2: '#636366',
      gray3: '#48484A',
      gray4: '#3A3A3C',
      gray5: '#2C2C2E',
      gray6: '#1C1C1E',

      // Todas as 12 cores de destaque da Apple (System Colors Dark)
      red: '#FF453A',
      orange: '#FF9F0A',
      yellow: '#FFD60A',
      green: '#30D158',
      mint: '#63E6E2',
      teal: '#40C8E0',
      cyan: '#64D2FF',
      blue: '#0A84FF',
      indigo: '#5E5CE6',
      purple: '#BF5AF2',
      pink: '#FF375F',
      brown: '#AC8E68',
    },

    light: {
      // Superfícies e textos semânticos (HIG Light Mode)
      primary: '#FFFFFF',          // systemBackground
      secondary: '#F2F2F7',        // secondarySystemBackground
      tertiary: '#FFFFFF',         // tertiarySystemBackground
      foreground: '#000000',       // label (texto primário)
      foregroundSecondary: 'rgba(60, 60, 67, 0.60)', // secondaryLabel
      foregroundTertiary: 'rgba(60, 60, 67, 0.30)',  // tertiaryLabel

      // Bordas e separadores
      borderprimary: 'rgba(60, 60, 67, 0.29)',    // separator (translúcido)
      bordersecondary: '#C6C6C8',                 // opaqueSeparator
      borderforeground: 'rgba(255, 255, 255, 0.55)', // reflexo de borda Liquid Glass

      // Escala neutra oficial (System Grays Light)
      gray: '#8E8E93',
      gray2: '#AEAEB2',
      gray3: '#C7C7CC',
      gray4: '#D1D1D6',
      gray5: '#E5E5EA',
      gray6: '#F2F2F7',

      // Todas as 12 cores de destaque da Apple (System Colors Light)
      red: '#FF3B30',
      orange: '#FF9500',
      yellow: '#FFCC00',
      green: '#34C759',
      mint: '#00C7BE',
      teal: '#30B0C7',
      cyan: '#32ADE6',
      blue: '#007AFF',
      indigo: '#5856D6',
      purple: '#AF52DE',
      pink: '#FF2D55',
      brown: '#A2845E',
    },
  },

  blur: {
    // Materiais padrão (UltraThin, Thin, Regular, Thick)
    normal: {
      small: 'blur(10px) saturate(180%)',      // UltraThin Material
      medium: 'blur(20px) saturate(180%)',     // Thin Material
      large: 'blur(30px) saturate(190%)',      // Regular Material
      extralarge: 'blur(45px) saturate(200%)', // Thick / Chrome Material
    },

    // Blur progressivo (combina desfoque + máscara de gradiente para barras de navegação/scroll)
    progressive: {
      small: {
        backdropFilter: 'blur(12px) saturate(180%)',
        maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
      },
      medium: {
        backdropFilter: 'blur(24px) saturate(180%)',
        maskImage: 'linear-gradient(to bottom, black 25%, transparent 100%)',
      },
      large: {
        backdropFilter: 'blur(36px) saturate(190%)',
        maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
      },
      extralarge: {
        backdropFilter: 'blur(50px) saturate(200%)',
        maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
      },
    },
  },
} as const;
