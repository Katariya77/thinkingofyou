export type PostType = 'text' | 'image' | 'video' | 'audio' | 'quote' | 'link';

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: number;
}

export interface Post {
  id: string;
  type: PostType;
  title?: string;
  content: string;
  pageId: string; // 'home' or page id
  mediaUrls?: string[];
  audioMetadata?: {
    trackTitle?: string;
    artist?: string;
    duration?: number;
    voiceNote?: boolean;
    waveform?: number[];
  };
  videoMetadata?: {
    provider?: 'direct' | 'youtube' | 'vimeo' | 'embed';
    embedUrl?: string;
    aspectRatio?: '16/9' | '9/16' | '4/3' | '1/1';
  };
  linkMetadata?: {
    url?: string;
    domain?: string;
    siteName?: string;
    quoteAuthor?: string;
  };
  timestamp: number; // Unix epoch ms
  formattedDateOverride?: string;
  pinned?: boolean;
  author: string;
  likes: number;
  reactions?: Record<string, number>; // emoji -> count
  comments?: Comment[];
  createdAt: number;
  updatedAt?: number;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  description?: string;
  icon?: string;
  isHome?: boolean;
  order: number;
  visible: boolean;
  createdAt: number;
}

export type ThemeMode = 'solid' | 'gradient' | 'image';
export type DividerStyle = 'minimal' | 'solid' | 'dashed' | 'dotted' | 'subtle-glow';
export type TypographyFamily = 'sans' | 'serif' | 'mono';

export interface ThemeConfig {
  mode: ThemeMode;
  solidHex: string;
  cardBgHex: string;
  cardBorderHex: string;
  gradientColors: string[]; // multi hex codes e.g. ['#09090b', '#18181b', '#000000']
  gradientAngle: number; // e.g. 135
  gradientType: 'linear' | 'radial';
  bgImageUrl: string;
  bgImageOpacity: number; // 0 to 1
  bgImageBlur: number; // 0 to 20 px
  accentColor: string;
  textColor: string;
  mutedTextColor: string;
  dividerStyle: DividerStyle;
  dividerColor: string;
  typography: TypographyFamily;
  siteTitle: string;
  siteSubtitle: string;
  passcode: string; // admin passcode
  enableReactions: boolean;
  enableFriendNotes: boolean;
  friendName: string;
  comingSoon?: {
    enabled: boolean;
    bgImageUrl: string;
    songUrl: string;
    songTitle?: string;
  };
}

export interface FriendNote {
  id: string;
  sender: string;
  message: string;
  createdAt: number;
  read: boolean;
}
