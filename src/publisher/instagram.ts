/**
 * Instagram Publisher
 *
 * Publishes content using Meta Graph API.
 */

const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

export interface InstagramCredentials {
  accessToken: string;
  userId: string;
  pageId: string;
}

export interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

/**
 * Publish image to Instagram Feed
 */
export async function publishImage(
  credentials: InstagramCredentials,
  options: {
    imageUrl: string;
    caption: string;
    hashtags: string[];
  }
): Promise<PublishResult> {
  const { accessToken, userId } = credentials;
  const { imageUrl, caption, hashtags } = options;

  const fullCaption = `${caption}\n\n${hashtags.map(h => `#${h}`).join(' ')}`;

  try {
    // Step 1: Create media container
    console.log('Creating media container...');
    const containerRes = await fetch(`${GRAPH_API_URL}/${userId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: fullCaption,
        access_token: accessToken,
      }),
    });

    const containerData = await containerRes.json() as Record<string, unknown>;
    if (containerData.error) {
      const err = containerData.error as { message: string };
      return { success: false, error: err.message };
    }

    const containerId = containerData.id as string;
    console.log(`Container created: ${containerId}`);

    // Step 2: Wait for processing
    await waitForProcessing(containerId, accessToken);

    // Step 3: Publish
    console.log('Publishing...');
    const publishRes = await fetch(`${GRAPH_API_URL}/${userId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    });

    const publishData = await publishRes.json() as Record<string, unknown>;
    if (publishData.error) {
      const err = publishData.error as { message: string };
      return { success: false, error: err.message };
    }

    console.log(`Published: ${publishData.id}`);
    return { success: true, postId: publishData.id as string };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Publish video as Reel
 */
export async function publishVideo(
  credentials: InstagramCredentials,
  options: {
    videoUrl: string;
    caption: string;
    hashtags: string[];
  }
): Promise<PublishResult> {
  const { accessToken, userId } = credentials;
  const { videoUrl, caption, hashtags } = options;

  const fullCaption = `${caption}\n\n${hashtags.map(h => `#${h}`).join(' ')}`;

  try {
    // Step 1: Create Reel container
    console.log('Creating Reel container...');
    const containerRes = await fetch(`${GRAPH_API_URL}/${userId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: videoUrl,
        caption: fullCaption,
        share_to_feed: true,
        access_token: accessToken,
      }),
    });

    const containerData = await containerRes.json() as Record<string, unknown>;
    if (containerData.error) {
      const err = containerData.error as { message: string };
      return { success: false, error: err.message };
    }

    const containerId = containerData.id as string;
    console.log(`Container created: ${containerId}`);

    // Step 2: Wait for processing (videos take longer)
    await waitForProcessing(containerId, accessToken, 300000);

    // Step 3: Publish
    console.log('Publishing Reel...');
    const publishRes = await fetch(`${GRAPH_API_URL}/${userId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    });

    const publishData = await publishRes.json() as Record<string, unknown>;
    if (publishData.error) {
      const err = publishData.error as { message: string };
      return { success: false, error: err.message };
    }

    console.log(`Reel published: ${publishData.id}`);
    return { success: true, postId: publishData.id as string };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Wait for media processing
 */
async function waitForProcessing(
  containerId: string,
  accessToken: string,
  timeoutMs = 60000
): Promise<boolean> {
  const start = Date.now();
  const pollInterval = 5000;

  while (Date.now() - start < timeoutMs) {
    const res = await fetch(
      `${GRAPH_API_URL}/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const data = await res.json() as { status_code?: string };

    console.log(`Status: ${data.status_code}`);

    if (data.status_code === 'FINISHED') return true;
    if (data.status_code === 'ERROR') return false;

    await new Promise(r => setTimeout(r, pollInterval));
  }

  return false;
}

/**
 * Validate credentials
 */
export async function validateCredentials(
  credentials: InstagramCredentials
): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch(
      `${GRAPH_API_URL}/${credentials.userId}?fields=id,username&access_token=${credentials.accessToken}`
    );
    const data = await res.json() as Record<string, unknown>;

    if (data.error) {
      const err = data.error as { message: string };
      return { valid: false, error: err.message };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: String(error) };
  }
}
