import React, { useState } from 'react';
import { X, Send, Heart, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FriendNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (sender: string, message: string) => void;
  friendName?: string;
}

export const FriendNoteModal: React.FC<FriendNoteModalProps> = ({
  isOpen,
  onClose,
  onSend,
  friendName = 'Friend',
}) => {
  const [sender, setSender] = useState('');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    onSend(sender || friendName, message);
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      setMessage('');
      onClose();
    }, 1600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-sm p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-white text-black font-bold flex items-center justify-center text-xs">
              <Heart className="w-4 h-4 fill-black text-black" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">Leave a Private Note</h3>
              <p className="text-[11px] text-[#666666]">Sent directly to the admin creator.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-[#888888] hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSent ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-8 text-center space-y-2"
          >
            <CheckCircle2 className="w-10 h-10 text-white mx-auto" />
            <h4 className="text-sm font-medium uppercase tracking-wider text-white">Note Delivered</h4>
            <p className="text-xs text-[#888888]">Your message has been safely received in the studio.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#666666] font-mono mb-1">
                Your Name / Nickname
              </label>
              <input
                type="text"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="e.g. Alex, Friend, etc."
                className="w-full px-3.5 py-2.5 rounded-sm bg-[#161616] border border-white/10 text-xs text-[#E0E0E0] placeholder-[#555555] focus:outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#666666] font-mono mb-1">
                Message / Thought
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write a message, recommendation, or note for your friend..."
                className="w-full px-3.5 py-2.5 rounded-sm bg-[#161616] border border-white/10 text-xs text-[#E0E0E0] placeholder-[#555555] focus:outline-none focus:border-white/30 resize-none"
                required
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-sm text-xs uppercase tracking-wider text-[#888888] hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!message.trim()}
                className="px-4 py-2 rounded-sm bg-white hover:bg-zinc-200 text-black font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Note</span>
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
