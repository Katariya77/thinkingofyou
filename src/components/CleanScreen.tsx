import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';

interface CleanScreenProps {
  bgImageUrl?: string;
  songUrl?: string;
  songTitle?: string;
}

export const CleanScreen: React.FC<CleanScreenProps> = ({
  bgImageUrl,
  songUrl,
  songTitle,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Attempt autoplay when component mounts
  useEffect(() => {
    if (!songUrl) return;

    const audio = audioRef.current;
    if (audio) {
      audio.volume = 0.8;
      audio.loop = true;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setHasInteracted(true);
          })
          .catch(() => {
            // Autoplay blocked by browser policy until user gesture
            setIsPlaying(false);
          });
      }
    }

    // Also listen to any first user interaction anywhere on the window to start audio if blocked
    const handleFirstGesture = () => {
      const el = audioRef.current;
      if (el && el.paused) {
        el.play()
          .then(() => {
            setIsPlaying(true);
            setHasInteracted(true);
          })
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

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
        setHasInteracted(true);
      }).catch(() => {});
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div className="relative w-screen h-screen min-h-[100dvh] overflow-hidden bg-[#0A0A0A] select-none flex items-center justify-center">
      {/* Background Image / Canvas */}
      {bgImageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
          style={{
            backgroundImage: `url(${bgImageUrl})`,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#0A0A0A]" />
      )}

      {/* Hidden Audio Element */}
      {songUrl && (
        <audio
          ref={audioRef}
          src={songUrl}
          preload="auto"
          loop
        />
      )}

      {/* Ultra-minimal, discrete sound indicator in bottom corner if audio exists */}
      {songUrl && (
        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2 bg-black/40 hover:bg-black/70 backdrop-blur-md px-3 py-2 rounded-sm border border-white/10 text-white transition-all opacity-80 hover:opacity-100">
          <button
            onClick={togglePlay}
            className="text-white hover:text-zinc-300 p-1 transition-colors cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={toggleMute}
            className="text-white/70 hover:text-white p-1 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          {songTitle && (
            <span className="text-[10px] font-mono tracking-widest text-[#AAAAAA] uppercase px-1 max-w-[150px] truncate">
              {songTitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
