import React, { useState } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Pin, 
  Clock, 
  FileText, 
  Image as ImageIcon, 
  Film, 
  Radio, 
  Quote, 
  Check,
  Send,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { Post, ThemeConfig } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { MediaLightbox } from './MediaLightbox';

interface PostCardProps {
  post: Post;
  theme: ThemeConfig;
  onReact: (postId: string, emoji: string) => void;
  onAddComment: (postId: string, author: string, text: string) => void;
  onSelectTag?: (tag: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  theme,
  onReact,
  onAddComment,
}) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [copied, setCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const formatTimestamp = (timestamp: number) => {
    if (post.formattedDateOverride) {
      return post.formattedDateOverride;
    }
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    let relative = '';
    if (diffHours < 1) {
      const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      relative = `${mins}m ago`;
    } else if (diffHours < 24) {
      relative = `${diffHours}h ago`;
    } else if (diffDays < 7) {
      relative = `${diffDays}d ago`;
    } else {
      relative = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    const fullDate = date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });

    return { fullDate, relative };
  };

  const timeData = formatTimestamp(post.timestamp);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(post.id, commentAuthor || theme.friendName || 'Friend', commentText);
    setCommentText('');
  };

  const getPostTypeIcon = () => {
    switch (post.type) {
      case 'audio':
        return <Radio className="w-3.5 h-3.5" />;
      case 'video':
        return <Film className="w-3.5 h-3.5" />;
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5" />;
      case 'quote':
        return <Quote className="w-3.5 h-3.5" />;
      default:
        return <FileText className="w-3.5 h-3.5" />;
    }
  };

  // Check if video is YouTube or direct
  const renderVideoMedia = () => {
    const videoUrl = post.mediaUrls?.[0] || '';
    if (!videoUrl) return null;

    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      // Extract youtube embed id
      let videoId = '';
      if (videoUrl.includes('youtu.be/')) {
        videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0] || '';
      } else if (videoUrl.includes('watch?v=')) {
        videoId = videoUrl.split('watch?v=')[1]?.split('&')[0] || '';
      }
      return (
        <div className="relative w-full aspect-video overflow-hidden bg-[#161616] border border-white/5 shadow-lg">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title={post.title || 'Video player'}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    if (videoUrl.includes('vimeo.com')) {
      const vimeoId = videoUrl.split('/').pop()?.split('?')[0];
      return (
        <div className="relative w-full aspect-video overflow-hidden bg-[#161616] border border-white/5 shadow-lg">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}`}
            title={post.title || 'Video player'}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    // Direct MP4 / WebM video
    return (
      <div className="relative w-full overflow-hidden bg-[#161616] border border-white/5 shadow-lg group">
        <video
          src={videoUrl}
          controls
          preload="metadata"
          className="w-full max-h-[500px] object-contain"
        />
      </div>
    );
  };

  const quickEmojis = ['🖤', '✨', '☕', '🎧', '🤍', '🌙'];

  return (
    <article
      id={`post-${post.id}`}
      className="group transition-all duration-300 w-full"
    >
      <div className="py-6 sm:py-8 space-y-4">
        {/* Post Metadata Header */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Type badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-white/5 border border-white/10 text-[#E0E0E0] text-[10px] font-medium uppercase tracking-widest">
              {getPostTypeIcon()}
              <span>{post.type}</span>
            </span>

            {/* Author */}
            <span className="font-medium text-[#888888] text-[11px] uppercase tracking-wider truncate">
              {post.author || 'Author'}
            </span>

            {/* Pinned pill */}
            {post.pinned && (
              <span className="inline-flex items-center gap-1 text-[10px] text-white font-medium px-2 py-0.5 bg-white/10 rounded-sm border border-white/20 uppercase tracking-wider">
                <Pin className="w-3 h-3 rotate-45" />
                <span>Pinned</span>
              </span>
            )}
          </div>

          {/* Timestamp Display */}
          <div className="flex items-center gap-1.5 text-[#666666] text-[10px] shrink-0 font-mono uppercase tracking-tighter">
            <Clock className="w-3 h-3 text-[#555555]" />
            <span title={typeof timeData === 'string' ? timeData : timeData.fullDate}>
              {typeof timeData === 'string' ? timeData : `${timeData.fullDate} • ${timeData.relative}`}
            </span>
          </div>
        </div>

        {/* Title */}
        {post.title && (
          <h3 className={`text-2xl sm:text-3xl font-light leading-relaxed text-white tracking-tight ${
            theme.typography === 'serif' ? 'font-serif-display' : ''
          }`}>
            {post.title}
          </h3>
        )}

        {/* Quote formatting */}
        {post.type === 'quote' ? (
          <div className="relative pl-5 py-2 border-l-2 border-white/40 my-2 italic text-[#E0E0E0] text-lg sm:text-xl leading-relaxed">
            <p>{post.content}</p>
            {post.linkMetadata?.quoteAuthor && (
              <span className="block not-italic text-xs text-[#888888] font-mono uppercase tracking-widest mt-2">
                — {post.linkMetadata.quoteAuthor}
              </span>
            )}
          </div>
        ) : (
          /* Text Content */
          post.content && (
            <div className="text-[#888888] text-sm leading-7 whitespace-pre-line break-words font-normal">
              {post.content}
            </div>
          )
        )}

        {/* Image Grid / Single Image */}
        {post.type === 'image' && post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className="space-y-2 mt-3">
            {post.mediaUrls.length === 1 ? (
              <div 
                className="relative rounded-none overflow-hidden border border-white/5 bg-[#161616] cursor-pointer group/img max-h-[550px] flex items-center justify-center"
                onClick={() => {
                  setLightboxIndex(0);
                  setLightboxOpen(true);
                }}
              >
                <img
                  src={post.mediaUrls[0]}
                  alt={post.title || 'Post image'}
                  className="w-full h-auto max-h-[550px] object-cover transition-transform duration-500 group-hover/img:scale-[1.01]"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="p-2.5 rounded-full bg-black/60 text-white backdrop-blur-sm border border-white/20">
                    <Maximize2 className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 overflow-hidden">
                {post.mediaUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square overflow-hidden bg-[#161616] border border-white/5 cursor-pointer group/img"
                    onClick={() => {
                      setLightboxIndex(idx);
                      setLightboxOpen(true);
                    }}
                  >
                    <img
                      src={url}
                      alt={`Post photo ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="p-2 rounded-full bg-black/60 text-white backdrop-blur-sm">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Video Player */}
        {post.type === 'video' && renderVideoMedia()}

        {/* Audio Player */}
        {post.type === 'audio' && post.mediaUrls?.[0] && (
          <div className="mt-3">
            <AudioPlayer
              url={post.mediaUrls[0]}
              title={post.audioMetadata?.trackTitle || post.title || 'Voice Note'}
              artist={post.audioMetadata?.artist || (post.audioMetadata?.voiceNote ? 'Voice Recording' : 'Shared Audio')}
              isVoiceNote={post.audioMetadata?.voiceNote}
              accentColor={theme.accentColor}
            />
          </div>
        )}

        {/* Action / Reactions Bar */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-[#888888]">
          {/* Quick emoji reactions */}
          <div className="flex flex-wrap items-center gap-1.5">
            {quickEmojis.map((emoji) => {
              const count = post.reactions?.[emoji] || 0;
              return (
                <button
                  key={emoji}
                  onClick={() => onReact(post.id, emoji)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs transition-all ${
                    count > 0
                      ? 'bg-white/10 text-white border border-white/20 font-medium'
                      : 'bg-white/5 hover:bg-white/10 text-[#888888] hover:text-white border border-white/5'
                  } active:scale-95`}
                  title={`React ${emoji}`}
                >
                  <span>{emoji}</span>
                  {count > 0 && <span className="text-[10px] font-mono">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Comment & Share buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowComments(!showComments)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-white/5 hover:bg-white/10 text-[#E0E0E0] transition-colors border border-white/10 text-[11px] uppercase tracking-wider font-medium"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{post.comments?.length || 0} Notes</span>
            </button>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-white/5 hover:bg-white/10 text-[#E0E0E0] transition-colors border border-white/10 text-[11px] uppercase tracking-wider font-medium"
              title="Copy link"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span className="text-white">Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Comment Drawer / Notes for this post */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-3 bg-[#0D0D0D] p-4 rounded-sm border border-white/5">
            <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#666666] flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-zinc-400" />
              <span>Replies & Notes</span>
            </h4>

            {post.comments && post.comments.length > 0 ? (
              <div className="space-y-2">
                {post.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 rounded-sm bg-[#161616] border border-white/5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[#888888]">
                      <span className="font-medium text-white">{comment.author}</span>
                      <span className="font-mono text-[10px] uppercase tracking-tighter">
                        {new Date(comment.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[#888888] text-xs leading-relaxed">{comment.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#666666] italic py-1">
                No replies yet. Leave a friendly note below.
              </p>
            )}

            {/* Leave a quick comment form */}
            <form onSubmit={handleCommentSubmit} className="space-y-2 pt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  className="w-1/3 px-3 py-2 rounded-sm bg-[#161616] border border-white/10 text-xs text-[#E0E0E0] placeholder-[#666666] focus:outline-none focus:border-white/30"
                />
                <input
                  type="text"
                  placeholder="Write a thought or reply..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-sm bg-[#161616] border border-white/10 text-xs text-[#E0E0E0] placeholder-[#666666] focus:outline-none focus:border-white/30"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="px-3 py-2 rounded-sm bg-white text-black font-semibold text-xs flex items-center gap-1 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* DIVIDER: h-px w-full bg-white/5 as in design HTML */}
      <div className="w-full pt-4 pb-2">
        {theme.dividerStyle === 'dashed' ? (
          <div className="w-full border-b border-dashed border-white/10" />
        ) : theme.dividerStyle === 'dotted' ? (
          <div className="w-full border-b border-dotted border-white/10" />
        ) : theme.dividerStyle === 'subtle-glow' ? (
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        ) : (
          /* Sleek minimal divider from Elegant Dark design */
          <div className="mt-2 h-px w-full bg-white/5" />
        )}
      </div>

      {/* Lightbox for viewing photos */}
      {post.type === 'image' && post.mediaUrls && (
        <MediaLightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          mediaUrls={post.mediaUrls}
          initialIndex={lightboxIndex}
          title={post.title}
          caption={post.content}
        />
      )}
    </article>
  );
};
