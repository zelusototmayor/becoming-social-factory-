import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import React from 'react';

export type CtaType = 'save' | 'share';

interface CtaOutroProps {
  ctaType: CtaType;
}

const CTA_CONTENT: Record<CtaType, { text: string; subtext: string; icon: string }> = {
  save: {
    text: 'Save this',
    subtext: 'for when you need it',
    icon: '🔖',
  },
  share: {
    text: 'Send this',
    subtext: 'to someone who needs it',
    icon: '💌',
  },
};

export const CtaOutro: React.FC<CtaOutroProps> = ({ ctaType }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const content = CTA_CONTENT[ctaType];

  // Fade in at the start of the sequence
  const fadeIn = interpolate(
    frame,
    [0, 20],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }
  );

  // Fade out near the very end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.in(Easing.cubic),
    }
  );

  // Scale animation for icon
  const iconScale = interpolate(
    frame,
    [0, 15, 25],
    [0.5, 1.1, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.back(1.5)),
    }
  );

  // Text slide up animation
  const textSlide = interpolate(
    frame,
    [5, 25],
    [30, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }
  );

  // Subtext delayed fade
  const subtextOpacity = interpolate(
    frame,
    [15, 35],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }
  );

  // Subtle pulse on the icon
  const pulseFrame = frame % 60;
  const pulse = interpolate(
    pulseFrame,
    [0, 30, 60],
    [1, 1.05, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeIn * fadeOut,
        padding: '60px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 16,
        }}
      >
        {/* Icon */}
        <div
          style={{
            fontSize: 56,
            transform: `scale(${iconScale * pulse})`,
            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5))',
          }}
        >
          {content.icon}
        </div>

        {/* Main text */}
        <div
          style={{
            fontFamily: '"SF Pro Display", "Helvetica Neue", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: 42,
            fontWeight: 600,
            color: '#FFFFFF',
            textShadow: `
              0 2px 8px rgba(0, 0, 0, 0.95),
              0 4px 16px rgba(0, 0, 0, 0.8),
              0 0 60px rgba(0, 0, 0, 0.6)
            `,
            transform: `translateY(${textSlide}px)`,
            opacity: fadeIn,
            letterSpacing: '-0.01em',
          }}
        >
          {content.text}
        </div>

        {/* Subtext */}
        <div
          style={{
            fontFamily: '"SF Pro Display", "Helvetica Neue", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: 28,
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.85)',
            textShadow: `
              0 2px 6px rgba(0, 0, 0, 0.9),
              0 3px 12px rgba(0, 0, 0, 0.7)
            `,
            opacity: subtextOpacity,
            fontStyle: 'italic',
          }}
        >
          {content.subtext}
        </div>
      </div>
    </AbsoluteFill>
  );
};
