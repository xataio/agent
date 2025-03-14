import colors from 'tailwindcss/colors';
import { parseColor } from './utils/parse-color';

export const MIDNIGHT_PLUM = '#0D091D';

// palette generated from https://gka.github.io/palettes/
// input colors: #f5f3ff, #8566ff, #504297
// correct lightness off, bezier interpolation off
export const purplePalette = {
  '50': '#f5f3ff',
  '100': '#dcd4ff',
  '200': '#c3b4ff',
  '300': '#aa95ff',
  '400': '#9176ff',
  '500': '#7f62f3',
  '600': '#735adc',
  '700': '#6852c5',
  '800': '#5c4aae',
  '900': '#504297'
};

export const purplePaletteOklch = {
  '50': parseColor(purplePalette['50']),
  '100': parseColor(purplePalette['100']),
  '200': parseColor(purplePalette['200']),
  '300': parseColor(purplePalette['300']),
  '400': parseColor(purplePalette['400']),
  '500': parseColor(purplePalette['500']),
  '600': parseColor(purplePalette['600']),
  '700': parseColor(purplePalette['700']),
  '800': parseColor(purplePalette['800']),
  '900': parseColor(purplePalette['900'])
};

export const grayPalette = {
  '50': colors.zinc[50],
  '100': colors.zinc[100],
  '200': colors.zinc[200],
  '300': colors.zinc[300],
  '400': colors.zinc[400],
  '500': colors.zinc[500],
  '600': colors.zinc[600],
  '700': colors.zinc[700],
  '800': '#262237',
  '900': '#110F1D',
  '950': '#0C0A15'
};

export const grayPaletteOklch = {
  '50': parseColor(grayPalette['50']),
  '100': parseColor(grayPalette['100']),
  '200': parseColor(grayPalette['200']),
  '300': parseColor(grayPalette['300']),
  '400': parseColor(grayPalette['400']),
  '500': parseColor(grayPalette['500']),
  '600': parseColor(grayPalette['600']),
  '700': parseColor(grayPalette['700']),
  '800': parseColor(grayPalette['800']),
  '900': parseColor(grayPalette['900']),
  '950': parseColor(grayPalette['950'])
};

export const colorTokensHex = {
  root: {
    background: '#FAFAFA',
    foreground: grayPalette[900],
    'contrast-high': colors.black,
    card: colors.white,
    'card-foreground': grayPalette[900],
    popover: colors.white,
    'popover-foreground': grayPalette[900],
    link: purplePalette[700],
    primary: purplePalette[600],
    'card-primary': colors.violet[50],
    'card-primary-hover': colors.violet[100],
    'primary-foreground': colors.white,
    secondary: grayPalette[200],
    'secondary-foreground': grayPalette[800],
    muted: grayPalette[100],
    'muted-foreground': grayPalette[600],
    accent: grayPalette[200],
    'accent-foreground': grayPalette[800],
    destructive: colors.red[500],
    'destructive-foreground': colors.white,
    danger: colors.red[500],
    success: colors.green[500],
    warning: colors.yellow[500],
    border: grayPalette[200],
    input: grayPalette[300],
    ring: purplePalette[500],
    subtle: grayPalette[500],
    'chart-1': colors.orange[400],
    'chart-2': colors.teal[600],
    'chart-3': colors.blue[800],
    'chart-4': colors.yellow[400],
    'chart-5': colors.red[300],
    'sidebar-background': '#FAFAFA',
    'sidebar-foreground': grayPalette[800],
    'sidebar-primary': grayPalette[900],
    'sidebar-primary-foreground': colors.white,
    'sidebar-accent': grayPalette[200],
    'sidebar-accent-foreground': grayPalette[900],
    'sidebar-border': grayPalette[300],
    'sidebar-ring': colors.purple[200],
    'deleted-line': 'oklch(66.51% 0.2046 26.96 / 40.55%)',
    'added-line': 'oklch(62.22% 0.1661 146.22 / 40.13%)'
  },
  dark: {
    background: grayPalette[950],
    foreground: colors.white,
    'contrast-high': colors.white,
    card: grayPalette[900],
    'card-primary': '#262046',
    'card-primary-hover': '#3a3166',
    'card-foreground': colors.white,
    popover: grayPalette[900],
    'popover-foreground': colors.white,
    link: purplePalette[200],
    primary: purplePalette[600],
    'primary-foreground': colors.white,
    secondary: grayPalette[800],
    'secondary-foreground': colors.white,
    muted: grayPalette[800],
    'muted-foreground': grayPalette[400],
    accent: grayPalette[800],
    'accent-foreground': colors.white,
    destructive: colors.red[600],
    'destructive-foreground': colors.white,
    danger: colors.red[400],
    success: colors.green[400],
    warning: colors.yellow[400],
    border: '#272435',
    input: grayPalette[800],
    ring: purplePalette[300],
    subtle: grayPalette[400],
    'chart-1': grayPalette[600],
    'chart-2': colors.teal[500],
    'chart-3': colors.yellow[500],
    'chart-4': colors.purple[600],
    'chart-5': colors.red[500],
    'sidebar-background': grayPalette[950],
    'sidebar-foreground': grayPalette[100],
    'sidebar-primary': grayPalette[700],
    'sidebar-primary-foreground': colors.white,
    'sidebar-accent': grayPalette[800],
    'sidebar-accent-foreground': grayPalette[100],
    'sidebar-border': '#272435',
    'sidebar-ring': colors.purple[200],
    'deleted-line': 'oklch(66.51% 0.2046 26.96 / 10%)',
    'added-line': 'oklch(62.22% 0.1661 146.22 / 14.9%)'
  }
};

