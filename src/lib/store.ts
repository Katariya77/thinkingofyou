import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc,
  deleteDoc, 
  query, 
  orderBy, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Page, Post, ThemeConfig, FriendNote } from '../types';
import { DEFAULT_PAGES, DEFAULT_POSTS, DEFAULT_THEME } from './defaultData';

const STORAGE_KEY_POSTS = 'mm_matte_posts';
const STORAGE_KEY_PAGES = 'mm_matte_pages';
const STORAGE_KEY_THEME = 'mm_matte_theme';
const STORAGE_KEY_NOTES = 'mm_matte_notes';
const STORAGE_KEY_INITIALIZED = 'mm_matte_initialized';

export function useAppStore() {
  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POSTS);
      const isInit = localStorage.getItem(STORAGE_KEY_INITIALIZED);
      if (saved !== null) {
        return JSON.parse(saved);
      }
      return isInit ? [] : DEFAULT_POSTS;
    } catch {
      return [];
    }
  });

  const [pages, setPages] = useState<Page[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PAGES);
      return saved !== null ? JSON.parse(saved) : DEFAULT_PAGES;
    } catch {
      return DEFAULT_PAGES;
    }
  });

  const [theme, setTheme] = useState<ThemeConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      return saved ? JSON.parse(saved) : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  const [notes, setNotes] = useState<FriendNote[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [firestoreConnected, setFirestoreConnected] = useState<boolean>(false);

  // Sync with Firestore: Posts
  useEffect(() => {
    let isMounted = true;
    try {
      const postsCol = collection(db, 'posts');
      const q = query(postsCol, orderBy('timestamp', 'desc'));
      
      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          if (!isMounted) return;
          const remotePosts: Post[] = [];
          snapshot.forEach((d) => {
            remotePosts.push({ id: d.id, ...(d.data() as Omit<Post, 'id'>) });
          });

          if (!snapshot.empty) {
            setPosts(remotePosts);
            localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(remotePosts));
            localStorage.setItem(STORAGE_KEY_INITIALIZED, 'true');
            setFirestoreConnected(true);
            setIsSyncing(false);
          } else {
            // Check if portal has already been initialized (or posts intentionally cleared)
            try {
              const stateDoc = await getDoc(doc(db, 'settings', 'portal_state'));
              const isAlreadyInit = (stateDoc.exists() && stateDoc.data()?.initialized) || localStorage.getItem(STORAGE_KEY_INITIALIZED) === 'true';

              if (isAlreadyInit) {
                // User intentionally deleted all posts or has zero posts -> keep empty!
                setPosts([]);
                localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify([]));
                setFirestoreConnected(true);
              } else {
                // First-time pristine setup only
                await seedInitialData();
              }
            } catch (err) {
              console.warn('Check portal_state notice:', err);
              // If error or already marked, don't respawn
              if (localStorage.getItem(STORAGE_KEY_INITIALIZED) === 'true') {
                setPosts([]);
                localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify([]));
              }
            }
            setIsSyncing(false);
          }
        },
        (error) => {
          console.warn('Firestore real-time subscription error, using local storage fallback:', error);
          if (isMounted) setIsSyncing(false);
        }
      );

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (e) {
      console.warn('Firestore initialization fallback:', e);
      setIsSyncing(false);
    }
  }, []);

  // Sync with Firestore: Pages
  useEffect(() => {
    try {
      const pagesCol = collection(db, 'pages');
      const q = query(pagesCol, orderBy('order', 'asc'));
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const remotePages: Page[] = [];
            snapshot.forEach((d) => {
              remotePages.push({ id: d.id, ...(d.data() as Omit<Page, 'id'>) });
            });
            setPages(remotePages);
            localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(remotePages));
          }
        },
        (err) => console.warn('Pages sync error:', err)
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn('Pages firestore fallback:', e);
    }
  }, []);

  // Sync with Firestore: Theme
  useEffect(() => {
    try {
      const themeDoc = doc(db, 'settings', 'theme');
      const unsubscribe = onSnapshot(
        themeDoc,
        (snapshot) => {
          if (snapshot.exists()) {
            const remoteTheme = snapshot.data() as ThemeConfig;
            setTheme(remoteTheme);
            localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(remoteTheme));
          }
        },
        (err) => console.warn('Theme sync error:', err)
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn('Theme firestore fallback:', e);
    }
  }, []);

  // Sync with Firestore: Friend Notes
  useEffect(() => {
    try {
      const notesCol = collection(db, 'friendNotes');
      const q = query(notesCol, orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteNotes: FriendNote[] = [];
            snapshot.forEach((d) => {
              remoteNotes.push({ id: d.id, ...(d.data() as Omit<FriendNote, 'id'>) });
            });
            setNotes(remoteNotes);
            localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(remoteNotes));
          }
        },
        (err) => console.warn('Notes sync error:', err)
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn('Notes firestore fallback:', e);
    }
  }, []);

  // Initial data seeder helper
  const seedInitialData = async () => {
    try {
      const batch = writeBatch(db);
      
      DEFAULT_POSTS.forEach((p) => {
        const postRef = doc(db, 'posts', p.id);
        batch.set(postRef, p);
      });

      DEFAULT_PAGES.forEach((pg) => {
        const pageRef = doc(db, 'pages', pg.id);
        batch.set(pageRef, pg);
      });

      const themeRef = doc(db, 'settings', 'theme');
      batch.set(themeRef, DEFAULT_THEME);

      const stateRef = doc(db, 'settings', 'portal_state');
      batch.set(stateRef, { initialized: true, seededAt: Date.now() });

      await batch.commit();
      localStorage.setItem(STORAGE_KEY_INITIALIZED, 'true');
      setFirestoreConnected(true);
    } catch (err) {
      console.warn('Seeding firestore error, continuing with local store:', err);
    }
  };

  // --- ACTIONS ---

  // Posts
  const savePost = async (post: Post) => {
    // 1. Update state & local storage immediately
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === post.id);
      let updated: Post[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = post;
      } else {
        updated = [post, ...prev];
      }
      localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(updated));
      localStorage.setItem(STORAGE_KEY_INITIALIZED, 'true');
      return updated;
    });

    // 2. Persist to Firestore
    try {
      const postRef = doc(db, 'posts', post.id);
      await setDoc(postRef, post, { merge: true });
      await setDoc(doc(db, 'settings', 'portal_state'), { initialized: true }, { merge: true });
    } catch (e) {
      console.warn('Could not persist post to firestore:', e);
    }
  };

  const removePost = async (postId: string) => {
    // 1. Update state & local storage immediately
    setPosts((prev) => {
      const updated = prev.filter((p) => p.id !== postId);
      localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(updated));
      localStorage.setItem(STORAGE_KEY_INITIALIZED, 'true');
      return updated;
    });

    // 2. Delete from Firestore permanently
    try {
      await deleteDoc(doc(db, 'posts', postId));
      await setDoc(doc(db, 'settings', 'portal_state'), { initialized: true }, { merge: true });
    } catch (e) {
      console.warn('Could not delete post from firestore:', e);
    }
  };

  const reactToPost = async (postId: string, emoji: string) => {
    setPosts((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== postId) return p;
        const currentReactions = p.reactions || {};
        const count = (currentReactions[emoji] || 0) + 1;
        const newPost = {
          ...p,
          likes: (p.likes || 0) + 1,
          reactions: { ...currentReactions, [emoji]: count }
        };
        // Persist
        try {
          setDoc(doc(db, 'posts', postId), newPost, { merge: true });
        } catch {
          // ignore
        }
        return newPost;
      });
      localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(updated));
      return updated;
    });
  };

  const addCommentToPost = async (postId: string, author: string, text: string) => {
    const newComment = {
      id: 'cmt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      author: author.trim() || 'Friend',
      text: text.trim(),
      createdAt: Date.now(),
    };

    setPosts((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== postId) return p;
        const comments = [...(p.comments || []), newComment];
        const newPost = { ...p, comments };
        try {
          setDoc(doc(db, 'posts', postId), newPost, { merge: true });
        } catch {}
        return newPost;
      });
      localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(updated));
      return updated;
    });
  };

  // Pages
  const savePage = async (page: Page) => {
    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === page.id);
      let updated: Page[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = page;
      } else {
        updated = [...prev, page];
      }
      localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(updated));
      return updated;
    });

    try {
      await setDoc(doc(db, 'pages', page.id), page, { merge: true });
    } catch (e) {
      console.warn('Could not persist page to firestore:', e);
    }
  };

  const removePage = async (pageId: string) => {
    setPages((prev) => {
      const updated = prev.filter((p) => p.id !== pageId);
      localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(updated));
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'pages', pageId));
    } catch (e) {
      console.warn('Could not delete page from firestore:', e);
    }
  };

  // Theme
  const updateTheme = async (newTheme: Partial<ThemeConfig>) => {
    const fullTheme = { ...theme, ...newTheme };
    setTheme(fullTheme);
    localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(fullTheme));

    try {
      await setDoc(doc(db, 'settings', 'theme'), fullTheme, { merge: true });
    } catch (e) {
      console.warn('Could not persist theme to firestore:', e);
    }
  };

  const resetTheme = async () => {
    setTheme(DEFAULT_THEME);
    localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(DEFAULT_THEME));
    try {
      await setDoc(doc(db, 'settings', 'theme'), DEFAULT_THEME);
    } catch (e) {
      console.warn('Could not reset theme in firestore:', e);
    }
  };

  // Friend Notes
  const sendFriendNote = async (sender: string, message: string) => {
    const note: FriendNote = {
      id: 'note-' + Date.now(),
      sender: sender.trim() || 'Your Friend',
      message: message.trim(),
      createdAt: Date.now(),
      read: false,
    };

    setNotes((prev) => {
      const updated = [note, ...prev];
      localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(updated));
      return updated;
    });

    try {
      await setDoc(doc(db, 'friendNotes', note.id), note);
    } catch (e) {
      console.warn('Could not save note to firestore:', e);
    }
  };

  const markNoteRead = async (noteId: string) => {
    setNotes((prev) => {
      const updated = prev.map((n) => (n.id === noteId ? { ...n, read: true } : n));
      localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(updated));
      return updated;
    });

    try {
      await setDoc(doc(db, 'friendNotes', noteId), { read: true }, { merge: true });
    } catch {}
  };

  const deleteFriendNote = async (noteId: string) => {
    setNotes((prev) => {
      const updated = prev.filter((n) => n.id !== noteId);
      localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(updated));
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'friendNotes', noteId));
    } catch {}
  };

  // Reset entire database to defaults
  const resetAllData = async () => {
    setPosts(DEFAULT_POSTS);
    setPages(DEFAULT_PAGES);
    setTheme(DEFAULT_THEME);
    setNotes([]);

    localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(DEFAULT_POSTS));
    localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(DEFAULT_PAGES));
    localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(DEFAULT_THEME));
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify([]));

    await seedInitialData();
  };

  return {
    posts,
    pages,
    theme,
    notes,
    isSyncing,
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
    deleteFriendNote,
    resetAllData,
  };
}
