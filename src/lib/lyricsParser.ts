import { LyricLine } from '../types';

/**
 * Format seconds into mm:ss or mm:ss.xx string
 */
export function formatSecondsToTime(seconds: number, includeMs = false): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const padMin = String(mins).padStart(2, '0');
  const padSec = String(secs).padStart(2, '0');

  if (includeMs) {
    const ms = Math.floor((seconds % 1) * 100);
    const padMs = String(ms).padStart(2, '0');
    return `${padMin}:${padSec}.${padMs}`;
  }
  return `${padMin}:${padSec}`;
}

/**
 * Parse raw LRC or plain text into structured LyricLine[]
 */
export function parseLrcLyrics(rawText: string, defaultStepSeconds = 4): LyricLine[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/);
  const parsed: LyricLine[] = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  let hasAnyTimestamps = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Skip metadata headers like [ti:Title], [ar:Artist], etc. unless it contains time
    if (/^\[(ti|ar|al|by|offset|length):/i.test(rawLine)) {
      continue;
    }

    const matches = Array.from(rawLine.matchAll(timeRegex));

    if (matches.length > 0) {
      hasAnyTimestamps = true;
      const text = rawLine.replace(timeRegex, '').trim();

      for (const match of matches) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const ms = match[3] ? parseFloat('0.' + match[3]) : 0;
        const totalSecs = mins * 60 + secs + ms;

        parsed.push({
          id: `lyric-${i}-${Math.random().toString(36).substr(2, 5)}`,
          time: totalSecs,
          formattedTime: formatSecondsToTime(totalSecs, true),
          text: text || '♪',
        });
      }
    } else {
      // Plain text line without explicit timestamp
      parsed.push({
        id: `lyric-${i}-${Math.random().toString(36).substr(2, 5)}`,
        text: rawLine,
      });
    }
  }

  // If no lines had timestamps, assign synthetic progressive timings
  if (!hasAnyTimestamps) {
    return parsed.map((item, idx) => {
      const assignedTime = idx * defaultStepSeconds;
      return {
        ...item,
        time: assignedTime,
        formattedTime: formatSecondsToTime(assignedTime, false),
      };
    });
  }

  // Sort chronologically by time
  return parsed.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
}

/**
 * Format LyricLine[] back into LRC file string format
 */
export function formatLrcLyrics(lyrics: LyricLine[]): string {
  if (!lyrics || lyrics.length === 0) return '';
  return lyrics
    .map((l) => {
      const timeStr = l.time !== undefined ? `[${formatSecondsToTime(l.time, true)}] ` : '';
      return `${timeStr}${l.text}`;
    })
    .join('\n');
}

/**
 * Sample Spotify-style synced lyrics preset for demonstration
 */
export const SAMPLE_SPOTIFY_LYRICS: string = `[00:00.00] (Instrumental intro playing softly...)
[00:06.00] Late night quiet in the city
[00:11.50] Footsteps echoing down the empty street
[00:17.20] Underneath the matte black sky
[00:22.80] Every little thought begins to breathe
[00:29.00] 
[00:30.00] Leave your worries at the door tonight
[00:35.40] We've got all the time in the world
[00:41.00] Just listen to the rhythm of the rain
[00:47.50] Everything is going to be alright
[00:54.00] 
[00:55.50] A quiet sanctuary built just for you
[01:01.00] Words we don't have to say out loud
[01:07.20] In the stillness where the memories stay
[01:13.50] Floating on a gentle sound
[01:20.00] (Music gently fading...)`;
