import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import React from 'react';

interface QuoteRevealProps {
  text: string;
  quoteType?: 'inquiry' | 'manifesto' | 'insight';
}

// Split text into lines of roughly equal length
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

export const QuoteReveal: React.FC<QuoteRevealProps> = ({ text, quoteType = 'insight' }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Split text into lines (max ~25 chars per line for mobile readability)
  const lines = splitIntoLines(text, 25);

  // Calculate font size based on number of lines
  const getFontSize = (): number => {
    if (lines.length > 4) return 36;
    if (lines.length > 3) return 40;
    if (lines.length > 2) return 44;
    return 48;
  };

  const fontSize = getFontSize();
  const lineDelay = 15; // frames between each line appearing

  // Container fade in
  const containerOpacity = interpolate(
    frame,
    [0, 20],
    [0, 1],
    {
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }
  );

  // Fade out near the end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 45, durationInFrames - 15],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.in(Easing.cubic),
    }
  );

  // Font styles based on quote type
  const getFontStyle = () => {
    switch (quoteType) {
      case 'inquiry':
        return {
          fontFamily: '"SF Pro Display", "Helvetica Neue", -apple-system, BlinkMacSystemFont, sans-serif',
          fontWeight: 500 as const,
          fontStyle: 'normal' as const,
          letterSpacing: '-0.02em',
        };
      case 'manifesto':
        return {
          fontFamily: '"SF Pro Display", "Helvetica Neue", -apple-system, BlinkMacSystemFont, sans-serif',
          fontWeight: 700 as const,
          fontStyle: 'normal' as const,
          letterSpacing: '-0.01em',
        };
      case 'insight':
      default:
        return {
          fontFamily: '"SF Pro Display", "Helvetica Neue", -apple-system, BlinkMacSystemFont, sans-serif',
          fontWeight: 400 as const,
          fontStyle: 'italic' as const,
          letterSpacing: '0',
        };
    }
  };

  const fontStyle = getFontStyle();

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: '100px 60px',
        opacity: containerOpacity * fadeOut,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 12,
        }}
      >
        {lines.map((line, lineIndex) => {
          const lineStart = 10 + lineIndex * lineDelay;
          const lineProgress = interpolate(
            frame,
            [lineStart, lineStart + 20],
            [0, 1],
            {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.out(Easing.cubic),
            }
          );

          const lineOpacity = lineProgress;
          const lineTranslateY = interpolate(lineProgress, [0, 1], [20, 0]);

          return (
            <div
              key={lineIndex}
              style={{
                ...fontStyle,
                fontSize,
                color: '#FFFFFF',
                textShadow: `
                  0 2px 8px rgba(0, 0, 0, 0.95),
                  0 4px 16px rgba(0, 0, 0, 0.8),
                  0 0 60px rgba(0, 0, 0, 0.6)
                `,
                opacity: lineOpacity,
                transform: `translateY(${lineTranslateY}px)`,
                lineHeight: 1.3,
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
