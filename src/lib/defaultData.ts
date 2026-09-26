import { Page, Post, ThemeConfig } from '../types';

export const DEFAULT_THEME: ThemeConfig = {
  mode: 'solid',
  solidHex: '#0A0A0A', // Elegant Dark deep canvas
  cardBgHex: '#161616',
  cardBorderHex: '#222222',
  gradientColors: ['#0A0A0A', '#0F0F0F', '#141414'],
  gradientAngle: 135,
  gradientType: 'linear',
  bgImageUrl: '',
  bgImageOpacity: 0.35,
  bgImageBlur: 0,
  accentColor: '#FFFFFF',
  textColor: '#E0E0E0',
  mutedTextColor: '#888888',
  dividerStyle: 'minimal',
  dividerColor: '#1F1F1F',
  typography: 'sans',
  siteTitle: 'madxgaming',
  siteSubtitle: 'A quiet, personal space curated for my closest friend.',
  passcode: '1234',
  enableReactions: true,
  enableFriendNotes: true,
  friendName: 'My Friend',
  comingSoon: {
    enabled: false,
    bgImageUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=80&w=1600&auto=format&fit=crop',
    songUrl: 'https://cdn.freesound.org/previews/518/518873_11504938-lq.mp3',
    songTitle: 'Ambient Night Serenade',
    songArtist: 'Curated for You',
    lyricsText: '',
  },
};

export const DEFAULT_PAGES: Page[] = [
  {
    id: 'page-home',
    slug: 'home',
    title: 'All Moments',
    description: 'A chronological timeline of text, audio, images, and videos.',
    icon: 'Sparkles',
    isHome: true,
    order: 0,
    visible: true,
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'page-letters',
    slug: 'letters',
    title: 'Letters & Notes',
    description: 'Long-form thoughts, reflections, and quiet words.',
    icon: 'Feather',
    order: 1,
    visible: true,
    createdAt: Date.now() - 86400000 * 6,
  },
  {
    id: 'page-memories',
    slug: 'memories',
    title: 'Memories',
    description: 'Photographs, captures, and snapshots in time.',
    icon: 'Image',
    order: 2,
    visible: true,
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'page-audio',
    slug: 'audio',
    title: 'Voice & Sounds',
    description: 'Voice notes, shared songs, and ambient recordings.',
    icon: 'Radio',
    order: 3,
    visible: true,
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'page-videos',
    slug: 'videos',
    title: 'Visuals & Clips',
    description: 'Video clips, snippets, and recommendations.',
    icon: 'Film',
    order: 4,
    visible: true,
    createdAt: Date.now() - 86400000 * 3,
  },
];

export const DEFAULT_POSTS: Post[] = [
  {
    id: 'post-1',
    type: 'text',
    title: 'A dedicated corner for you',
    content: `I built this quiet, minimalist space so we have our own archive away from the noise of regular social media. Here, I'll be sharing unhurried thoughts, songs that remind me of our conversations, photos from daily life, and little audio notes whenever inspiration strikes.\n\nTake your time to browse around. Everything here is for you.`,
    pageId: 'page-letters',
    timestamp: Date.now() - 1000 * 60 * 60 * 3, // 3 hours ago
    pinned: true,
    author: 'Me',
    likes: 4,
    reactions: { '🖤': 3, '✨': 5, '☕': 2 },
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
    comments: [
      {
        id: 'c1',
        author: 'Friend',
        text: 'This matte design looks so clean! Thank you for making this.',
        createdAt: Date.now() - 1000 * 60 * 45,
      },
    ],
  },
  {
    id: 'post-2',
    type: 'audio',
    title: 'Late Night Rainy Thought',
    content: 'Recorded this short voice memo on a quiet rainy evening. Wanted to share the ambiance and something I was thinking about.',
    pageId: 'page-audio',
    mediaUrls: [
      'https://cdn.freesound.org/previews/531/531947_71257-lq.mp3' // soothing ambient sample
    ],
    audioMetadata: {
      trackTitle: 'Midnight Rain & Ambient Chords',
      artist: 'Recorded for You',
      duration: 78,
      voiceNote: true,
      waveform: [20, 35, 45, 60, 30, 80, 95, 40, 70, 85, 60, 45, 90, 100, 75, 50, 65, 80, 40, 30, 60, 75, 90, 45, 30, 20],
    },
    timestamp: Date.now() - 1000 * 60 * 60 * 18, // 18 hours ago
    author: 'Me',
    likes: 6,
    reactions: { '🎧': 4, '🌧️': 3, '🤍': 6 },
    createdAt: Date.now() - 1000 * 60 * 60 * 18,
  },
  {
    id: 'post-3',
    type: 'image',
    title: 'Monochrome City Fog',
    content: 'Caught this view yesterday as the fog rolled in over the skyline. The natural contrast had this matte texture that felt timeless.',
    pageId: 'page-memories',
    mediaUrls: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=80&w=1200&auto=format&fit=crop'
    ],
    timestamp: Date.now() - 1000 * 60 * 60 * 36, // 1.5 days ago
    author: 'Me',
    likes: 8,
    reactions: { '📷': 5, '🖤': 7 },
    createdAt: Date.now() - 1000 * 60 * 60 * 36,
  },
  {
    id: 'post-4',
    type: 'video',
    title: 'Serene Ocean Tide Snippet',
    content: 'A peaceful look at the gentle waves. Plug your headphones in for the relaxing audio track.',
    pageId: 'page-videos',
    mediaUrls: [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
    ],
    videoMetadata: {
      provider: 'direct',
      aspectRatio: '16/9',
    },
    timestamp: Date.now() - 1000 * 60 * 60 * 60, // 2.5 days ago
    author: 'Me',
    likes: 5,
    reactions: { '🌊': 4, '✨': 3 },
    createdAt: Date.now() - 1000 * 60 * 60 * 60,
  },
  {
    id: 'post-5',
    type: 'quote',
    title: 'Words to remember',
    content: '"Simplicity is not about having less. It is about making room for what matters most."',
    pageId: 'page-letters',
    linkMetadata: {
      quoteAuthor: 'Anonymous Minimalist',
    },
    timestamp: Date.now() - 1000 * 60 * 60 * 90, // ~3.5 days ago
    author: 'Me',
    likes: 12,
    reactions: { '📖': 5, '💡': 4, '🖤': 9 },
    createdAt: Date.now() - 1000 * 60 * 60 * 90,
  },
];
