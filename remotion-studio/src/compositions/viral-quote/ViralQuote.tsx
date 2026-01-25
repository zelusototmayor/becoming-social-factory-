import {
  AbsoluteFill,
  Audio,
  Sequence,
  Video,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { z } from 'zod';
import { HookOverlay } from './HookOverlay';
import { QuoteReveal } from './QuoteReveal';

// Schema for props validation
export const viralQuoteSchema = z.object({
  quote: z.string(),
  hookText: z.string(),
  quoteType: z.enum(['inquiry', 'manifesto', 'insight']),
  videoPath: z.string(),
  voicePath: z.string(),
  musicPath: z.string().optional(),
  musicVolume: z.number().min(0).max(1).default(0.25),
});

export type ViralQuoteProps = z.infer<typeof viralQuoteSchema>;

// Timeline constants (at 30fps)
const HOOK_START = 0;
const HOOK_DURATION = 75; // 2.5 seconds
const QUOTE_START = 60; // Start quote slightly before hook ends
const QUOTE_DURATION = 255; // ~8.5 seconds

// Convert file path to staticFile URL for Remotion
// Paths are relative to the public folder (e.g., "render-assets/video.mp4")
const toSrc = (filePath: string): string => {
  if (!filePath) return '';
  // Already a URL - use directly
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  // Relative path - use staticFile to resolve from public folder
  return staticFile(filePath);
};

export const ViralQuote: React.FC<ViralQuoteProps> = ({
  quote,
  hookText,
  quoteType,
  videoPath,
  voicePath,
  musicPath,
  musicVolume = 0.25,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Convert paths to proper URLs
  const videoSrc = toSrc(videoPath);
  const voiceSrc = toSrc(voicePath);
  const musicSrc = toSrc(musicPath || '');

  // Background overlay opacity (darken video for text readability)
  const overlayOpacity = interpolate(frame, [0, 30], [0.25, 0.4], {
    extrapolateRight: 'clamp',
  });

  // Final fade out
  const finalFade = interpolate(
    frame,
    [durationInFrames - 30, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Background Video */}
      {videoSrc && (
        <Video
          src={videoSrc}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: finalFade,
          }}
        />
      )}

      {/* Dark overlay for text readability */}
      <AbsoluteFill
        style={{
          backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
          opacity: finalFade,
        }}
      />

      {/* Voice narration */}
      {voiceSrc && (
        <Audio
          src={voiceSrc}
          volume={1}
        />
      )}

      {/* Background music */}
      {musicSrc && (
        <Audio
          src={musicSrc}
          volume={(f) =>
            interpolate(
              f,
              [0, fps, durationInFrames - fps, durationInFrames],
              [0, musicVolume, musicVolume, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )
          }
        />
      )}

      {/* Hook text (0-2.5s) */}
      <Sequence from={HOOK_START} durationInFrames={HOOK_DURATION}>
        <HookOverlay text={hookText} quoteType={quoteType} />
      </Sequence>

      {/* Quote text (2-10s) */}
      <Sequence from={QUOTE_START} durationInFrames={QUOTE_DURATION}>
        <QuoteReveal text={quote} quoteType={quoteType} />
      </Sequence>
    </AbsoluteFill>
  );
};
