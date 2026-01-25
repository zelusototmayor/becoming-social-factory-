import { Composition } from 'remotion';
import { ViralQuote, viralQuoteSchema } from './compositions/viral-quote/ViralQuote';

// Video settings
const FPS = 30;
const DURATION_SECONDS = 12;
const DURATION_FRAMES = FPS * DURATION_SECONDS;

// Vertical video for social media (9:16)
const WIDTH = 1080;
const HEIGHT = 1920;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ViralQuote"
        component={ViralQuote}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        schema={viralQuoteSchema}
        defaultProps={{
          quote: 'The only way to do great work is to love what you do.',
          hookText: 'Here\'s the truth.',
          quoteType: 'manifesto' as const,
          videoPath: '',
          voicePath: '',
          musicPath: '',
          musicVolume: 0.25,
        }}
      />
    </>
  );
};
