import React, { useState } from 'react';
import { 
  Sparkles, 
  Settings, 
  Menu, 
  X, 
  Feather, 
  Image as ImageIcon, 
  Radio, 
  Film, 
  Bookmark, 
  Search, 
  HeartHandshake,
  Layers,
  SlidersHorizontal,
  Home
} from 'lucide-react';
import { Page, ThemeConfig } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  pages: Page[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  theme: ThemeConfig;
  onOpenAdmin?: () => void;
  onOpenFriendNote: () => void;
  unreadNotesCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  pages,
  activePageId,
  onSelectPage,
  theme,
  onOpenAdmin,
  onOpenFriendNote,
  unreadNotesCount,
  searchQuery,
  onSearchChange,
  selectedFilter,
  onFilterChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const visiblePages = pages.filter((p) => p.visible);

  const getPageIcon = (iconName?: string, isHome?: boolean) => {
    if (isHome) return <Home className="w-3.5 h-3.5" />;
    switch (iconName?.toLowerCase()) {
      case 'feather':
      case 'letters':
        return <Feather className="w-3.5 h-3.5" />;
      case 'image':
      case 'memories':
        return <ImageIcon className="w-3.5 h-3.5" />;
      case 'radio':
      case 'audio':
      case 'music':
        return <Radio className="w-3.5 h-3.5" />;
      case 'film':
      case 'video':
      case 'videos':
        return <Film className="w-3.5 h-3.5" />;
      default:
        return <Bookmark className="w-3.5 h-3.5" />;
    }
  };

  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'text', label: 'Letters & Text' },
    { id: 'image', label: 'Photos' },
    { id: 'audio', label: 'Audio & Voice' },
    { id: 'video', label: 'Videos' },
  ];

  return (
    <header
      id="main-navigation"
      className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0F0F0F]/95 backdrop-blur-md transition-colors"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Title */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectPage(visiblePages[0]?.id || 'page-home')}
              className="flex items-center gap-3 text-left group focus:outline-none"
            >
              <span className="font-semibold tracking-widest text-sm uppercase text-white block group-hover:text-zinc-300 transition-colors">
                {theme.siteTitle || 'madxgaming'}
              </span>
            </button>
          </div>

          {/* Desktop Navigation Pages */}
          <nav className="hidden md:flex items-center gap-8 text-[11px] uppercase tracking-widest font-medium overflow-x-auto no-scrollbar py-1">
            {visiblePages.map((page) => {
              const isActive = activePageId === page.id;
              return (
                <button
                  key={page.id}
                  onClick={() => onSelectPage(page.id)}
                  className={`relative py-1 transition-colors flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? 'text-white'
                      : 'text-[#666666] hover:text-white'
                  }`}
                >
                  <span>{page.title}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-line"
                      className="absolute -bottom-1 left-0 right-0 h-[2px] bg-white rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons & Live Indicator */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Live Session indicator from design */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-white/5 border border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] uppercase text-[#666666] tracking-tighter font-mono">Live Session</span>
            </div>

            {/* Search filter toggle */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded border transition-colors text-xs flex items-center gap-1 ${
                showSearch || searchQuery
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'text-[#888888] hover:text-white bg-white/5 border-white/10 hover:bg-white/10'
              }`}
              title="Search & Filter"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Friend quick note button */}
            {theme.enableFriendNotes && (
              <button
                onClick={onOpenFriendNote}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#E0E0E0] transition-colors"
                title="Leave a message for your friend"
              >
                <HeartHandshake className="w-3.5 h-3.5 text-zinc-300" />
                <span className="text-[11px] uppercase tracking-wider font-medium">Note</span>
              </button>
            )}

            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded text-[#888888] hover:text-white bg-white/5 border border-white/10"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Search & Media Type Filter Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/10 py-3 space-y-2.5"
            >
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
                <input
                  type="text"
                  placeholder="Search posts, letters, audio notes, photos..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded bg-[#161616] border border-white/10 text-xs text-[#E0E0E0] placeholder-[#666666] focus:outline-none focus:border-white/30"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888888] hover:text-white p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Type chips filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                <span className="text-[10px] text-[#666666] uppercase tracking-widest font-mono pr-1">Filter:</span>
                {filterOptions.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onFilterChange(f.id)}
                    className={`px-3 py-1 rounded text-[10px] uppercase tracking-wider font-medium transition-colors shrink-0 ${
                      selectedFilter === f.id
                        ? 'bg-white text-black font-semibold'
                        : 'bg-[#161616] text-[#888888] hover:text-white hover:bg-[#1A1A1A] border border-white/5'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="md:hidden border-t border-white/10 bg-[#0F0F0F] px-4 py-4 space-y-2 shadow-2xl"
          >
            <p className="text-[10px] text-[#444444] uppercase tracking-[0.2em] font-bold px-2">
              Navigation
            </p>
            <div className="space-y-1">
              {visiblePages.map((page) => {
                const isActive = activePageId === page.id;
                return (
                  <button
                    key={page.id}
                    onClick={() => {
                      onSelectPage(page.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-xs uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'bg-white/10 text-white font-medium border border-white/10'
                        : 'text-[#888888] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {getPageIcon(page.icon, page.isHome)}
                      <span>{page.title}</span>
                    </div>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </button>
                );
              })}
            </div>

            {theme.enableFriendNotes && (
              <div className="pt-3 border-t border-white/10 flex items-center">
                <button
                  onClick={() => {
                    onOpenFriendNote();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded bg-white/5 border border-white/10 text-xs text-[#E0E0E0]"
                >
                  <HeartHandshake className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Leave Note</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
