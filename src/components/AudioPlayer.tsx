import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Mic, Music } from 'lucide-react';

interface AudioPlayerProps {
  url: string;
  title?: string;
  artist?: string;
  isVoiceNote?: boolean;
  accentColor?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  url,
  title = 'Audio Track',
  artist = 'Voice Recording',
  isVoiceNote = false,
  accentColor = '#f4f4f5',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setHasError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setHasError(true);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setHasError(true));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      id={`audio-player-${title.replace(/\s+/g, '-').toLowerCase()}`}
      className="bg-[#111111] p-5 sm:p-6 border border-white/5 transition-all shadow-sm group"
    >
      <audio ref={audioRef} src={url} preload="metadata" />

      <div className="flex items-center gap-4 sm:gap-6">
        {/* Crisp Square Minimal Play Button */}
        <button
          onClick={togglePlay}
          className="w-12 h-12 flex items-center justify-center bg-white text-black shrink-0 hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer shadow-sm"
          title={isPlaying ? 'Pause audio' : 'Play audio'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-black text-black" />
          ) : (
            <Play className="w-5 h-5 fill-black text-black ml-0.5" />
          )}
        </button>

        {/* Track info and Sleek Line Scrubber */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-medium uppercase tracking-widest text-white truncate">
                {title}
              </h4>
              {artist && (
                <p className="text-[10px] uppercase tracking-wider text-[#666666] font-mono truncate">
                  {artist}
                </p>
              )}
            </div>

            <button
              onClick={toggleMute}
              className="text-[#666666] hover:text-white transition-colors p-1"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Scrubber slider bar */}
          <div className="relative flex items-center group/track py-1">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-white/10 appearance-none cursor-pointer accent-white focus:outline-none"
              style={{
                background: `linear-gradient(to right, #FFFFFF ${progressPercent}%, rgba(255,255,255,0.1) ${progressPercent}%)`,
              }}
            />
          </div>
        </div>

        {/* Duration / Timestamp */}
        <div className="text-[10px] font-mono text-[#666666] shrink-0 text-right">
          <div>{formatTime(currentTime)}</div>
          <div className="text-[#444444]">{formatTime(duration)}</div>
        </div>
      </div>
    </div>
  );
};
