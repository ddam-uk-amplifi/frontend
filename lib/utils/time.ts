/**
 * Parse timestamp string in MM:SS format to seconds
 * @param timestamp - Time string in format "MM:SS" (e.g., "01:30")
 * @returns Number of seconds
 */
export const parseTimestampToSeconds = (timestamp: string): number => {
  const parts = timestamp.match(/(\d+):(\d+)/);
  if (!parts) {
    return 0;
  }
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);
  return minutes * 60 + seconds;
};

/**
 * Convert seconds to MM:SS format
 * @param seconds - Number of seconds
 * @returns Formatted time string
 */
export const secondsToTimestamp = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
};
