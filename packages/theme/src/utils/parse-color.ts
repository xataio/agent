import chroma from 'chroma-js';

export const hexToOklch = (hexColor: string): string => {
  try {
    const [l, c, h] = chroma(hexColor).oklch();

    // If chroma is very low, set hue to 0 (or a default value)
    const adjustedH = c < 0.001 || isNaN(h) ? 0 : h;

    // Format lightness as a percentage
    const formattedL = l.toFixed(3); // Lightness as percentage
    const formattedC = c.toFixed(3); // Chroma
    const formattedH = adjustedH.toFixed(3); // Hue

    return `oklch(${formattedL} ${formattedC} ${formattedH})`;
  } catch (error) {
    console.error('Error converting hex to oklch:', (error as Error).message);
    throw new Error(`Invalid hex color: ${hexColor}`);
  }
};

export function parseColor(value: string) {
  if (value.includes('oklch')) {
    return value;
  } else {
    return hexToOklch(value);
  }
}
