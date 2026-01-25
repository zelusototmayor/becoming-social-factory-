import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import React from 'react';

interface HookOverlayProps {
  text: string;
  quoteType: 'inquiry' | 'manifesto' | 'insight';
}

// Split text into lines
function splitIntoLines(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

export const HookOverlay: React.FC<HookOverlayProps> = ({ text, quoteType }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Split hook into lines (shorter lines for hooks - max 20 chars)
  const lines = splitIntoLines(text, 20);

  // Fade out near the end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }
  );

  // Scale pulse on entry
  const entryScale = interpolate(
    frame,
    [0, 15],
    [0.9, 1],
    {
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.back(1.5)),
    }
  );

  // Get style based on quote type
  const getFontSize = (): number => {
    if (lines.length > 2) return 48;
    return 54;
  };

  const fontSize = getFontSize();
  const lineDelay = 8; // frames between lines

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeOut,
        transform: `scale(${entryScale})`,
        padding: '80px 60px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 8,
        }}
      >
        {lines.map((line, lineIndex) => {
          const lineStart = lineIndex * lineDelay;
          const lineProgress = interpolate(
            frame,
            [lineStart, lineStart + 15],
            [0, 1],
            {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.out(Easing.back(1.5)),
            }
          );

          const lineOpacity = lineProgress;
          const lineScale = interpolate(lineProgress, [0, 1], [0.8, 1]);
          const lineTranslateY = interpolate(lineProgress, [0, 1], [15, 0]);

          return (
            <div
              key={lineIndex}
              style={{
                fontFamily: '"SF Pro Display", "Helvetica Neue", -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize,
                fontWeight: 600,
                color: '#FFFFFF',
                textShadow: `
                  0 2px 8px rgba(0, 0, 0, 0.95),
                  0 4px 16px rgba(0, 0, 0, 0.8),
                  0 0 60px rgba(0, 0, 0, 0.6)
                `,
                opacity: lineOpacity,
                transform: `scale(${lineScale}) translateY(${lineTranslateY}px)`,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
