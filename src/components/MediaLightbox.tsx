import React from 'react';
import { X, ChevronLeft, ChevronRight, Download, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrls: string[];
  initialIndex?: number;
  title?: string;
  caption?: string;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  isOpen,
  onClose,
  mediaUrls,
  initialIndex = 0,
  title,
  caption,
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

  React.useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, mediaUrls.length]);

  if (!isOpen || mediaUrls.length === 0) return null;

  const currentUrl = mediaUrls[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % mediaUrls.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
  };

  return (
    <AnimatePresence>
      <motion.div
        id="media-lightbox-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6"
      >
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between text-zinc-300 max-w-6xl">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-medium text-white truncate">{title}</h3>}
            {mediaUrls.length > 1 && (
              <p className="text-xs text-zinc-400">
                {currentIndex + 1} of {mediaUrls.length}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-800"
              title="Open Original"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-800"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Container */}
        <div className="relative flex-1 w-full max-w-6xl flex items-center justify-center my-4 overflow-hidden">
          <motion.img
            key={currentUrl}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            src={currentUrl}
            alt={title || 'Media preview'}
            className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl border border-zinc-800/60"
            referrerPolicy="no-referrer"
          />

          {mediaUrls.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-zinc-800/80 text-white border border-zinc-700/60 transition-all backdrop-blur-sm"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-zinc-800/80 text-white border border-zinc-700/60 transition-all backdrop-blur-sm"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Caption */}
        {caption && (
          <div className="w-full max-w-2xl text-center py-2 px-4 bg-zinc-900/60 rounded-lg border border-zinc-800 text-xs text-zinc-300">
            {caption}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