export const colorTokensOklch = {
  // run the colorTokensHex and trasform all values to HSL
  root: Object.fromEntries(Object.entries(colorTokensHex.root).map(([key, value]) => [key, parseColor(value)])),
  dark: Object.fromEntries(Object.entries(colorTokensHex.dark).map(([key, value]) => [key, parseColor(value)]))
};

export type ColorToken = {
  name: string; // The name of the background color
  description: string; // Description of the background color
  colors: {
    light: string; // Hex color for light theme
    dark: string; // Hex color for dark theme
  };
};

export const backgroundColors: ColorToken[] = [
  {
    name: 'bg-background',
    description: 'Root background color.',
    colors: {
      light: colorTokensHex.root.background,
      dark: colorTokensHex.dark.background
    }
  },
  {
    name: 'bg-card',
    description: 'Background color for cards.',
    colors: {
      light: colorTokensHex.root.card,
      dark: colorTokensHex.dark.card
    }
  },
  {
    name: 'bg-popover',
    description: 'Background color for popovers or dropdowns.',
    colors: {
      light: colorTokensHex.root.popover,
      dark: colorTokensHex.dark.popover
    }
  },
  {
    name: 'bg-primary',
    description: 'Background color for primary elements.',
    colors: {
      light: colorTokensHex.root.primary,
      dark: colorTokensHex.dark.primary
    }
  },
  {
    name: 'bg-secondary',
    description: 'Background color for secondary elements.',
    colors: {
      light: colorTokensHex.root.secondary,
      dark: colorTokensHex.dark.secondary
    }
  },
  {
    name: 'bg-muted',
    description: 'Background color for muted elements.',
    colors: {
      light: colorTokensHex.root.muted,
      dark: colorTokensHex.dark.muted
    }
  },
  {
    name: 'bg-accent',
    description: 'Background color for accent elements.',
    colors: {
      light: colorTokensHex.root.accent,
      dark: colorTokensHex.dark.accent
    }
  },
  {
    name: 'bg-destructive',
    description: 'Background color for destructive elements.',
    colors: {
      light: colorTokensHex.root.destructive,
      dark: colorTokensHex.dark.destructive
    }
  },

  {
    name: 'bg-sidebar',
    description: 'Background color for sidebar.',
    colors: {
      light: colorTokensHex.root['sidebar-background'],
      dark: colorTokensHex.dark['sidebar-background']
    }
  }
];

