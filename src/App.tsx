import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from './lib/store';
import { Navbar } from './components/Navbar';
import { PostCard } from './components/PostCard';
import { AdminPanel } from './components/AdminPanel';
import { FriendNoteModal } from './components/FriendNoteModal';
import { CleanScreen } from './components/CleanScreen';
import { 
  Sparkles, 
  ArrowUp, 
  Heart, 
  Clock, 
  Radio, 
  Film, 
  Image as ImageIcon, 
  FileText,
  Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const {
    posts,
    pages,
    theme,
    notes,
    firestoreConnected,
    savePost,
    removePost,
    reactToPost,
    addCommentToPost,
    savePage,
    removePage,
    updateTheme,
    resetTheme,
    sendFriendNote,
    markNoteRead,
    deleteNote,
    resetAllData,
  } = useAppStore() as any;

  // Active navigation page
  const [activePageId, setActivePageId] = useState<string>('page-home');
  
  // Search & Type Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // Modals - Check URL address (/admin or #admin) on startup
  const [adminOpen, setAdminOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/\/+$/, '');
      const hash = window.location.hash.toLowerCase();
      return path === '/admin' || hash === '#admin';
    }
    return false;
  });
  const [friendNoteOpen, setFriendNoteOpen] = useState<boolean>(false);

  // URL route listener for /admin
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname.replace(/\/+$/, '');
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || hash === '#admin') {
        setAdminOpen(true);
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Sync URL when closing admin panel
  const handleCloseAdmin = () => {
    setAdminOpen(false);
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/\/+$/, '');
      if (path === '/admin') {
        window.history.pushState({}, '', '/');
      } else if (window.location.hash === '#admin') {
        window.history.pushState({}, '', window.location.pathname);
      }
    }
  };

  // Current page object
  const activePage = useMemo(() => {
    return pages.find((p: any) => p.id === activePageId) || pages[0] || {
      id: 'page-home',
      slug: 'home',
      title: 'All Moments',
      description: 'A chronological timeline of text, audio, images, and videos.',
      isHome: true,
    };
  }, [pages, activePageId]);

  // Unread friend notes count
  const unreadNotesCount = useMemo(() => {
    return notes?.filter((n: any) => !n.read).length || 0;
  }, [notes]);

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    let list = [...posts];

    // Page filter: If not on home page, filter by pageId
    if (!activePage.isHome && activePageId !== 'page-home') {
      list = list.filter((p) => p.pageId === activePageId || p.pageId === activePage.slug);
    }

    // Type filter
    if (selectedFilter !== 'all') {
      list = list.filter((p) => p.type === selectedFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.author?.toLowerCase().includes(q)
      );
    }

    // Sort: Pinned first, then newest timestamp
    return list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.timestamp - a.timestamp;
    });
  }, [posts, activePage, activePageId, selectedFilter, searchQuery]);

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Compute background styling based on theme
  const getThemeBackgroundStyle = (): React.CSSProperties => {
    if (theme.mode === 'gradient') {
      const angle = theme.gradientAngle || 135;
      const colors = theme.gradientColors?.length ? theme.gradientColors.join(', ') : '#09090b, #18181b';
      return {
        background: `${theme.gradientType || 'linear'}-gradient(${angle}deg, ${colors})`,
        minHeight: '100vh',
      };
    }

    if (theme.mode === 'image' && theme.bgImageUrl) {
      return {
        backgroundColor: theme.solidHex || '#09090b',
        minHeight: '100vh',
      };
    }

    // Default: solid matte black / hex
    return {
      backgroundColor: theme.solidHex || '#09090b',
      minHeight: '100vh',
    };
  };

  // Font family class
  const getFontFamilyClass = () => {
    switch (theme.typography) {
      case 'serif':
        return 'font-serif-display';
      case 'mono':
        return 'font-mono-code';
      default:
        return 'font-sans';
    }
  };

  const isComingSoonActive = theme.comingSoon?.enabled;

  return (
    <>
      {isComingSoonActive ? (
        <CleanScreen
          bgImageUrl={theme.comingSoon?.bgImageUrl}
          songUrl={theme.comingSoon?.songUrl}
          songTitle={theme.comingSoon?.songTitle}
        />
      ) : (
        <div
          id="matte-portal-root"
          style={getThemeBackgroundStyle()}
          className={`min-h-screen text-zinc-200 transition-colors duration-500 relative flex flex-col ${getFontFamilyClass()}`}
        >
          {/* Background Image Overlay if Image Theme Mode is active */}
          {theme.mode === 'image' && theme.bgImageUrl && (
            <div
              className="fixed inset-0 pointer-events-none -z-10 bg-cover bg-center bg-no-repeat transition-all duration-500"
              style={{
                backgroundImage: `url(${theme.bgImageUrl})`,
                opacity: theme.bgImageOpacity ?? 0.35,
                filter: `blur(${theme.bgImageBlur ?? 0}px)`,
              }}
            />
          )}

      {/* Subtle top ambient matte vignette */}
      <div className="fixed top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/40 to-transparent pointer-events-none -z-10" />

      {/* Sticky Top Navigation Bar */}
      <Navbar
        pages={pages}
        activePageId={activePageId}
        onSelectPage={(id) => {
          setActivePageId(id);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        theme={theme}
        onOpenAdmin={() => setAdminOpen(true)}
        onOpenFriendNote={() => setFriendNoteOpen(true)}
        unreadNotesCount={unreadNotesCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Page Hero Header */}
        <section
          id="page-header"
          className="space-y-3 pb-6 border-b border-white/10 transition-colors"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#666666]">
                  {activePage.isHome ? 'Archive Timeline' : `Page / ${activePage.slug}`}
                </span>
                <span className="w-1 h-1 rounded-full bg-[#444444]" />
                <span className="text-[10px] font-mono text-[#666666]">
                  {filteredPosts.length} {filteredPosts.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                {activePage.title}
              </h1>

              {activePage.description && (
                <p className="text-xs sm:text-sm text-[#888888] leading-relaxed max-w-xl">
                  {activePage.description}
                </p>
              )}
            </div>
          </div>

          {/* Quick Page Jump Pills (if on home page) */}
          {activePage.isHome && pages.length > 1 && (
            <div className="flex items-center gap-1.5 pt-3 overflow-x-auto no-scrollbar">
              <span className="text-[10px] text-[#666666] uppercase tracking-widest font-mono pr-1">Jump to:</span>
              {pages
                .filter((p: any) => !p.isHome && p.visible)
                .map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePageId(p.id)}
                    className="px-2.5 py-1 rounded-sm bg-[#161616] hover:bg-[#1A1A1A] border border-white/5 text-[10px] uppercase tracking-wider text-[#888888] hover:text-white transition-colors shrink-0"
                  >
                    {p.title}
                  </button>
                ))}
            </div>
          )}
        </section>

        {/* Post Items Feed */}
        <section id="posts-stream" className="space-y-2">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                theme={theme}
                onReact={reactToPost}
                onAddComment={addCommentToPost}
              />
            ))
          ) : (
            /* Empty State */
            <div className="py-16 text-center space-y-4 rounded-sm bg-[#0D0D0D] border border-white/5 p-8">
              <div className="w-12 h-12 rounded-sm bg-[#161616] border border-white/10 flex items-center justify-center text-[#888888] mx-auto">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-white uppercase tracking-wider">No items found</h3>
                <p className="text-xs text-[#888888] max-w-sm mx-auto leading-relaxed">
                  {searchQuery || selectedFilter !== 'all'
                    ? 'No posts matched your current search or filter criteria.'
                    : `No entries in ${activePage.title} yet.`}
                </p>
              </div>

              {(searchQuery || selectedFilter !== 'all') && (
                <div className="flex items-center justify-center pt-2">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedFilter('all');
                    }}
                    className="px-3 py-1.5 rounded-sm bg-[#161616] hover:bg-[#1A1A1A] text-xs text-[#E0E0E0] border border-white/10 uppercase tracking-wider"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Back to top floating pill */}
        {filteredPosts.length > 3 && (
          <div className="flex justify-center pt-8 pb-4">
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-[#161616] hover:bg-[#1A1A1A] border border-white/10 text-xs text-[#888888] hover:text-white uppercase tracking-widest transition-all shadow-lg"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Back to Top</span>
            </button>
          </div>
        )}
      </main>

      {/* Minimalist Matte Footer */}
      <footer className="w-full border-t border-white/10 bg-[#0F0F0F] py-6 transition-colors mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#666666]">
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center text-black font-bold text-[9px]">
              {(theme.siteTitle || 'M')[0]}
            </div>
            <span className="text-[#E0E0E0] uppercase tracking-wider font-semibold">{theme.siteTitle}</span>
            <span>•</span>
            <span className="font-mono text-[11px]">Personal Archive</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] uppercase tracking-wider">
            {theme.enableFriendNotes && (
              <button
                onClick={() => setFriendNoteOpen(true)}
                className="text-[#888888] hover:text-white transition-colors"
              >
                Leave a Note
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  )}

  {/* Admin Studio Full Screen Page - Accessed via URL (/admin) */}
  <AdminPanel
        isOpen={adminOpen}
        onClose={handleCloseAdmin}
        posts={posts}
        pages={pages}
        theme={theme}
        notes={notes}
        onSavePost={savePost}
        onRemovePost={removePost}
        onSavePage={savePage}
        onRemovePage={removePage}
        onUpdateTheme={updateTheme}
        onResetTheme={resetTheme}
        onMarkNoteRead={markNoteRead}
        onDeleteNote={deleteNote}
        onResetAllData={resetAllData}
        firestoreConnected={firestoreConnected}
      />

      {/* Friend Note / Message Modal */}
      <FriendNoteModal
        isOpen={friendNoteOpen}
        onClose={() => setFriendNoteOpen(false)}
        onSend={sendFriendNote}
        friendName={theme.friendName}
      />
    </>
  );
}
