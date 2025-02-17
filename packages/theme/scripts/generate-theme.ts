import * as fs from 'fs';
import * as path from 'path';
import { colorTokensOklch, grayPaletteOklch, purplePaletteOklch } from '../src/color-tokens';

let css = `
@import "tailwindcss";

@plugin 'tailwindcss-animate';
@plugin '@tailwindcss/typography';

@custom-variant dark (&:is(.dark *));

@theme {
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);

  --color-background: var(--background);
  --color-foreground: var(--foreground);

  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-card-primary: var(--card-primary);
  --color-card-primary-hover: var(--card-primary-hover);

  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);

  --color-link: var(--link);
  --color-link-foreground: var(--link-foreground);

  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);

  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);

  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);

  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);

  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);

  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-subtle: var(--subtle);
  --color-contrast-high: var(--contrast-high);

  --color-danger: var(--danger);
  --color-warning: var(--warning);
  --color-success: var(--success);

  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);

  --color-sidebar: var(--sidebar-background);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --animate-accordion-down: accordion-down 0.2s ease-out;
  --animate-accordion-up: accordion-up 0.2s ease-out;
  --animate-marquee-vertical: marquee-vertical var(--duration) linear infinite;
  --animate-border-beam: border-beam calc(var(--duration) * 1s) infinite linear;
  --animate-spotlight: spotlight 2s ease 0.75s 1 forwards;
  --animate-skew-scroll: skew-scroll 20s linear infinite;

  --font-code: var(--font-geist-mono);
  --font-regular: var(--font-geist-sans);
  --font-heading: var(--font-heading);
`;

// create a space between the CSS variables
css += `
`;

// create the CSS variables for the purple palette
Object.entries(purplePaletteOklch).forEach(([key, value]) => {
  css += `  --color-purple-${key}: ${value};\n`;
});

// create a space between the CSS variables
css += `
`;

// create the CSS variables for the gray palette
Object.entries(grayPaletteOklch).forEach(([key, value]) => {
  css += `  --color-gray-${key}: ${value};\n`;
});

css += `
  @keyframes accordion-down {
    from {
      height: 0;
    }
    to {
      height: var(--radix-accordion-content-height);
    }
  }
  @keyframes accordion-up {
    from {
      height: var(--radix-accordion-content-height);
    }
    to {
      height: 0;
    }
  }

  @keyframes marquee {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(calc(-100% - var(--gap)));
    }
  }

  @keyframes marquee-vertical {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(calc(-100% - var(--gap)));
    }
  }

  @keyframes border-beam {
    100% {
      offset-distance: 100%;
    }
  }

  @keyframes spotlight {
    0% {
      opacity: 0;
      transform: translate(-72%, -62%) scale(0.5);
    }
    100% {
      opacity: 1;
      transform: translate(-50%, -40%) scale(1);
    }
  }

  @keyframes skew-scroll {
    0% {
      transform: rotateX(20deg) rotateZ(-20deg) skewX(20deg) translateZ(0) translateY(0);
    }
    100% {
      transform: rotateX(20deg) rotateZ(-20deg) skewX(20deg) translateZ(0) translateY(-100%);
    }
  }
}

/* Compatibility with Tailwind CSS v3 */
@layer base {
  *,
  ::after,
  ::before,
  ::backdrop,
  ::file-selector-button {
    border-color: var(--color-gray-200, currentColor);
  }
}

@layer base {
  :root {
    --radius: 0.5rem;
`;

Object.entries(colorTokensOklch.root).forEach(([key, value]) => {
  css += `    --${key}: ${value};\n`;
});

css += `  }\n\n  .dark {\n`;

Object.entries(colorTokensOklch.dark).forEach(([key, value]) => {
  css += `    --${key}: ${value};\n`;
});

css += `  }\n}\n\n@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }

  .text-trail {
    color: currentColor;
    -webkit-text-fill-color: transparent;
    text-fill-color: transparent;
    -webkit-text-stroke: 1px currentColor;
    text-stroke: 1px currentColor;
  }
}`;

// Specify the output path for the CSS file
const outputPath = path.join(__dirname, '..', 'src', 'theme.css');

// Ensure the dist directory exists
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

// Write the CSS to the specified file
fs.writeFileSync(outputPath, css);
console.log('CSS file generated:', outputPath);
