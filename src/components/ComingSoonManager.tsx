import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Upload, 
  Music, 
  FileText, 
  Sparkles, 
  Play, 
  Pause, 
  Save, 
  Check, 
  Trash2, 
  Eye, 
  HelpCircle, 
  Plus, 
  Volume2, 
  Sliders, 
  Image as ImageIcon,
  Clock,
  Radio,
  FileCode,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ComingSoonConfig, LyricLine } from '../types';
import { 
  parseLrcLyrics, 
  formatLrcLyrics, 
  formatSecondsToTime, 
  SAMPLE_SPOTIFY_LYRICS 
} from '../lib/lyricsParser';

interface ComingSoonManagerProps {
  comingSoon?: ComingSoonConfig;
  onSave: (config: ComingSoonConfig) => Promise<void> | void;
  onViewNotes?: () => void;
  notesCount?: number;
}

export const ComingSoonManager: React.FC<ComingSoonManagerProps> = ({
  comingSoon,
  onSave,
  onViewNotes,
  notesCount = 0,
}) => {
  // --- LOCAL FORM STATE ---
  const [enabled, setEnabled] = useState<boolean>(comingSoon?.enabled || false);
  const [bgImageUrl, setBgImageUrl] = useState<string>(comingSoon?.bgImageUrl || '');
  const [songUrl, setSongUrl] = useState<string>(comingSoon?.songUrl || '');
  const [songTitle, setSongTitle] = useState<string>(comingSoon?.songTitle || '');
  const [songArtist, setSongArtist] = useState<string>(comingSoon?.songArtist || '');
  const [lyricsText, setLyricsText] = useState<string>(
    comingSoon?.lyricsText || (comingSoon?.lyrics ? formatLrcLyrics(comingSoon.lyrics) : '')
  );

  // Sync state if external prop changes
  useEffect(() => {
    if (comingSoon) {
      setEnabled(comingSoon.enabled || false);
      setBgImageUrl(comingSoon.bgImageUrl || '');
      setSongUrl(comingSoon.songUrl || '');
      setSongTitle(comingSoon.songTitle || '');
      setSongArtist(comingSoon.songArtist || '');
      if (comingSoon.lyricsText !== undefined) {
        setLyricsText(comingSoon.lyricsText);
      } else if (comingSoon.lyrics) {
        setLyricsText(formatLrcLyrics(comingSoon.lyrics));
      }
    }
  }, [comingSoon]);

  // Audio preview element
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);

  // Saving state & toast feedback
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fileUploadFeedback, setFileUploadFeedback] = useState<string | null>(null);

  // Parsed lyrics lines
  const parsedLines = useMemo<LyricLine[]>(() => {
    return parseLrcLyrics(lyricsText);
  }, [lyricsText]);

  // Active line in preview
  const activePreviewLineIndex = useMemo(() => {
    if (!parsedLines || parsedLines.length === 0) return -1;
    for (let i = parsedLines.length - 1; i >= 0; i--) {
      const lineTime = parsedLines[i].time;
      if (lineTime !== undefined && previewCurrentTime >= lineTime) {
        return i;
      }
    }
    return 0;
  }, [parsedLines, previewCurrentTime]);

  // Preset wallpapers
  const PRESET_WALLPAPERS = [
    {
      name: 'Monochrome Peaks',
      url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=80&w=1600&auto=format&fit=crop',
    },
    {
      name: 'Moody Minimal Forest',
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop',
    },
    {
      name: 'Dark Obsidian Sand',
      url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=1600&auto=format&fit=crop',
    },
    {
      name: 'Ethereal Nebula Noir',
      url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1600&auto=format&fit=crop',
    },
  ];

  // Handle Lyrics File Upload (.lrc, .txt, .json, .srt)
  const handleLyricsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setLyricsText(content);
        const parsed = parseLrcLyrics(content);
        setFileUploadFeedback(`Uploaded "${file.name}" (${parsed.length} lines parsed)`);
        setTimeout(() => setFileUploadFeedback(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  // Handle Audio File Upload (.mp3 / audio)
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSongUrl(reader.result as string);
      if (!songTitle) {
        setSongTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      setFileUploadFeedback(`Audio file "${file.name}" loaded`);
      setTimeout(() => setFileUploadFeedback(null), 4000);
    };
    reader.readAsDataURL(file);
  };

  // Handle Background Image File Upload
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setBgImageUrl(reader.result as string);
      setFileUploadFeedback(`Background image "${file.name}" loaded`);
      setTimeout(() => setFileUploadFeedback(null), 4000);
    };
    reader.readAsDataURL(file);
  };

  // Insert timestamp tag at cursor or append
  const handleInsertCurrentTimestamp = () => {
    const timeTag = `[${formatSecondsToTime(previewCurrentTime, true)}] `;
    setLyricsText((prev) => prev + (prev.endsWith('\n') || !prev ? '' : '\n') + timeTag + 'New line text');
  };

  // Toggle preview audio
  const togglePreviewPlay = () => {
    const audio = audioPreviewRef.current;
    if (!audio) return;
    if (previewPlaying) {
      audio.pause();
      setPreviewPlaying(false);
    } else {
      audio.play().then(() => setPreviewPlaying(true)).catch(() => {});
    }
  };

  // Save all settings
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const parsed = parseLrcLyrics(lyricsText);
      const updatedConfig: ComingSoonConfig = {
        enabled,
        bgImageUrl: bgImageUrl.trim(),
        songUrl: songUrl.trim(),
        songTitle: songTitle.trim(),
        songArtist: songArtist.trim(),
        lyricsText: lyricsText,
        lyrics: parsed,
      };

      await onSave(updatedConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving coming soon config:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl text-white">
      {/* Hidden audio element for admin preview & testing */}
      {songUrl && (
        <audio
          ref={audioPreviewRef}
          src={songUrl}
          onTimeUpdate={() => {
            if (audioPreviewRef.current) {
              setPreviewCurrentTime(audioPreviewRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (audioPreviewRef.current) {
              setPreviewDuration(audioPreviewRef.current.duration || 0);
            }
          }}
          onEnded={() => setPreviewPlaying(false)}
        />
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/70 border border-white/10 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">
              Coming Soon & Spotify Lyrics
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                enabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
              }`}
            />
            <span className="text-[11px] font-mono text-zinc-300">
              {enabled ? 'Active Public Mode' : 'Disabled (Standard Timeline)'}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            Coming Soon Page Management
          </h3>
          <p className="text-xs text-zinc-400 max-w-xl">
            Configure the full-screen visual hero, ambient audio playback, Spotify-style animated synchronized lyrics, and the friend note system.
          </p>
        </div>

        {/* Master Enable/Disable Switch */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-300">
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
      </div>

      {/* Toast Feedback */}
      {fileUploadFeedback && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{fileUploadFeedback}</span>
        </div>
      )}

      {/* 1. HERO BACKGROUND IMAGE CONFIGURATION */}
      <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-zinc-400" />
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              1. Full-Screen Background Image
            </h4>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">
            Covers 100% viewport size
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] uppercase text-zinc-400 font-mono">
                Image URL or Upload Local Image
              </label>
              <label className="cursor-pointer text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 font-medium px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Image File</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFileUpload}
                />
              </label>
            </div>

            <input
              type="url"
              value={bgImageUrl}
              onChange={(e) => setBgImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... or paste image URL"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Preset Minimal Wallpapers */}
          <div>
            <span className="text-[10px] uppercase text-zinc-400 font-mono block mb-2">
              Preset Minimalist High-Res Wallpapers
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PRESET_WALLPAPERS.map((wall) => (
                <button
                  key={wall.url}
                  type="button"
                  onClick={() => setBgImageUrl(wall.url)}
                  className={`relative h-18 rounded-xl overflow-hidden border transition-all text-left group ${
                    bgImageUrl === wall.url
                      ? 'border-white ring-2 ring-white/30'
                      : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <img
                    src={wall.url}
                    alt={wall.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-1 text-center">
                    <span className="text-[10px] text-white font-medium drop-shadow">
                      {wall.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Image Preview */}
          {bgImageUrl && (
            <div className="relative w-full h-40 rounded-xl overflow-hidden border border-zinc-800 bg-black group">
              <img
                src={bgImageUrl}
                alt="Coming Soon Background Preview"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-zinc-300">
                Full-screen Hero Preview
              </div>
              <button
                type="button"
                onClick={() => setBgImageUrl('')}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-950 text-zinc-400 hover:text-rose-300 transition-colors"
                title="Remove image"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. AUDIO TRACK & SOUND CONFIGURATION */}
      <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-zinc-400" />
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              2. Background Soundtrack & Audio
            </h4>
          </div>
          {songUrl && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePreviewPlay}
                className="px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {previewPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
                <span>{previewPlaying ? 'Pause Audio' : 'Test Audio'}</span>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] uppercase text-zinc-400 font-mono">
                Audio Stream URL (.mp3 / direct link) or Upload Audio
              </label>
              <label className="cursor-pointer text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 font-medium px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Audio (.mp3)</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleAudioFileUpload}
                />
              </label>
            </div>

            <input
              type="url"
              value={songUrl}
              onChange={(e) => setSongUrl(e.target.value)}
              placeholder="https://cdn.freesound.org/... or direct .mp3 URL"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase text-zinc-400 font-mono mb-1">
                Track Title (e.g. Midnight Ambient Rain)
              </label>
              <input
                type="text"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                placeholder="e.g. Quiet Melody"
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-zinc-400 font-mono mb-1">
                Artist Name (Optional)
              </label>
              <input
                type="text"
                value={songArtist}
                onChange={(e) => setSongArtist(e.target.value)}
                placeholder="e.g. Recorded for You"
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. SPOTIFY-STYLE LYRICS FILE UPLOAD & SYNCED EDITOR */}
      <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-400" />
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                3. Spotify Synced Lyrics & File Upload
              </h4>
              <p className="text-[11px] text-zinc-400">
                Upload `.lrc` or `.txt` lyrics file with `[mm:ss.xx]` timestamps for real-time Spotify karaoke highlighting.
              </p>
            </div>
          </div>

          {/* Upload Lyrics File Button & Preset Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setLyricsText(SAMPLE_SPOTIFY_LYRICS)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 hover:text-white font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Load sample lyrics formatted for Spotify sync"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Load Sample LRC</span>
            </button>

            <label className="cursor-pointer text-xs text-black bg-white hover:bg-zinc-200 font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow">
              <Upload className="w-3.5 h-3.5 text-black" />
              <span>Upload Lyrics File (.lrc, .txt)</span>
              <input
                type="file"
                accept=".lrc,.txt,.json,.srt,text/plain"
                className="hidden"
                onChange={handleLyricsFileUpload}
              />
            </label>
          </div>
        </div>

        {/* Textarea Editor & Helper Buttons */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[11px] text-zinc-400">
              Format: <code className="text-zinc-200">[mm:ss.xx] Lyric phrase</code> or plain text line-by-line
            </span>

            {songUrl && (
              <button
                type="button"
                onClick={handleInsertCurrentTimestamp}
                className="text-xs text-zinc-400 hover:text-white font-mono flex items-center gap-1"
                title="Insert current audio position timestamp"
              >
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Stamp current audio ({formatSecondsToTime(previewCurrentTime, true)})</span>
              </button>
            )}
          </div>

          <textarea
            rows={10}
            value={lyricsText}
            onChange={(e) => setLyricsText(e.target.value)}
            placeholder="Paste your lyrics here with timestamps, e.g.:
[00:05.00] In the quiet corner of the night
[00:10.50] All the stars are shining bright
[00:16.00] Take a breath and let it go..."
            className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono leading-relaxed placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-y"
          />

          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>{parsedLines.length} lines parsed</span>
            <span>Spotify karaoke animation active</span>
          </div>
        </div>

        {/* Real-time Interactive Spotify Lyrics Preview Box */}
        {parsedLines.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-black/60 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Live Spotify Lyrics Visualizer Preview</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                Click any line to test seeking
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-3 py-2 px-1 scroll-smooth no-scrollbar">
              {parsedLines.map((line, idx) => {
                const isActive = idx === activePreviewLineIndex;
                const isPast = activePreviewLineIndex > -1 && idx < activePreviewLineIndex;

                return (
                  <div
                    key={line.id || idx}
                    onClick={() => {
                      if (line.time !== undefined && audioPreviewRef.current) {
                        audioPreviewRef.current.currentTime = line.time;
                        setPreviewCurrentTime(line.time);
                      }
                    }}
                    className={`cursor-pointer transition-all duration-200 flex items-baseline gap-2 text-left ${
                      isActive
                        ? 'text-white font-bold text-lg scale-[1.02] origin-left drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]'
                        : isPast
                        ? 'text-zinc-400 text-sm opacity-60'
                        : 'text-zinc-600 text-sm opacity-30 hover:opacity-75'
                    }`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1">
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                    </div>
                    <span className="flex-1">{line.text}</span>
                    {line.formattedTime && (
                      <span className="text-[10px] font-mono text-zinc-500 opacity-60">
                        {line.formattedTime}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. NOTES SHORTCUT */}
      <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-white">Friend & Visitor Notes</h4>
          <p className="text-xs text-zinc-400">
            {notesCount} note(s) currently stored in Firebase from visitors.
          </p>
        </div>
        {onViewNotes && (
          <button
            type="button"
            onClick={onViewNotes}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 hover:text-white transition-colors"
          >
            View Notes Inbox ({notesCount})
          </button>
        )}
      </div>

      {/* SAVE BUTTON */}
      <div className="flex items-center justify-between pt-2">
        {saveSuccess ? (
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Saved to Firebase successfully!</span>
          </div>
        ) : (
          <span className="text-xs text-zinc-500 font-mono">
            Changes will take effect on the Coming Soon screen immediately.
          </span>
        )}

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="px-6 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs tracking-wider uppercase flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <span>Saving in Cloud...</span>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Coming Soon Config</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
