import React from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

export type IconName = 'glass' | 'list' | 'chart' | 'sliders' | 'plus' | 'chevronLeft' | 'close' | 'check';

export type IconProps = {
  name: IconName;
  size?: number;
  color: ColorValue;
  strokeWidth?: number;
};

/**
 * Minimal line icons drawn with SVG.
 *
 * Hand-rolled instead of pulling in an icon font: the app needs eight glyphs,
 * and this keeps the bundle (and the offline-first promise) simple.
 */
export function Icon({ name, size = 24, color, strokeWidth = 1.8 }: IconProps) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'glass' ? (
        <>
          <Path d="M7 4h10l-1.6 8.2A3.6 3.6 0 0 1 11.8 15h0a3.6 3.6 0 0 1-3.5-2.8L7 4Z" {...common} />
          <Line x1="12" y1="15" x2="12" y2="20" {...common} />
          <Line x1="8.5" y1="20" x2="15.5" y2="20" {...common} />
        </>
      ) : null}

      {name === 'list' ? (
        <>
          <Circle cx="5" cy="7" r="1.3" fill={color} stroke="none" />
          <Circle cx="5" cy="12" r="1.3" fill={color} stroke="none" />
          <Circle cx="5" cy="17" r="1.3" fill={color} stroke="none" />
          <Line x1="9.5" y1="7" x2="19" y2="7" {...common} />
          <Line x1="9.5" y1="12" x2="19" y2="12" {...common} />
          <Line x1="9.5" y1="17" x2="19" y2="17" {...common} />
        </>
      ) : null}

      {name === 'chart' ? (
        <>
          <Rect x="4" y="12" width="4" height="8" rx="1.4" {...common} />
          <Rect x="10" y="7" width="4" height="13" rx="1.4" {...common} />
          <Rect x="16" y="14" width="4" height="6" rx="1.4" {...common} />
        </>
      ) : null}

      {name === 'sliders' ? (
        <>
          <Line x1="4" y1="8" x2="20" y2="8" {...common} />
          <Line x1="4" y1="16" x2="20" y2="16" {...common} />
          <Circle cx="9" cy="8" r="2.4" {...common} />
          <Circle cx="15" cy="16" r="2.4" {...common} />
        </>
      ) : null}

      {name === 'plus' ? (
        <>
          <Line x1="12" y1="5" x2="12" y2="19" {...common} />
          <Line x1="5" y1="12" x2="19" y2="12" {...common} />
        </>
      ) : null}

      {name === 'chevronLeft' ? <Path d="M14.5 5.5 8 12l6.5 6.5" {...common} /> : null}

      {name === 'close' ? (
        <>
          <Line x1="6" y1="6" x2="18" y2="18" {...common} />
          <Line x1="18" y1="6" x2="6" y2="18" {...common} />
        </>
      ) : null}

      {name === 'check' ? <Path d="m5 12.5 4.5 4.5L19 7" {...common} /> : null}
    </Svg>
  );
}
