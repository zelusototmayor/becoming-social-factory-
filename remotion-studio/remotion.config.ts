import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// Enable loading local files via file:// protocol
Config.setChromiumDisableWebSecurity(true);
