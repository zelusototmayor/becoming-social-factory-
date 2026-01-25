/**
 * Render Lock
 *
 * Prevents concurrent video renders to avoid OOM issues.
 * Uses a simple promise-based semaphore.
 */

let currentRender: Promise<void> | null = null;
let waitingCount = 0;

/**
 * Acquire render lock - waits if another render is in progress
 */
export async function acquireRenderLock(timeout = 600000): Promise<() => void> {
  waitingCount++;
  console.log(`🔒 Render lock requested (${waitingCount} waiting)`);

  const startTime = Date.now();

  // Wait for current render to finish
  while (currentRender) {
    if (Date.now() - startTime > timeout) {
      waitingCount--;
      throw new Error('Render lock timeout - another render is taking too long');
    }
    await currentRender.catch(() => {}); // Ignore errors from previous render
  }

  waitingCount--;
  console.log(`🔓 Render lock acquired`);

  // Create a new promise that will be resolved when this render completes
  let resolveRender: () => void;
  currentRender = new Promise<void>((resolve) => {
    resolveRender = resolve;
  });

  // Return release function
  return () => {
    console.log(`🔓 Render lock released`);
    currentRender = null;
    resolveRender();
  };
}

/**
 * Check if a render is currently in progress
 */
export function isRenderInProgress(): boolean {
  return currentRender !== null;
}

/**
 * Get number of renders waiting for lock
 */
export function getWaitingCount(): number {
  return waitingCount;
}

/**
 * Sanitize error messages from video rendering
 * Converts verbose FFmpeg/system errors into user-friendly messages
 */
export function sanitizeRenderError(error: unknown): string {
  const errorStr = String(error);

  // Check for common error patterns
  if (errorStr.includes('Killed') || errorStr.includes('killed')) {
    return 'Render failed: Server ran out of memory. Please try again later.';
  }

  if (errorStr.includes('SIGTERM') || errorStr.includes('SIGKILL')) {
    return 'Render failed: Process was terminated due to resource limits.';
  }

  if (errorStr.includes('ENOENT') || errorStr.includes('no such file')) {
    return 'Render failed: Required file not found.';
  }

  if (errorStr.includes('EACCES') || errorStr.includes('permission denied')) {
    return 'Render failed: Permission denied accessing files.';
  }

  if (errorStr.includes('timeout') || errorStr.includes('Timeout')) {
    return 'Render failed: Operation timed out.';
  }

  if (errorStr.includes('ffmpeg') || errorStr.includes('FFmpeg')) {
    // Extract just the key error message from FFmpeg output
    const match = errorStr.match(/Error[:\s]+([^\.]+)/i);
    if (match) {
      return `Render failed: ${match[1].substring(0, 100)}`;
    }
    return 'Render failed: Video encoding error.';
  }

  if (errorStr.includes('Remotion') || errorStr.includes('remotion')) {
    return 'Render failed: Remotion rendering error.';
  }

  if (errorStr.includes('ENOMEM') || errorStr.includes('out of memory')) {
    return 'Render failed: Not enough memory available.';
  }

  // If error is already short enough, use it
  if (errorStr.length < 150) {
    return `Render failed: ${errorStr}`;
  }

  // Truncate long errors
  return `Render failed: ${errorStr.substring(0, 100)}...`;
}
