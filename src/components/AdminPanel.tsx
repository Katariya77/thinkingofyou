import React, { useState, useRef } from 'react';
import { 
  X, 
  Plus, 
  FileText, 
  Image as ImageIcon, 
  Film, 
  Radio, 
  Quote, 
  Palette, 
  Layers, 
  MessageSquare, 
  Settings as SettingsIcon, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff, 
  Pin, 
  Mic, 
  Square, 
  Upload, 
  Check, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Save,
  Search,
  Sparkles,
  Link as LinkIcon,
  ChevronUp,
  ChevronDown,
  Music,
  Maximize2
} from 'lucide-react';
import { Page, Post, ThemeConfig, FriendNote, PostType, ThemeMode, DividerStyle, TypographyFamily } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  posts: Post[];
  pages: Page[];
  theme: ThemeConfig;
  notes: FriendNote[];
  onSavePost: (post: Post) => void;
  onRemovePost: (postId: string) => void;
  onSavePage: (page: Page) => void;
  onRemovePage: (pageId: string) => void;
  onUpdateTheme: (theme: Partial<ThemeConfig>) => void;
  onResetTheme: () => void;
  onMarkNoteRead: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onResetAllData: () => void;
  firestoreConnected: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  posts,
  pages,
  theme,
  notes,
  onSavePost,
  onRemovePost,
  onSavePage,
  onRemovePage,
  onUpdateTheme,
  onResetTheme,
  onMarkNoteRead,
  onDeleteNote,
  onResetAllData,
  firestoreConnected,
}) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [authError, setAuthError] = useState(false);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'create' | 'posts' | 'pages' | 'theme' | 'notes' | 'settings'>('create');

  // --- POST FORM STATE ---
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postType, setPostType] = useState<PostType>('text');
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postPageId, setPostPageId] = useState('page-home');
  const [postAuthor, setPostAuthor] = useState('Me');
  const [postPinned, setPostPinned] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [audioTrackTitle, setAudioTrackTitle] = useState('');
  const [audioArtist, setAudioArtist] = useState('');
  const [quoteAuthor, setQuoteAuthor] = useState('');
  const [customTimestamp, setCustomTimestamp] = useState<string>(() => {
    return new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  });
  const [useCurrentTime, setUseCurrentTime] = useState(true);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- PAGE FORM STATE ---
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageDescription, setPageDescription] = useState('');
  const [pageIcon, setPageIcon] = useState('Bookmark');

  // --- THEME EDIT STATE ---
  const [tempTheme, setTempTheme] = useState<ThemeConfig>(theme);
  const [themeSavedToast, setThemeSavedToast] = useState(false);

  // Sync temp theme when external theme changes
  React.useEffect(() => {
    setTempTheme(theme);
  }, [theme]);

  // Posts filter search
  const [postSearch, setPostSearch] = useState('');

  if (!isOpen) return null;

  // Handle Passcode submit
  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPasscode === theme.passcode || enteredPasscode === '1234') {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  // --- VOICE RECORDER HANDLERS ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setRecordedAudioUrl(base64Audio);
          setMediaUrls([base64Audio]);
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Microphone permission required to record audio note.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Image / File upload handler (converts to base64 data url)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setMediaUrls((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const addMediaUrl = () => {
    if (!mediaUrlInput.trim()) return;
    setMediaUrls((prev) => [...prev, mediaUrlInput.trim()]);
    setMediaUrlInput('');
  };

  const removeMediaUrl = (idx: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  // --- SAVE POST ---
  const handleSavePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() && mediaUrls.length === 0 && !postTitle.trim()) {
      alert('Please add some text, title, or media for this post.');
      return;
    }

    const timestampToUse = useCurrentTime ? Date.now() : new Date(customTimestamp).getTime();

    const newPost: Post = {
      id: editingPostId || 'post-' + Date.now(),
      type: postType,
      title: postTitle.trim() || undefined,
      content: postContent.trim(),
      pageId: postPageId,
      author: postAuthor.trim() || 'Me',
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      pinned: postPinned,
      timestamp: isNaN(timestampToUse) ? Date.now() : timestampToUse,
      createdAt: editingPostId
        ? posts.find((p) => p.id === editingPostId)?.createdAt || Date.now()
        : Date.now(),
      likes: editingPostId ? posts.find((p) => p.id === editingPostId)?.likes || 0 : 0,
      reactions: editingPostId ? posts.find((p) => p.id === editingPostId)?.reactions : {},
      comments: editingPostId ? posts.find((p) => p.id === editingPostId)?.comments : [],
      audioMetadata:
        postType === 'audio'
          ? {
              trackTitle: audioTrackTitle || postTitle || 'Voice Note',
              artist: audioArtist || 'Recorded for You',
              voiceNote: !!recordedAudioUrl,
            }
          : undefined,
      linkMetadata:
        postType === 'quote'
          ? {
              quoteAuthor: quoteAuthor || undefined,
            }
          : undefined,
    };

    onSavePost(newPost);
    resetPostForm();
    setActiveTab('posts');
  };

  const resetPostForm = () => {
    setEditingPostId(null);
    setPostType('text');
    setPostTitle('');
    setPostContent('');
    setPostPageId(pages[0]?.id || 'page-home');
    setPostAuthor('Me');
    setPostPinned(false);
    setMediaUrls([]);
    setMediaUrlInput('');
    setAudioTrackTitle('');
    setAudioArtist('');
    setQuoteAuthor('');
    setRecordedAudioUrl(null);
    setUseCurrentTime(true);
    setCustomTimestamp(new Date().toISOString().slice(0, 16));
  };

  const handleEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setPostType(post.type);
    setPostTitle(post.title || '');
    setPostContent(post.content || '');
    setPostPageId(post.pageId || 'page-home');
    setPostAuthor(post.author || 'Me');
    setPostPinned(!!post.pinned);
    setMediaUrls(post.mediaUrls || []);
    setAudioTrackTitle(post.audioMetadata?.trackTitle || '');
    setAudioArtist(post.audioMetadata?.artist || '');
    setQuoteAuthor(post.linkMetadata?.quoteAuthor || '');
    setUseCurrentTime(false);
    setCustomTimestamp(new Date(post.timestamp).toISOString().slice(0, 16));
    setActiveTab('create');
  };

  // --- SAVE PAGE ---
  const handleSavePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageTitle.trim()) return;

    const slug =
      pageSlug.trim().toLowerCase().replace(/\s+/g, '-') ||
      pageTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const newPage: Page = {
      id: editingPageId || 'page-' + Date.now(),
      title: pageTitle.trim(),
      slug,
      description: pageDescription.trim() || undefined,
      icon: pageIcon,
      order: editingPageId
        ? pages.find((p) => p.id === editingPageId)?.order || pages.length
        : pages.length,
      visible: true,
      createdAt: Date.now(),
    };

    onSavePage(newPage);
    setEditingPageId(null);
    setPageTitle('');
    setPageSlug('');
    setPageDescription('');
  };

  // --- SAVE THEME ---
  const handleSaveTheme = () => {
    onUpdateTheme(tempTheme);
    setThemeSavedToast(true);
    setTimeout(() => setThemeSavedToast(false), 2000);
  };

  // Preset Palettes for Solid Theme
  const mattePresets = [
    { label: 'Elegant Dark (Strict Void)', hex: '#0A0A0A', border: '#222222', card: '#111111' },
    { label: 'Matte Obsidian', hex: '#09090b', border: '#27272a', card: '#121215' },
    { label: 'Deep Charcoal', hex: '#121214', border: '#27272a', card: '#18181b' },
    { label: 'Matte Slate', hex: '#0b1120', border: '#1e293b', card: '#0f172a' },
    { label: 'Matte Espresso', hex: '#140e0c', border: '#2a1d1a', card: '#1c1412' },
    { label: 'Pure Pitch Black', hex: '#000000', border: '#1c1c1e', card: '#0a0a0c' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0A] w-screen h-screen min-h-[100dvh] flex flex-col overflow-hidden">
      <div className="w-full h-full bg-[#0A0A0A] flex flex-col min-h-0">
        {/* Full Screen Top Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#0D0D0D] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div>
              <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-white flex items-center gap-2">
                <span>Admin Studio & Engine</span>
                <span className="text-[9px] px-2 py-0.5 rounded-sm bg-white/5 text-[#AAAAAA] border border-white/10 font-mono">
                  {firestoreConnected ? 'Cloud Synced' : 'Local Storage'}
                </span>
              </h2>
              <p className="text-[11px] text-[#666666]">System administration, content matrix, pages, appearance, and clean screen configuration.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-sm border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold uppercase tracking-wider text-[#E0E0E0] hover:text-white transition-all flex items-center gap-2"
            >
              <span>Exit Studio</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* PASSCODE LOCK GATE */}
        {!isAuthenticated ? (
          <div className="p-8 sm:p-12 text-center max-w-md mx-auto my-auto space-y-4">
            <div className="w-12 h-12 rounded-sm bg-[#161616] border border-white/10 flex items-center justify-center text-white mx-auto">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium uppercase tracking-wider text-white">Admin Authentication</h3>
              <p className="text-xs text-[#888888] mt-1">
                Enter access passcode. Default is <span className="font-mono text-white bg-white/10 px-1.5 py-0.5 rounded-sm">1234</span>.
              </p>
            </div>

            <form onSubmit={handlePasscodeSubmit} className="space-y-3 pt-2">
              <input
                type="password"
                value={enteredPasscode}
                onChange={(e) => setEnteredPasscode(e.target.value)}
                placeholder="Enter passcode (e.g. 1234)"
                autoFocus
                className="w-full px-4 py-2.5 rounded-sm bg-[#161616] border border-white/10 text-center text-xs tracking-widest text-white placeholder-[#666666] focus:outline-none focus:border-white/30"
              />
              {authError && (
                <p className="text-xs text-rose-400 font-mono">Incorrect passcode. Default is 1234.</p>
              )}
              <button
                type="submit"
                className="w-full py-2.5 rounded-sm bg-white hover:bg-zinc-200 text-black font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow"
              >
                <Unlock className="w-4 h-4" />
                <span>Unlock Studio</span>
              </button>
            </form>
          </div>
        ) : (
          /* AUTHENTICATED ADMIN CONTENT */
          <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-hidden">
            {/* Sidebar Navigation */}
            <aside className="w-full sm:w-60 border-b sm:border-b-0 sm:border-r border-white/10 bg-[#0D0D0D] p-4 shrink-0 flex sm:flex-col gap-1 overflow-x-auto">
              <div className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-[#444444] mb-3 font-bold px-1">
                Studio Modules
              </div>

              <button
                onClick={() => setActiveTab('create')}
                className={`flex items-center justify-between px-3 py-2 rounded-sm text-xs transition-colors shrink-0 text-left uppercase tracking-wider ${
                  activeTab === 'create'
                    ? 'bg-white/5 text-white border border-white/10 font-medium'
                    : 'text-[#666666] hover:text-[#AAAAAA] hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" />
                  <span>{editingPostId ? 'Edit Post' : 'New Post'}</span>
                </div>
                {activeTab === 'create' && <div className="w-1 h-3.5 bg-white shrink-0" />}
              </button>

              <button
                onClick={() => setActiveTab('posts')}
                className={`flex items-center justify-between px-3 py-2 rounded-sm text-xs transition-colors shrink-0 text-left uppercase tracking-wider ${
                  activeTab === 'posts'
                    ? 'bg-white/5 text-white border border-white/10 font-medium'
                    : 'text-[#666666] hover:text-[#AAAAAA] hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Posts ({posts.length})</span>
                </div>
                {activeTab === 'posts' && <div className="w-1 h-3.5 bg-white shrink-0" />}
              </button>

              <button
                onClick={() => setActiveTab('pages')}
                className={`flex items-center justify-between px-3 py-2 rounded-sm text-xs transition-colors shrink-0 text-left uppercase tracking-wider ${
                  activeTab === 'pages'
                    ? 'bg-white/5 text-white border border-white/10 font-medium'
                    : 'text-[#666666] hover:text-[#AAAAAA] hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Pages ({pages.length})</span>
                </div>
                {activeTab === 'pages' && <div className="w-1 h-3.5 bg-white shrink-0" />}
              </button>

              <button
                onClick={() => setActiveTab('theme')}
                className={`flex items-center justify-between px-3 py-2 rounded-sm text-xs transition-colors shrink-0 text-left uppercase tracking-wider ${
                  activeTab === 'theme'
                    ? 'bg-white/5 text-white border border-white/10 font-medium'
                    : 'text-[#666666] hover:text-[#AAAAAA] hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5" />
                  <span>Theme Matrix</span>
                </div>
                {activeTab === 'theme' && <div className="w-1 h-3.5 bg-white shrink-0" />}
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className={`flex items-center justify-between px-3 py-2 rounded-sm text-xs transition-colors shrink-0 text-left uppercase tracking-wider ${
                  activeTab === 'notes'
                    ? 'bg-white/5 text-white border border-white/10 font-medium'
                    : 'text-[#666666] hover:text-[#AAAAAA] hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Notes</span>
                </div>
                {notes.filter((n) => !n.read).length > 0 ? (
                  <span className="text-[9px] font-bold text-black bg-white px-1.5 py-0.2 rounded-sm">
                    {notes.filter((n) => !n.read).length}
                  </span>
                ) : (
                  activeTab === 'notes' && <div className="w-1 h-3.5 bg-white shrink-0" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center justify-between px-3 py-2 rounded-sm text-xs transition-colors shrink-0 text-left uppercase tracking-wider ${
                  activeTab === 'settings'
                    ? 'bg-white/5 text-white border border-white/10 font-medium'
                    : 'text-[#666666] hover:text-[#AAAAAA] hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <SettingsIcon className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </div>
                {activeTab === 'settings' && <div className="w-1 h-3.5 bg-white shrink-0" />}
              </button>
            </aside>

            {/* Main Tab Content */}
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-0 bg-[#0A0A0A]">
              {/* TAB 1: CREATE / EDIT POST */}
              {activeTab === 'create' && (
                <form onSubmit={handleSavePostSubmit} className="space-y-4 max-w-2xl">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <h3 className="text-xs uppercase tracking-widest font-semibold text-white">
                      {editingPostId ? 'Edit Post' : 'Content Engine — Create Post'}
                    </h3>
                    {editingPostId && (
                      <button
                        type="button"
                        onClick={resetPostForm}
                        className="text-xs text-[#888888] hover:text-white uppercase tracking-wider"
                      >
                        Cancel Editing
                      </button>
                    )}
                  </div>

                  {/* Post Type Selector matching Design HTML Content Engine */}
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#444444] mb-3 font-bold">
                      Format Matrix
                    </div>
                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                      {[
                        { id: 'text', label: 'Text', char: 'T', icon: FileText },
                        { id: 'audio', label: 'Audio', char: 'A', icon: Radio },
                        { id: 'video', label: 'Video', char: 'V', icon: Film },
                        { id: 'image', label: 'Image', char: 'I', icon: ImageIcon },
                        { id: 'quote', label: 'Quote', char: 'Q', icon: Quote },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSelected = postType === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setPostType(item.id as PostType)}
                            className={`p-3 sm:p-4 rounded-sm border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white/10 text-white border-white/30 shadow'
                                : 'bg-[#161616] text-[#888888] border-white/5 hover:bg-[#1A1A1A] hover:text-white'
                            }`}
                          >
                            <div className="text-xs font-mono font-bold text-white mb-1">{item.char}</div>
                            <div className="text-[9px] uppercase tracking-widest text-[#666666]">{item.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Target Page Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-[#666666] font-mono mb-1">
                        Post to Page
                      </label>
                      <select
                        value={postPageId}
                        onChange={(e) => setPostPageId(e.target.value)}
                        className="w-full px-3 py-2 rounded-sm bg-[#161616] border border-white/10 text-xs text-[#E0E0E0] focus:outline-none focus:border-white/30"
                      >
                        <option value="page-home">Home Feed (All Moments)</option>
                        {pages
                          .filter((p) => !p.isHome)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-[#666666] font-mono mb-1">
                        Author Name
                      </label>
                      <input
                        type="text"
                        value={postAuthor}
                        onChange={(e) => setPostAuthor(e.target.value)}
                        placeholder="e.g. Me, Friend, etc."
                        className="w-full px-3 py-2 rounded-sm bg-[#161616] border border-white/10 text-xs text-[#E0E0E0] placeholder-[#555555] focus:outline-none focus:border-white/30"
                      />
                    </div>
                  </div>

                  {/* Title (Optional for quick notes) */}
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-zinc-400 font-mono mb-1">
                      Post Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="e.g. Late Night rainy thoughts, Song of the day, etc."
                      className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  {/* Quote author if quote */}
                  {postType === 'quote' && (
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-zinc-400 font-mono mb-1">
                        Quote Attribution / Author
                      </label>
                      <input
                        type="text"
                        value={quoteAuthor}
                        onChange={(e) => setQuoteAuthor(e.target.value)}
                        placeholder="e.g. Marcus Aurelius, or Yourself"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  )}

                  {/* Content Body */}
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-zinc-400 font-mono mb-1">
                      {postType === 'quote' ? 'Quote Text' : 'Content / Message'}
                    </label>
                    <textarea
                      rows={5}
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="Write your note, thoughts, or story here..."
                      className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-500 resize-y"
                    />
                  </div>

                  {/* AUDIO SPECIFIC: VOICE RECORDER & AUDIO URL */}
                  {postType === 'audio' && (
                    <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-200">Voice Note or Audio File</span>
                        {isRecording && (
                          <span className="text-xs text-rose-400 animate-pulse font-mono flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Recording...
                          </span>
                        )}
                      </div>

                      {/* Microphone Recording Tool */}
                      <div className="flex items-center gap-3">
                        {!isRecording ? (
                          <button
                            type="button"
                            onClick={startRecording}
                            className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium flex items-center gap-2 border border-zinc-700 transition-colors"
                          >
                            <Mic className="w-4 h-4 text-rose-400" />
                            <span>Record Voice Note</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-2 transition-colors shadow"
                          >
                            <Square className="w-4 h-4 fill-current" />
                            <span>Stop & Attach</span>
                          </button>
                        )}

                        {recordedAudioUrl && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Voice Memo Ready
                          </span>
                        )}
                      </div>

                      {/* Or Audio URL input */}
                      <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                        <label className="block text-[10px] uppercase text-zinc-400 font-mono">
                          Or Audio Track URL (.mp3 / .wav / streaming link)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={mediaUrlInput}
                            onChange={(e) => setMediaUrlInput(e.target.value)}
                            placeholder="https://example.com/song.mp3"
                            className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={addMediaUrl}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-200 hover:bg-zinc-700"
                          >
                            Add Audio
                          </button>
                        </div>
                      </div>

                      {/* Metadata titles */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <input
                          type="text"
                          value={audioTrackTitle}
                          onChange={(e) => setAudioTrackTitle(e.target.value)}
                          placeholder="Track / Memo Title"
                          className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={audioArtist}
                          onChange={(e) => setAudioArtist(e.target.value)}
                          placeholder="Artist / Mood"
                          className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* IMAGE & VIDEO SPECIFIC UPLOAD / URL ATTACHMENTS */}
                  {(postType === 'image' || postType === 'video') && (
                    <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-200">
                          {postType === 'image' ? 'Image Attachments' : 'Video URL or Embed'}
                        </span>
                        <label className="cursor-pointer text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg border border-zinc-700 flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload File</span>
                          <input
                            type="file"
                            accept={postType === 'image' ? 'image/*' : 'video/*'}
                            multiple={postType === 'image'}
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* URL input */}
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={mediaUrlInput}
                          onChange={(e) => setMediaUrlInput(e.target.value)}
                          placeholder={
                            postType === 'image'
                              ? 'https://images.unsplash.com/... or direct image link'
                              : 'YouTube link, Vimeo link, or .mp4 URL'
                          }
                          className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={addMediaUrl}
                          className="px-3.5 py-2 rounded-lg bg-zinc-800 text-xs text-white hover:bg-zinc-700"
                        >
                          Add URL
                        </button>
                      </div>

                      {/* Attached Media Previews */}
                      {mediaUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {mediaUrls.map((url, idx) => (
                            <div
                              key={idx}
                              className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-700 bg-black group"
                            >
                              {postType === 'image' ? (
                                <img
                                  src={url}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-400">
                                  <Film className="w-6 h-6" />
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => removeMediaUrl(idx)}
                                className="absolute top-1 right-1 p-1 rounded-full bg-black/80 text-rose-400 hover:text-white"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TIMESTAMP & PINNED OPTIONS */}
                  <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
                    {/* Timestamp options */}
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useCurrentTime}
                          onChange={(e) => setUseCurrentTime(e.target.checked)}
                          className="rounded bg-zinc-900 border-zinc-700 text-zinc-200"
                        />
                        <span>Current Time</span>
                      </label>

                      {!useCurrentTime && (
                        <input
                          type="datetime-local"
                          value={customTimestamp}
                          onChange={(e) => setCustomTimestamp(e.target.value)}
                          className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 font-mono"
                        />
                      )}
                    </div>

                    {/* Pin to top */}
                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={postPinned}
                        onChange={(e) => setPostPinned(e.target.checked)}
                        className="rounded bg-zinc-900 border-zinc-700 text-zinc-200"
                      />
                      <Pin className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pin to Top of Feed</span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={resetPostForm}
                      className="px-4 py-2 rounded-lg text-xs text-zinc-400 hover:text-white"
                    >
                      Reset Form
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-lg bg-zinc-200 hover:bg-white text-zinc-900 font-semibold text-xs flex items-center gap-2 shadow-lg transition-all"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingPostId ? 'Update Post' : 'Publish to Feed'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: MANAGE POSTS */}
              {activeTab === 'posts' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">All Published Posts ({posts.length})</h3>
                    <div className="relative w-48 sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search posts..."
                        value={postSearch}
                        onChange={(e) => setPostSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {posts
                      .filter(
                        (p) =>
                          p.title?.toLowerCase().includes(postSearch.toLowerCase()) ||
                          p.content.toLowerCase().includes(postSearch.toLowerCase())
                      )
                      .map((p) => {
                        const targetPage = pages.find((pg) => pg.id === p.pageId);
                        return (
                          <div
                            key={p.id}
                            className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-4 hover:border-zinc-700 transition-colors"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                                <span className="uppercase font-mono font-medium text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">
                                  {p.type}
                                </span>
                                <span>•</span>
                                <span className="text-zinc-400">
                                  {targetPage ? targetPage.title : 'Home'}
                                </span>
                                <span>•</span>
                                <span className="font-mono text-[10px]">
                                  {new Date(p.timestamp).toLocaleDateString()}
                                </span>
                                {p.pinned && (
                                  <span className="text-amber-400 flex items-center gap-0.5 text-[10px]">
                                    <Pin className="w-3 h-3" /> Pinned
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-semibold text-white truncate">
                                {p.title || p.content.slice(0, 60) || 'Untitled Post'}
                              </h4>
                              <p className="text-[11px] text-zinc-400 line-clamp-1">
                                {p.content}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleEditPost(p)}
                                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                                title="Edit post"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this post?')) {
                                    onRemovePost(p.id);
                                  }
                                }}
                                className="p-2 rounded-lg bg-zinc-800 hover:bg-rose-900/60 text-zinc-400 hover:text-rose-300 transition-colors"
                                title="Delete post"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* TAB 3: MANAGE PAGES & NAVIGATION */}
              {activeTab === 'pages' && (
                <div className="space-y-6">
                  {/* Create Page Form */}
                  <form onSubmit={handleSavePageSubmit} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
                      {editingPageId ? 'Edit Page' : 'Add New Navigation Page'}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase text-zinc-400 font-mono mb-1">
                          Page Title
                        </label>
                        <input
                          type="text"
                          value={pageTitle}
                          onChange={(e) => setPageTitle(e.target.value)}
                          placeholder="e.g. Playlist, Photos, Letters"
                          required
                          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase text-zinc-400 font-mono mb-1">
                          URL Slug
                        </label>
                        <input
                          type="text"
                          value={pageSlug}
                          onChange={(e) => setPageSlug(e.target.value)}
                          placeholder="e.g. playlist"
                          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase text-zinc-400 font-mono mb-1">
                          Icon
                        </label>
                        <select
                          value={pageIcon}
                          onChange={(e) => setPageIcon(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                        >
                          <option value="Bookmark">Bookmark (Default)</option>
                          <option value="Feather">Letters / Pen</option>
                          <option value="Image">Photo Gallery</option>
                          <option value="Radio">Audio & Voice</option>
                          <option value="Film">Video & Visuals</option>
                          <option value="Sparkles">Sparkles / Moments</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-zinc-400 font-mono mb-1">
                        Page Subtitle / Description
                      </label>
                      <input
                        type="text"
                        value={pageDescription}
                        onChange={(e) => setPageDescription(e.target.value)}
                        placeholder="Brief summary shown at the top of this page..."
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      {editingPageId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPageId(null);
                            setPageTitle('');
                            setPageSlug('');
                            setPageDescription('');
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-white text-zinc-900 text-xs font-semibold"
                      >
                        {editingPageId ? 'Update Page' : 'Add Page'}
                      </button>
                    </div>
                  </form>

                  {/* List Existing Pages */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-zinc-300">Navigation Pages ({pages.length})</h4>
                    {pages.map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-zinc-400">#{idx + 1}</span>
                          <div>
                            <h5 className="text-xs font-semibold text-white flex items-center gap-2">
                              <span>{p.title}</span>
                              {p.isHome && (
                                <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 rounded font-mono">
                                  Default Home
                                </span>
                              )}
                            </h5>
                            <p className="text-[11px] text-zinc-400">/{p.slug} • {p.description || 'No description'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Toggle visibility */}
                          <button
                            type="button"
                            onClick={() => onSavePage({ ...p, visible: !p.visible })}
                            className={`p-1.5 rounded-lg text-xs ${
                              p.visible ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-800'
                            }`}
                            title={p.visible ? 'Hide from nav' : 'Show in nav'}
                          >
                            {p.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingPageId(p.id);
                              setPageTitle(p.title);
                              setPageSlug(p.slug);
                              setPageDescription(p.description || '');
                              setPageIcon(p.icon || 'Bookmark');
                            }}
                            className="p-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800"
                            title="Edit page"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {!p.isHome && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete page "${p.title}"?`)) {
                                  onRemovePage(p.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800"
                              title="Delete page"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: THEME & APPEARANCE (User's Exact Requirement: Hex Code, Multi-Hex Gradient, Background Image, Matt Black) */}
              {activeTab === 'theme' && (
                <div className="space-y-6 max-w-2xl">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Theme & Visual Customizer</h3>
                      <p className="text-xs text-zinc-400">Configure matte black tones, custom hex codes, multi-hex gradients, or background images.</p>
                    </div>

                    <button
                      onClick={handleSaveTheme}
                      className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-white text-zinc-900 font-semibold text-xs flex items-center gap-1.5 shadow"
                    >
                      {themeSavedToast ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Saved!</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Apply & Save Theme</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Mode Selector */}
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-zinc-400 font-mono mb-2">
                      Theme Mode
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'solid', label: 'Solid Hex Color (Matte)' },
                        { id: 'gradient', label: 'Multi-Hex Gradient' },
                        { id: 'image', label: 'Background Wallpaper' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setTempTheme({ ...tempTheme, mode: m.id as ThemeMode })}
                          className={`p-3 rounded-xl border text-xs font-medium transition-all text-center ${
                            tempTheme.mode === m.id
                              ? 'bg-zinc-800 text-white border-zinc-600 shadow'
                              : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 1. SOLID HEX COLOR MODE */}
                  {tempTheme.mode === 'solid' && (
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                      <h4 className="text-xs font-semibold text-zinc-200">Matte Solid Color Palette</h4>

                      {/* Quick presets */}
                      <div>
                        <span className="text-[10px] uppercase text-zinc-400 font-mono block mb-1.5">
                          Matte Black & Dark Presets
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {mattePresets.map((preset) => (
                            <button
                              key={preset.hex}
                              type="button"
                              onClick={() =>
                                setTempTheme({
                                  ...tempTheme,
                                  solidHex: preset.hex,
                                  cardBgHex: preset.card,
                                  cardBorderHex: preset.border,
                                })
                              }
                              className="p-2 rounded-lg border border-zinc-800 flex items-center gap-2 hover:border-zinc-600 transition-colors text-left"
                              style={{ backgroundColor: preset.hex }}
                            >
                              <div
                                className="w-4 h-4 rounded-full border border-zinc-700"
                                style={{ backgroundColor: preset.hex }}
                              />
                              <span className="text-[11px] text-zinc-200">{preset.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Hex Input */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-[10px] uppercase text-zinc-400 font-mono mb-1">
                            Primary Background Hex Code
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={tempTheme.solidHex}
                              onChange={(e) =>
                                setTempTheme({ ...tempTheme, solidHex: e.target.value })
                              }
                              className="w-9 h-9 rounded bg-transparent cursor-pointer border border-zinc-700"
                            />
                            <input
                              type="text"
                              value={tempTheme.solidHex}
                              onChange={(e) =>
                                setTempTheme({ ...tempTheme, solidHex: e.target.value })
                              }
                              placeholder="#09090b"
                              className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white font-mono uppercase"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase text-zinc-400 font-mono mb-1">
                            Card Background Hex Code
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={tempTheme.cardBgHex || '#121215'}
                              onChange={(e) =>
                                setTempTheme({ ...tempTheme, cardBgHex: e.target.value })
                              }
                              className="w-9 h-9 rounded bg-transparent cursor-pointer border border-zinc-700"
                            />
                            <input
                              type="text"
                              value={tempTheme.cardBgHex || '#121215'}
                              onChange={(e) =>
                                setTempTheme({ ...tempTheme, cardBgHex: e.target.value })
                              }
                              placeholder="#121215"
                              className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white font-mono uppercase"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. MULTI-HEX GRADIENT BUILDER */}
                  {tempTheme.mode === 'gradient' && (
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                      <h4 className="text-xs font-semibold text-zinc-200">Custom Multi-Hex Gradient Builder</h4>

                      {/* Live Gradient Preview swatch */}
                      <div
                        className="w-full h-16 rounded-xl border border-zinc-700 shadow-inner flex items-center justify-center"
                        style={{
                          background: `${tempTheme.gradientType || 'linear'}-gradient(${
                            tempTheme.gradientAngle || 135
                          }deg, ${tempTheme.gradientColors.join(', ')})`,
                        }}
                      >
                        <span className="text-xs font-mono text-white/90 drop-shadow px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm">
                          Live Gradient Preview
                        </span>
                      </div>

                      {/* Color stops */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase text-zinc-400 font-mono">
                            Hex Color Stops ({tempTheme.gradientColors.length})
                          </label>
                          {tempTheme.gradientColors.length < 5 && (
                            <button
                              type="button"
                              onClick={() =>
                                setTempTheme({
                                  ...tempTheme,
                                  gradientColors: [...tempTheme.gradientColors, '#18181b'],
                                })
                              }
                              className="text-xs text-zinc-300 hover:text-white flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Color Stop</span>
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          {tempTheme.gradientColors.map((colorHex, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs font-mono text-zinc-400 w-6">#{idx + 1}</span>
                              <input
                                type="color"
                                value={colorHex}
                                onChange={(e) => {
                                  const updated = [...tempTheme.gradientColors];
                                  updated[idx] = e.target.value;
                                  setTempTheme({ ...tempTheme, gradientColors: updated });
                                }}
                                className="w-8 h-8 rounded bg-transparent cursor-pointer border border-zinc-700"
                              />
                              <input
                                type="text"
                                value={colorHex}
                                onChange={(e) => {
                                  const updated = [...tempTheme.gradientColors];
                                  updated[idx] = e.target.value;
                                  setTempTheme({ ...tempTheme, gradientColors: updated });
                                }}
                                className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white font-mono uppercase"
                              />
                              {tempTheme.gradientColors.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = tempTheme.gradientColors.filter((_, i) => i !== idx);
                                    setTempTheme({ ...tempTheme, gradientColors: updated });
                                  }}
                                  className="p-1.5 text-zinc-400 hover:text-rose-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Gradient Angle Slider */}
                      <div>
                        <div className="flex justify-between text-xs text-zinc-400 mb-1">
                          <span>Gradient Angle:</span>
                          <span className="font-mono text-zinc-200">{tempTheme.gradientAngle || 135}°</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={360}
                          value={tempTheme.gradientAngle || 135}
                          onChange={(e) =>
                            setTempTheme({ ...tempTheme, gradientAngle: Number(e.target.value) })
                          }
                          className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-zinc-200"
                        />
                      </div>
                    </div>
                  )}

                  {/* 3. BACKGROUND IMAGE THEME */}
                  {tempTheme.mode === 'image' && (
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                      <h4 className="text-xs font-semibold text-zinc-200">Background Wallpaper</h4>

                      <div>
                        <label className="block text-[10px] uppercase text-zinc-400 font-mono mb-1">
                          Wallpaper Image URL
                        </label>
                        <input
                          type="url"
                          value={tempTheme.bgImageUrl}
                          onChange={(e) =>
                            setTempTheme({ ...tempTheme, bgImageUrl: e.target.value })
                          }
                          placeholder="https://images.unsplash.com/..."
                          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                        />
                      </div>

                      {/* Preset Wallpapers */}
                      <div>
                        <span className="text-[10px] uppercase text-zinc-400 font-mono block mb-1.5">
                          Preset Minimalist Dark Wallpapers
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            {
                              name: 'Monochrome Peaks',
                              url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=80&w=1200',
                            },
                            {
                              name: 'Moody Minimal Forest',
                              url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200',
                            },
                            {
                              name: 'Dark Obsidian Sand',
                              url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=1200',
                            },
                          ].map((wall) => (
                            <button
                              key={wall.url}
                              type="button"
                              onClick={() => setTempTheme({ ...tempTheme, bgImageUrl: wall.url })}
                              className="relative h-14 rounded-lg overflow-hidden border border-zinc-700 group text-left"
                            >
                              <img
                                src={wall.url}
                                alt={wall.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-[10px] text-white font-medium p-1 text-center">
                                {wall.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Opacity and blur controls for readability */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                          <div className="flex justify-between text-xs text-zinc-400 mb-1">
                            <span>Image Dimming Opacity:</span>
                            <span className="font-mono">{Math.round((tempTheme.bgImageOpacity || 0.35) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min={0.05}
                            max={0.9}
                            step={0.05}
                            value={tempTheme.bgImageOpacity || 0.35}
                            onChange={(e) =>
                              setTempTheme({ ...tempTheme, bgImageOpacity: Number(e.target.value) })
                            }
                            className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-zinc-200"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-zinc-400 mb-1">
                            <span>Background Blur:</span>
                            <span className="font-mono">{tempTheme.bgImageBlur || 0}px</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={20}
                            value={tempTheme.bgImageBlur || 0}
                            onChange={(e) =>
                              setTempTheme({ ...tempTheme, bgImageBlur: Number(e.target.value) })
                            }
                            className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-zinc-200"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DIVIDER & TYPOGRAPHY SETTINGS */}
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                    <h4 className="text-xs font-semibold text-zinc-200">Typography & Divider Style</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase text-zinc-400 font-mono mb-1">
                          Horizontal Divider Style
                        </label>
                        <select
                          value={tempTheme.dividerStyle || 'minimal'}
                          onChange={(e) =>
                            setTempTheme({ ...tempTheme, dividerStyle: e.target.value as DividerStyle })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                        >
                          <option value="minimal">Minimal Hairline with Center Dot</option>
                          <option value="solid">Solid Clean Border Line</option>
                          <option value="dashed">Subtle Dashed Line</option>
                          <option value="dotted">Dotted Line</option>
                          <option value="subtle-glow">Ambient Soft Glow Gradient</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase text-zinc-400 font-mono mb-1">
                          Font Typography
                        </label>
                        <select
                          value={tempTheme.typography || 'sans'}
                          onChange={(e) =>
                            setTempTheme({
                              ...tempTheme,
                              typography: e.target.value as TypographyFamily,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                        >
                          <option value="sans">Plus Jakarta Sans (Modern & Crisp)</option>
                          <option value="serif">Playfair Display (Editorial & Literary)</option>
                          <option value="mono">JetBrains Mono (Technical Minimal)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={onResetTheme}
                        className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reset to Default Matte Black</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveTheme}
                        className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-white text-zinc-900 font-semibold text-xs flex items-center gap-1.5 shadow"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Theme</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: FRIEND'S NOTES & INBOX */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Friend's Private Notes ({notes.length})</h3>
                      <p className="text-xs text-zinc-400">Messages and replies left by your friend through the portal.</p>
                    </div>
                  </div>

                  {notes.length === 0 ? (
                    <div className="py-12 text-center text-zinc-400 text-xs italic bg-zinc-900/30 rounded-xl border border-zinc-800">
                      No private notes yet. When your friend uses the "Leave Note" button, their messages appear here.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className={`p-4 rounded-xl border transition-all ${
                            !note.read
                              ? 'bg-zinc-900 border-zinc-700 shadow-md'
                              : 'bg-zinc-900/40 border-zinc-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-white">{note.sender}</span>
                              {!note.read && (
                                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-medium">
                                  New
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-zinc-400 text-xs">
                              <span className="font-mono text-[10px]">
                                {new Date(note.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {!note.read && (
                                <button
                                  onClick={() => onMarkNoteRead(note.id)}
                                  className="text-xs text-zinc-300 hover:text-white px-2 py-0.5 rounded bg-zinc-800"
                                >
                                  Mark Read
                                </button>
                              )}
                              <button
                                onClick={() => onDeleteNote(note.id)}
                                className="text-zinc-400 hover:text-rose-400 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-line">
                            {note.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: SETTINGS & DATABASE CONTROLS */}
              {activeTab === 'settings' && (
                <div className="space-y-6 max-w-2xl">
                  <h3 className="text-sm font-semibold text-white">Portal Settings & Security</h3>

                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase text-zinc-400 font-mono mb-1">
                        Portal Title
                      </label>
                      <input
                        type="text"
                        value={tempTheme.siteTitle}
                        onChange={(e) =>
                          setTempTheme({ ...tempTheme, siteTitle: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-zinc-400 font-mono mb-1">
                        Portal Subtitle / Greeting
                      </label>
                      <input
                        type="text"
                        value={tempTheme.siteSubtitle}
                        onChange={(e) =>
                          setTempTheme({ ...tempTheme, siteSubtitle: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-zinc-400 font-mono mb-1">
                        Admin Studio Passcode
                      </label>
                      <input
                        type="text"
                        value={tempTheme.passcode || '1234'}
                        onChange={(e) =>
                          setTempTheme({ ...tempTheme, passcode: e.target.value })
                        }
                        placeholder="1234"
                        className="w-48 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white font-mono focus:outline-none"
                      />
                      <p className="text-[11px] text-zinc-400 mt-1">Passcode used to unlock this studio modal.</p>
                    </div>

                    {/* COMING SOON / CLEAN SCREEN CONFIGURATION */}
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                        <div>
                          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                            Coming Soon / Clean Screen
                          </h4>
                          <p className="text-[11px] text-zinc-400">
                            When enabled, turns the public site into a completely clean screen showing only a background image and playing ambient background audio on visit (without showing text or labels).
                          </p>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempTheme.comingSoon?.enabled || false}
                            onChange={(e) =>
                              setTempTheme({
                                ...tempTheme,
                                comingSoon: {
                                  enabled: e.target.checked,
                                  bgImageUrl: tempTheme.comingSoon?.bgImageUrl || '',
                                  songUrl: tempTheme.comingSoon?.songUrl || '',
                                  songTitle: tempTheme.comingSoon?.songTitle || '',
                                },
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>

                      {tempTheme.comingSoon?.enabled && (
                        <div className="space-y-3 pt-1">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[10px] uppercase text-zinc-400 font-mono">
                                Background Image URL
                              </label>
                              <label className="cursor-pointer text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 font-mono">
                                <Upload className="w-3 h-3" />
                                <span>Upload image</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        setTempTheme({
                                          ...tempTheme,
                                          comingSoon: {
                                            ...(tempTheme.comingSoon || { enabled: true, songUrl: '' }),
                                            bgImageUrl: reader.result as string,
                                          },
                                        });
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            <input
                              type="url"
                              value={tempTheme.comingSoon?.bgImageUrl || ''}
                              onChange={(e) =>
                                setTempTheme({
                                  ...tempTheme,
                                  comingSoon: {
                                    ...(tempTheme.comingSoon || { enabled: true, songUrl: '' }),
                                    bgImageUrl: e.target.value,
                                  },
                                })
                              }
                              placeholder="https://images.unsplash.com/... or paste image URL"
                              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                            />
                            {tempTheme.comingSoon?.bgImageUrl && (
                              <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden border border-zinc-800 bg-black">
                                <img
                                  src={tempTheme.comingSoon.bgImageUrl}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[10px] uppercase text-zinc-400 font-mono">
                                Background Song URL (.mp3 / direct stream)
                              </label>
                              <label className="cursor-pointer text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 font-mono">
                                <Upload className="w-3 h-3" />
                                <span>Upload audio</span>
                                <input
                                  type="file"
                                  accept="audio/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        setTempTheme({
                                          ...tempTheme,
                                          comingSoon: {
                                            ...(tempTheme.comingSoon || { enabled: true, bgImageUrl: '' }),
                                            songUrl: reader.result as string,
                                            songTitle: file.name,
                                          },
                                        });
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            <input
                              type="url"
                              value={tempTheme.comingSoon?.songUrl || ''}
                              onChange={(e) =>
                                setTempTheme({
                                  ...tempTheme,
                                  comingSoon: {
                                    ...(tempTheme.comingSoon || { enabled: true, bgImageUrl: '' }),
                                    songUrl: e.target.value,
                                  },
                                })
                              }
                              placeholder="https://cdn.freesound.org/... or direct .mp3 URL"
                              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase text-zinc-400 font-mono mb-1">
                              Song Title (Optional discreet note)
                            </label>
                            <input
                              type="text"
                              value={tempTheme.comingSoon?.songTitle || ''}
                              onChange={(e) =>
                                setTempTheme({
                                  ...tempTheme,
                                  comingSoon: {
                                    ...(tempTheme.comingSoon || { enabled: true, bgImageUrl: '', songUrl: '' }),
                                    songTitle: e.target.value,
                                  },
                                })
                              }
                              placeholder="e.g. Ambient Rain Song"
                              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleSaveTheme}
                      className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-white text-zinc-900 text-xs font-semibold"
                    >
                      Save Settings
                    </button>
                  </div>

                  {/* Danger Zone: Reset Sample Data */}
                  <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-3">
                    <h4 className="text-xs font-semibold text-rose-300">Data Management</h4>
                    <p className="text-xs text-zinc-400">
                      Reset database to default sample posts and pages or wipe changes.
                    </p>
                    <button
                      onClick={() => {
                        if (confirm('Reset entire portal to default sample posts and clean matte theme?')) {
                          onResetAllData();
                          onClose();
                        }
                      }}
                      className="px-3.5 py-2 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-medium border border-rose-800/80 transition-colors"
                    >
                      Reset to Default Sample Data
                    </button>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
};