export const textColors: ColorToken[] = [
  {
    name: 'text-foreground',
    description: 'Default text color for primary content.',
    colors: {
      light: colorTokensHex.root.foreground,
      dark: colorTokensHex.dark.foreground
    }
  },
  {
    name: 'text-card-foreground',
    description: 'Text color for content within cards.',
    colors: {
      light: colorTokensHex.root['card-foreground'],
      dark: colorTokensHex.dark['card-foreground']
    }
  },
  {
    name: 'text-popover-foreground',
    description: 'Text color for content within popovers or dropdowns.',
    colors: {
      light: colorTokensHex.root['popover-foreground'],
      dark: colorTokensHex.dark['popover-foreground']
    }
  },
  {
    name: 'text-primary-foreground',
    description: 'Text color for elements using the primary color background.',
    colors: {
      light: colorTokensHex.root['primary-foreground'],
      dark: colorTokensHex.dark['primary-foreground']
    }
  },
  {
    name: 'text-secondary-foreground',
    description: 'Text color for elements using the secondary color background.',
    colors: {
      light: colorTokensHex.root['secondary-foreground'],
      dark: colorTokensHex.dark['secondary-foreground']
    }
  },
  {
    name: 'text-muted-foreground',
    description: 'Text color for muted background elements.',
    colors: {
      light: colorTokensHex.root['muted-foreground'],
      dark: colorTokensHex.dark['muted-foreground']
    }
  },
  {
    name: 'text-accent-foreground',
    description: 'Text color for elements using the accent background color.',
    colors: {
      light: colorTokensHex.root['accent-foreground'],
      dark: colorTokensHex.dark['accent-foreground']
    }
  },
  {
    name: 'text-destructive-foreground',
    description: 'Text color for elements using the destructive background color.',
    colors: {
      light: colorTokensHex.root['destructive-foreground'],
      dark: colorTokensHex.dark['destructive-foreground']
    }
  },
  {
    name: 'text-subtle',
    description: 'Text color for subtle elements.',
    colors: {
      light: colorTokensHex.root['subtle'],
      dark: colorTokensHex.dark['subtle']
    }
  },
  {
    name: 'text-link',
    description: 'Text color for links.',
    colors: {
      light: colorTokensHex.root['link'],
      dark: colorTokensHex.dark['link']
    }
  },
  {
    name: 'text-success',
    description: 'Text color for success messages or positive indicators.',
    colors: {
      light: colorTokensHex.root['success'],
      dark: colorTokensHex.dark['success']
    }
  },
  {
    name: 'text-danger',
    description: 'Text color for danger or error messages.',
    colors: {
      light: colorTokensHex.root['danger'],
      dark: colorTokensHex.dark['danger']
    }
  },
  {
    name: 'text-warning',
    description: 'Text color for warning or caution messages.',
    colors: {
      light: colorTokensHex.root['warning'],
      dark: colorTokensHex.dark['warning']
    }
  }
];

export const chartColors: ColorToken[] = [
  {
    name: 'bg-chart-1',
    description: 'Primary color for data visualization or chart elements.',
    colors: {
      light: colorTokensHex.root['chart-1'],
      dark: colorTokensHex.dark['chart-1']
    }
  },
  {
    name: 'bg-chart-2',
    description: 'Secondary color for data visualization or chart elements.',
    colors: {
      light: colorTokensHex.root['chart-2'],
      dark: colorTokensHex.dark['chart-2']
    }
  },
  {
    name: 'bg-chart-3',
    description: 'Tertiary color for data visualization or chart elements.',
    colors: {
      light: colorTokensHex.root['chart-3'],
      dark: colorTokensHex.dark['chart-3']
    }
  },
  {
    name: 'bg-chart-4',
    description: 'Fourth color for data visualization or chart elements.',
    colors: {
      light: colorTokensHex.root['chart-4'],
      dark: colorTokensHex.dark['chart-4']
    }
  },
  {
    name: 'bg-chart-5',
    description: 'Fifth color for data visualization or chart elements.',
    colors: {
      light: colorTokensHex.root['chart-5'],
      dark: colorTokensHex.dark['chart-5']
    }
  }
];

export const borderColors: ColorToken[] = [
  {
    name: 'border-input',
    description: 'Default text color for primary content.',
    colors: {
      light: colorTokensHex.root.input,
      dark: colorTokensHex.dark.input
    }
  }
];

export const ringColors: ColorToken[] = [
  {
    name: 'ring-ring',
    description: 'Default text color for primary content.',
    colors: {
      light: colorTokensHex.root.ring,
      dark: colorTokensHex.dark.ring
    }
  }
];
