import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  ChevronDown, 
  Music, 
  Sparkles, 
  MessageSquare, 
  StickyNote, 
  Send, 
  Check, 
  Clock, 
  User, 
  Heart, 
  MessageSquarePlus, 
  RefreshCw, 
  Eye, 
  Sliders, 
  CheckCircle2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LyricLine, FriendNote } from '../types';
import { parseLrcLyrics, formatSecondsToTime, SAMPLE_SPOTIFY_LYRICS } from '../lib/lyricsParser';

interface CleanScreenProps {
  bgImageUrl?: string;
  songUrl?: string;
  songTitle?: string;
  songArtist?: string;
  lyricsText?: string;
  lyrics?: LyricLine[];
  friendNotes?: FriendNote[];
  onSendNote?: (sender: string, message: string) => Promise<void> | void;
  friendName?: string;
}

export const CleanScreen: React.FC<CleanScreenProps> = ({
  bgImageUrl,
  songUrl,
  songTitle,
  songArtist,
  lyricsText,
  lyrics: propLyrics,
  friendNotes = [],
  onSendNote,
  friendName,
}) => {
  // --- AUDIO STATE ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // --- LYRICS STATE & ANIMATION ---
  const [autoScrollLyrics, setAutoScrollLyrics] = useState(true);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  // Parse lyrics from prop or raw lyricsText or fallback sample
  const parsedLyrics = useMemo<LyricLine[]>(() => {
    if (propLyrics && propLyrics.length > 0) {
      return propLyrics;
    }
    if (lyricsText && lyricsText.trim()) {
      return parseLrcLyrics(lyricsText);
    }
    // Default Spotify-style synced sample lyrics
    return parseLrcLyrics(SAMPLE_SPOTIFY_LYRICS);
  }, [propLyrics, lyricsText]);

  // Determine current active lyric index based on currentTime
  const activeLyricIndex = useMemo(() => {
    if (!parsedLyrics || parsedLyrics.length === 0) return -1;

    // If lyrics have timestamps, find line that matches currentTime
    for (let i = parsedLyrics.length - 1; i >= 0; i--) {
      const lineTime = parsedLyrics[i].time;
      if (lineTime !== undefined && currentTime >= lineTime) {
        return i;
      }
    }
    return 0;
  }, [parsedLyrics, currentTime]);

  // Smooth Spotify-like auto-scroll to center active lyric line
  useEffect(() => {
    if (autoScrollLyrics && activeLineRef.current && lyricsContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLyricIndex, autoScrollLyrics]);

  // --- AUDIO LIFECYCLE ---
  useEffect(() => {
    if (!songUrl) return;

    const audio = audioRef.current;
    if (audio) {
      audio.volume = 0.85;
      audio.loop = true;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay restricted until user gesture
            setIsPlaying(false);
          });
      }
    }

    const handleFirstGesture = () => {
      const el = audioRef.current;
      if (el && el.paused) {
        el.play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };

    window.addEventListener('click', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);
    window.addEventListener('touchstart', handleFirstGesture);

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };
  }, [songUrl]);

  // Track time & duration
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  // --- NOTES SECTION STATE ---
  // Default is closed, user can open by clicking the bottom icon
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  // Mode: 'view' (clicking note icon) or 'write' (clicking comment icon)
  const [noteMode, setNoteMode] = useState<'view' | 'write'>('write');
  const [senderName, setSenderName] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isSendingNote, setIsSendingNote] = useState(false);
  const [noteSentSuccess, setNoteSentSuccess] = useState(false);

  // Close notes modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isNotesOpen) {
        setIsNotesOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNotesOpen]);

  const handleSendNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setIsSendingNote(true);
    try {
      if (onSendNote) {
        await onSendNote(senderName.trim() || 'Friend', noteText.trim());
      }
      setNoteText('');
      setNoteSentSuccess(true);
      setTimeout(() => {
        setNoteSentSuccess(false);
        setNoteMode('view'); // Switch to see notes
      }, 1200);
    } catch (err) {
      console.error('Error sending note:', err);
    } finally {
      setIsSendingNote(false);
    }
  };

  const scrollToLyrics = () => {
    const el = document.getElementById('lyrics-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#070707] text-white selection:bg-white selection:text-black">
      {/* Hidden Audio Player */}
      {songUrl && (
        <audio
          ref={audioRef}
          src={songUrl}
          preload="auto"
          loop
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* ========================================================= */}
      {/* 1. HERO SECTION: FULL SCREEN IMAGE COVER (DO NOT REDUCE SIZE) */}
      {/* ========================================================= */}
      <section className="relative w-full h-screen min-h-[100dvh] overflow-hidden flex flex-col justify-between select-none">
        {/* Full Screen Background Image */}
        {bgImageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 transform scale-100"
            style={{
              backgroundImage: `url(${bgImageUrl})`,
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#111111] via-[#0A0A0A] to-[#050505]" />
        )}

        {/* Ambient Dark Gradient Vignette for cinematic look */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 p-6 sm:p-8" />

        {/* Bottom Bar: Sound Indicator & Scroll Down Cue */}
        <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Scroll Down Invitation Pill */}
          <button
            onClick={scrollToLyrics}
            className="group flex items-center gap-2 bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/15 hover:border-white/30 text-white/90 hover:text-white px-5 py-2.5 rounded-full text-xs font-mono tracking-widest uppercase transition-all shadow-2xl cursor-pointer"
          >
            <span>Scroll for lyrics</span>
            <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
          </button>

          {/* Floating Sound & Scrubber Pill in Hero */}
          {songUrl && (
            <div className="flex items-center gap-3 bg-black/60 hover:bg-black/85 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 text-white transition-all shadow-2xl">
              <button
                onClick={togglePlay}
                className="text-white hover:text-zinc-200 p-1.5 transition-colors cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={toggleMute}
                className="text-white/70 hover:text-white p-1.5 transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              {/* Mini scrubber */}
              {duration > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-400">
                    {formatSecondsToTime(currentTime)}
                  </span>
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = (e.clientX - rect.left) / rect.width;
                      handleSeek(ratio * duration);
                    }}
                    className="w-16 sm:w-24 h-1.5 bg-white/20 hover:bg-white/30 rounded-full cursor-pointer overflow-hidden transition-all"
                  >
                    <div
                      className="h-full bg-white transition-all duration-100"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {formatSecondsToTime(duration)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. SPOTIFY-STYLE LYRICS ANIMATION SECTION */}
      {/* ========================================================= */}
      <section
        id="lyrics-section"
        className="w-full relative py-16 sm:py-24 px-4 sm:px-8 bg-gradient-to-b from-[#070707] via-[#0D0D0D] to-[#070707] border-t border-b border-white/5"
      >
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Lyrics Header & Audio Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <Music className="w-5 h-5 text-white/80" />
                <span>{songTitle || 'Lyrics'}</span>
              </h2>
              {songArtist && (
                <p className="text-xs text-zinc-400 font-mono">{songArtist}</p>
              )}
            </div>

            {/* Lyrics Player Bar & Auto-sync Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoScrollLyrics(!autoScrollLyrics)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono tracking-wider transition-all flex items-center gap-1.5 border ${
                  autoScrollLyrics
                    ? 'bg-white text-black border-white font-semibold shadow-lg'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
                }`}
                title="Toggle Spotify auto-scrolling synchronization"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Sync {autoScrollLyrics ? 'ON' : 'OFF'}</span>
              </button>

              {songUrl && (
                <button
                  onClick={togglePlay}
                  className="px-4 py-1.5 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      <span>Play Track</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Spotify Lyrics Animated Feed */}
          <div
            ref={lyricsContainerRef}
            className="w-full max-h-[520px] overflow-y-auto py-12 px-2 sm:px-6 space-y-6 sm:space-y-8 scroll-smooth no-scrollbar select-none"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
            }}
          >
            {parsedLyrics.length > 0 ? (
              parsedLyrics.map((line, index) => {
                const isActive = index === activeLyricIndex;
                const isPast = activeLyricIndex > -1 && index < activeLyricIndex;

                return (
                  <div
                    key={line.id || index}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => {
                      if (line.time !== undefined) {
                        handleSeek(line.time);
                      }
                    }}
                    className={`transition-all duration-300 cursor-pointer group rounded-lg py-1 px-3 -mx-3 flex items-baseline gap-3 ${
                      isActive
                        ? 'text-white font-extrabold text-2xl sm:text-4xl md:text-5xl tracking-tight leading-snug drop-shadow-[0_0_24px_rgba(255,255,255,0.45)] scale-[1.02] origin-left'
                        : isPast
                        ? 'text-zinc-400 font-semibold text-lg sm:text-2xl md:text-3xl opacity-60 hover:opacity-100 hover:text-zinc-200'
                        : 'text-zinc-600 font-semibold text-lg sm:text-2xl md:text-3xl opacity-30 hover:opacity-75 hover:text-zinc-400'
                    }`}
                  >
                    {/* Active Pulsing Indicator Bar */}
                    <div className="w-1.5 self-stretch shrink-0 flex items-center justify-center">
                      {isActive && (
                        <motion.div
                          layoutId="spotify-lyric-bar"
                          className="w-1.5 h-full min-h-[28px] bg-white rounded-full shadow-[0_0_12px_#ffffff]"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                    </div>

                    <div className="flex-1">
                      <span>{line.text}</span>
                    </div>

                    {line.formattedTime && (
                      <span className="opacity-0 group-hover:opacity-60 text-xs font-mono text-zinc-400 transition-opacity self-center shrink-0">
                        {line.formattedTime}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-16 text-center text-zinc-500 font-mono text-xs uppercase tracking-widest">
                No lyrics loaded.
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 font-mono">
            <span>Click any lyric line to jump audio</span>
            <span>{parsedLyrics.length} lines</span>
          </div>
        </div>
      </section>

      {/* Ultra Minimal Clean Footer */}
      <footer className="w-full py-12 px-4 text-center text-xs font-mono text-zinc-600 border-t border-white/5 bg-[#050505] flex flex-col items-center justify-center">
        <button
          onClick={() => setIsNotesOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 text-xs transition-colors cursor-pointer"
        >
          <StickyNote className="w-3.5 h-3.5" />
          <span>{friendNotes.length > 0 ? `${friendNotes.length} Notes Left` : 'Leave a note'}</span>
        </button>
      </footer>

      {/* ========================================================= */}
      {/* 3. SLEEK FLOATING NOTE ICON (BOTTOM RIGHT) */}
      {/* ========================================================= */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsNotesOpen(true)}
          className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-[#141414]/90 hover:bg-[#222222] text-white border border-white/20 hover:border-white/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.7)] transition-all cursor-pointer hover:scale-110 active:scale-95"
          title="Open Notes"
        >
          <StickyNote className="w-5 h-5 text-white/90 group-hover:rotate-6 transition-transform" />
          {friendNotes.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-black font-bold text-[10px] flex items-center justify-center shadow-lg">
              {friendNotes.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* 4. ANIMATED NOTES MODAL / POPUP */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isNotesOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNotesOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-[#0F0F0F] border border-white/15 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col z-10"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-zinc-950/80">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <StickyNote className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-wide">
                      Notes
                    </h3>
                    <p className="text-[11px] font-mono text-zinc-400">
                      {friendNotes.length} {friendNotes.length === 1 ? 'note' : 'notes'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Note & Comment Action Buttons */}
                  <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-white/10 rounded-full">
                    <button
                      onClick={() => setNoteMode('view')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        noteMode === 'view'
                          ? 'bg-white text-black font-semibold shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                      title="View all notes"
                    >
                      <StickyNote className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">See Notes</span>
                    </button>

                    <button
                      onClick={() => setNoteMode('write')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        noteMode === 'write'
                          ? 'bg-white text-black font-semibold shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Write a note"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Write Note</span>
                    </button>
                  </div>

                  {/* Close (X) Button */}
                  <button
                    onClick={() => setIsNotesOpen(false)}
                    className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                {/* Mode 1: HORIZONTAL NOTE WRITING BAR (Name + Note text + Send button) */}
                {noteMode === 'write' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {noteSentSuccess && (
                      <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Your note has been saved! Showing notes wall...</span>
                        </div>
                      </div>
                    )}

                    <form
                      onSubmit={handleSendNoteSubmit}
                      className="w-full bg-[#161616] border border-white/15 p-2.5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center gap-2.5 transition-all focus-within:border-white/40"
                    >
                      {/* 1. Name Input */}
                      <div className="relative w-full sm:w-44 shrink-0">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          placeholder="Name:"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/40"
                        />
                      </div>

                      {/* 2. Note Text Input */}
                      <div className="relative flex-1 w-full">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Note text..."
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/40"
                        />
                      </div>

                      {/* 3. Send Button */}
                      <button
                        type="submit"
                        disabled={isSendingNote || !noteText.trim()}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shrink-0 transition-all shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSendingNote ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send</span>
                          </>
                        )}
                      </button>
                    </form>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono px-1">
                      <span>Syncs in real-time</span>
                      <button
                        type="button"
                        onClick={() => setNoteMode('view')}
                        className="text-zinc-400 hover:text-white underline"
                      >
                        View all {friendNotes.length} notes
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Mode 2: VIEW NOTES LIST */}
                {noteMode === 'view' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {friendNotes.length === 0 ? (
                      <div className="py-12 text-center bg-[#161616] border border-white/10 rounded-2xl p-8 space-y-3">
                        <StickyNote className="w-8 h-8 text-zinc-500 mx-auto" />
                        <p className="text-xs text-zinc-400">
                          No notes have been left yet.
                        </p>
                        <button
                          onClick={() => setNoteMode('write')}
                          className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquarePlus className="w-3.5 h-3.5" />
                          <span>Write the First Note</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {friendNotes.map((note) => (
                          <div
                            key={note.id}
                            className="p-3.5 rounded-xl bg-[#161616] border border-white/10 hover:border-white/20 transition-all space-y-2 shadow-lg"
                          >
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                                  {note.sender?.charAt(0) || 'F'}
                                </div>
                                <span className="text-xs font-semibold text-white tracking-wide truncate max-w-[140px]">
                                  {note.sender}
                                </span>
                              </div>

                              <span className="text-[10px] font-mono text-zinc-500">
                                {new Date(note.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                              {note.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
