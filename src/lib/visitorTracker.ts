import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  writeBatch,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { VisitorLog, IgnoredVisitorsConfig, IgnoredRule } from '../types';

const STORAGE_KEY_DEVICE_ID = '_matte_device_id';
const STORAGE_KEY_BROWSER_ID = '_matte_browser_id';
const STORAGE_KEY_LOCAL_LOGS = 'mm_matte_visitor_logs';
const STORAGE_KEY_IGNORE_SELF = '_matte_ignore_self_device';
const STORAGE_KEY_IGNORED_CONFIG = '_matte_ignored_config';
const SESSION_LOGGED_KEY = '_matte_session_logged_time';

// Generate or retrieve persistent Device ID
export function getOrCreateDeviceId(): string {
  try {
    let devId = localStorage.getItem(STORAGE_KEY_DEVICE_ID);
    if (!devId) {
      const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
      const navInfo = `${navigator.hardwareConcurrency || 4}-${navigator.language}`;
      const hash = simpleHash(`${screenInfo}-${navInfo}-${navigator.userAgent}`);
      devId = `DEV-${hash.toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      localStorage.setItem(STORAGE_KEY_DEVICE_ID, devId);
    }
    return devId;
  } catch {
    return `DEV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }
}

// Generate or retrieve persistent Browser ID
export function getOrCreateBrowserId(): string {
  try {
    let brwId = localStorage.getItem(STORAGE_KEY_BROWSER_ID);
    if (!brwId) {
      brwId = `BRW-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      localStorage.setItem(STORAGE_KEY_BROWSER_ID, brwId);
    }
    return brwId;
  } catch {
    return `BRW-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }
}

export function getCurrentDeviceDetails(): { deviceId: string; browserId: string } {
  return {
    deviceId: getOrCreateDeviceId(),
    browserId: getOrCreateBrowserId(),
  };
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36).substring(0, 6);
}

// Parse device, OS, and browser name
export function parseClientInfo() {
  const ua = navigator.userAgent;
  let browserName = 'Browser';
  let osName = 'Unknown OS';
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';

  // Device type
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) {
    deviceType = 'mobile';
  } else {
    deviceType = 'desktop';
  }

  // OS
  if (/Windows NT 10.0/i.test(ua)) osName = 'Windows 10/11';
  else if (/Windows NT/i.test(ua)) osName = 'Windows';
  else if (/Mac OS X/i.test(ua)) osName = 'macOS';
  else if (/Android/i.test(ua)) osName = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) osName = 'iOS';
  else if (/Linux/i.test(ua)) osName = 'Linux';
  else if (/CrOS/i.test(ua)) osName = 'ChromeOS';

  // Browser
  if (/Edg\//i.test(ua)) browserName = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Chromium|Edg/i.test(ua)) browserName = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browserName = 'Safari';
  else if (/Firefox\//i.test(ua)) browserName = 'Firefox';
  else if (/OPR|Opera\//i.test(ua)) browserName = 'Opera';

  const screenResolution = `${window.screen.width}x${window.screen.height}`;

  return { browserName, osName, deviceType, screenResolution };
}

// Reverse geocode exact GPS coordinates to human-readable City, State, Country
export async function reverseGeocodeCoordinates(latitude: number, longitude: number): Promise<{
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  locality?: string;
  formattedAddress?: string;
}> {
  // Provider 1: BigDataCloud (Free, client-side, zero auth, fast, precise)
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision;
      const region = data.principalSubdivision || data.state;
      const country = data.countryName;
      const countryCode = data.countryCode;
      const locality = data.locality;
      
      const parts = [locality, city, region, country].filter((p, i, a) => p && a.indexOf(p) === i);
      const formattedAddress = parts.join(', ');

      if (city || country) {
        return { city, region, country, countryCode, locality, formattedAddress };
      }
    }
  } catch {}

  // Provider 2: OpenStreetMap Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || addr.county;
      const region = addr.state || addr.region;
      const country = addr.country;
      const countryCode = addr.country_code ? addr.country_code.toUpperCase() : undefined;
      const formattedAddress = [city, region, country].filter(Boolean).join(', ') || data.display_name;

      if (city || country) {
        return { city, region, country, countryCode, formattedAddress };
      }
    }
  } catch {}

  return {};
}

// Fetch IP and general geo location with multi-endpoint fallback
async function fetchIpAndLocation(): Promise<{
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  isp?: string;
}> {
  // Provider 1: ipwho.is
  try {
    const res = await fetch('https://ipwho.is/', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false && data.ip) {
        return {
          ip: data.ip,
          city: data.city || undefined,
          region: data.region || undefined,
          country: data.country || undefined,
          countryCode: data.country_code || undefined,
          isp: data.connection?.isp || data.connection?.org || undefined,
        };
      }
    }
  } catch {}

  // Provider 2: freeipapi.com
  try {
    const res = await fetch('https://freeipapi.com/api/json', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.ipAddress) {
        return {
          ip: data.ipAddress,
          city: data.cityName || undefined,
          region: data.regionName || undefined,
          country: data.countryName || undefined,
          countryCode: data.countryCode || undefined,
        };
      }
    }
  } catch {}

  // Provider 3: ipapi.co
  try {
    const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip && !data.error) {
        return {
          ip: data.ip,
          city: data.city || undefined,
          region: data.region || undefined,
          country: data.country_name || undefined,
          countryCode: data.country_code || undefined,
          isp: data.org || undefined,
        };
      }
    }
  } catch {}

  // Fallback Provider 4: ipify (IP only)
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (res.ok) {
      const data = await res.json();
      return { ip: data.ip || 'Client IP' };
    }
  } catch {}

  return { ip: 'Client IP' };
}

// Request exact GPS location via browser API + Reverse Geocoding
function requestExactLocation(): Promise<{
  exactLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    mapsUrl: string;
    formattedAddress?: string;
  } | null;
  permission: 'granted' | 'denied' | 'unavailable';
  geoInfo?: {
    city?: string;
    region?: string;
    country?: string;
    countryCode?: string;
    formattedAddress?: string;
  };
}> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ exactLocation: null, permission: 'unavailable' });
      return;
    }

    let hasResolved = false;
    const timer = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        resolve({ exactLocation: null, permission: 'denied' });
      }
    }, 6500);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (hasResolved) return;
        hasResolved = true;
        clearTimeout(timer);

        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy);
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        // Attempt reverse geocoding on the exact GPS coordinates
        let geoInfo: any = undefined;
        try {
          geoInfo = await reverseGeocodeCoordinates(lat, lng);
        } catch {}

        const formattedAddress = 
          geoInfo?.formattedAddress || 
          `${lat}° N/S, ${lng}° E/W (±${accuracy}m)`;

        resolve({
          exactLocation: {
            latitude: lat,
            longitude: lng,
            accuracy,
            mapsUrl,
            formattedAddress,
          },
          permission: 'granted',
          geoInfo,
        });
      },
      (error) => {
        if (hasResolved) return;
        hasResolved = true;
        clearTimeout(timer);
        const permState = error.code === 1 ? 'denied' : 'unavailable';
        resolve({ exactLocation: null, permission: permState });
      },
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 60000,
      }
    );
  });
}

// -------------------------------------------------------------
// IGNORED DEVICES & FILTER MANAGEMENT
// -------------------------------------------------------------

export function isCurrentDeviceIgnored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_IGNORE_SELF) === 'true';
  } catch {
    return false;
  }
}

export function getCachedIgnoredConfig(): IgnoredVisitorsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_IGNORED_CONFIG);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {
    ignoredDeviceIds: [],
    ignoredBrowserIds: [],
    ignoredIps: [],
    rules: [],
  };
}

export function subscribeToIgnoredConfig(callback: (config: IgnoredVisitorsConfig) => void): () => void {
  try {
    const ignoredDocRef = doc(db, 'settings', 'ignoredVisitors');
    const unsubscribe = onSnapshot(
      ignoredDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const remoteConfig = snapshot.data() as IgnoredVisitorsConfig;
          const config: IgnoredVisitorsConfig = {
            ignoredDeviceIds: remoteConfig.ignoredDeviceIds || [],
            ignoredBrowserIds: remoteConfig.ignoredBrowserIds || [],
            ignoredIps: remoteConfig.ignoredIps || [],
            rules: remoteConfig.rules || [],
          };
          localStorage.setItem(STORAGE_KEY_IGNORED_CONFIG, JSON.stringify(config));

          // Also check if current device ID or browser ID is in ignored rules
          const currentDev = getOrCreateDeviceId();
          const currentBrw = getOrCreateBrowserId();
          if (
            config.ignoredDeviceIds.includes(currentDev) ||
            config.ignoredBrowserIds.includes(currentBrw)
          ) {
            localStorage.setItem(STORAGE_KEY_IGNORE_SELF, 'true');
          }

          callback(config);
        } else {
          const cached = getCachedIgnoredConfig();
          callback(cached);
        }
      },
      (err) => {
        console.warn('Ignored visitors sync notice:', err);
        callback(getCachedIgnoredConfig());
      }
    );
    return unsubscribe;
  } catch (e) {
    callback(getCachedIgnoredConfig());
    return () => {};
  }
}

export async function toggleIgnoreCurrentDevice(ignore: boolean, label?: string): Promise<void> {
  const currentDev = getOrCreateDeviceId();
  const currentBrw = getOrCreateBrowserId();

  if (ignore) {
    localStorage.setItem(STORAGE_KEY_IGNORE_SELF, 'true');
    // Add rule for device ID and browser ID to Firestore
    await addIgnoredRule('deviceId', currentDev, label || 'Admin Device (Self)');
    await addIgnoredRule('browserId', currentBrw, label ? `${label} (Browser)` : 'Admin Browser (Self)');
  } else {
    localStorage.removeItem(STORAGE_KEY_IGNORE_SELF);
    // Remove rules
    const config = getCachedIgnoredConfig();
    const updatedRules = config.rules.filter(
      (r) => r.value !== currentDev && r.value !== currentBrw
    );
    await syncIgnoredConfigToFirestore(updatedRules);
  }
}

export async function addIgnoredRule(
  type: 'deviceId' | 'browserId' | 'ip',
  value: string,
  label?: string
): Promise<void> {
  const cleanVal = value.trim();
  if (!cleanVal) return;

  const current = getCachedIgnoredConfig();
  if (current.rules.some((r) => r.type === type && r.value.toLowerCase() === cleanVal.toLowerCase())) {
    return; // already exists
  }

  const newRule: IgnoredRule = {
    id: `ign-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type,
    value: cleanVal,
    label: label?.trim() || undefined,
    createdAt: Date.now(),
  };

  const updatedRules = [newRule, ...current.rules];
  await syncIgnoredConfigToFirestore(updatedRules);
}

export async function removeIgnoredRule(ruleId: string): Promise<void> {
  const current = getCachedIgnoredConfig();
  const ruleToRemove = current.rules.find((r) => r.id === ruleId);
  const updatedRules = current.rules.filter((r) => r.id !== ruleId);

  // If the removed rule was our self device, unflag self
  if (ruleToRemove) {
    const currentDev = getOrCreateDeviceId();
    const currentBrw = getOrCreateBrowserId();
    if (ruleToRemove.value === currentDev || ruleToRemove.value === currentBrw) {
      localStorage.removeItem(STORAGE_KEY_IGNORE_SELF);
    }
  }

  await syncIgnoredConfigToFirestore(updatedRules);
}

export async function clearAllIgnoredRules(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY_IGNORE_SELF);
  await syncIgnoredConfigToFirestore([]);
}

async function syncIgnoredConfigToFirestore(rules: IgnoredRule[]): Promise<void> {
  const ignoredDeviceIds = Array.from(new Set(rules.filter((r) => r.type === 'deviceId').map((r) => r.value)));
  const ignoredBrowserIds = Array.from(new Set(rules.filter((r) => r.type === 'browserId').map((r) => r.value)));
  const ignoredIps = Array.from(new Set(rules.filter((r) => r.type === 'ip').map((r) => r.value)));

  const config: IgnoredVisitorsConfig = {
    ignoredDeviceIds,
    ignoredBrowserIds,
    ignoredIps,
    rules,
  };

  localStorage.setItem(STORAGE_KEY_IGNORED_CONFIG, JSON.stringify(config));

  try {
    const docRef = doc(db, 'settings', 'ignoredVisitors');
    await setDoc(docRef, config);
  } catch (e) {
    console.warn('Could not sync ignored config to Firestore:', e);
  }
}

// -------------------------------------------------------------
// MAIN TRACK VISITOR FUNCTION
// -------------------------------------------------------------

export async function trackVisitor(
  pathName: string = window.location.pathname,
  customTitle?: string
): Promise<VisitorLog | null> {
  try {
    // 1. Check if current device is flagged as ignored
    if (isCurrentDeviceIgnored()) {
      return null;
    }

    const deviceId = getOrCreateDeviceId();
    const browserId = getOrCreateBrowserId();

    // 2. Check cached ignored config for Device ID or Browser ID
    const ignoredConfig = getCachedIgnoredConfig();
    if (
      ignoredConfig.ignoredDeviceIds.includes(deviceId) ||
      ignoredConfig.ignoredBrowserIds.includes(browserId)
    ) {
      localStorage.setItem(STORAGE_KEY_IGNORE_SELF, 'true');
      return null;
    }

    // 3. Avoid logging duplicate hits within 15 seconds for the same tab session
    const lastLogTime = sessionStorage.getItem(SESSION_LOGGED_KEY);
    const now = Date.now();
    if (lastLogTime && now - parseInt(lastLogTime, 10) < 15000) {
      return null;
    }
    sessionStorage.setItem(SESSION_LOGGED_KEY, now.toString());

    const { browserName, osName, deviceType, screenResolution } = parseClientInfo();

    // Fetch IP and Geo in parallel with asking for exact location
    const [ipGeo, geoResult] = await Promise.all([
      fetchIpAndLocation(),
      requestExactLocation(),
    ]);

    // 4. Check if resolved IP is in ignored list
    if (ipGeo.ip && ignoredConfig.ignoredIps.includes(ipGeo.ip)) {
      return null;
    }

    // Merge exact GPS reverse-geocoded location with IP geolocation
    const city = geoResult.geoInfo?.city || ipGeo.city || undefined;
    const region = geoResult.geoInfo?.region || ipGeo.region || undefined;
    const country = geoResult.geoInfo?.country || ipGeo.country || undefined;
    const countryCode = geoResult.geoInfo?.countryCode || ipGeo.countryCode || undefined;

    const logId = `log-${now}-${Math.random().toString(36).substring(2, 7)}`;

    const logEntry: VisitorLog = {
      id: logId,
      deviceId,
      browserId,
      ip: ipGeo.ip,
      city,
      region,
      country,
      countryCode,
      isp: ipGeo.isp,
      exactLocation: geoResult.exactLocation,
      locationPermission: geoResult.permission,
      userAgent: navigator.userAgent,
      browserName,
      osName,
      deviceType,
      screenResolution,
      path: pathName || '/',
      pageTitle: customTitle || document.title || 'Home',
      referrer: document.referrer ? new URL(document.referrer, window.location.origin).hostname : 'Direct / Bookmark',
      timestamp: now,
      createdAt: now,
    };

    // 5. Cache locally
    try {
      const existing = localStorage.getItem(STORAGE_KEY_LOCAL_LOGS);
      const parsed: VisitorLog[] = existing ? JSON.parse(existing) : [];
      const updated = [logEntry, ...parsed.slice(0, 499)];
      localStorage.setItem(STORAGE_KEY_LOCAL_LOGS, JSON.stringify(updated));
    } catch {}

    // 6. Persist to Firestore collection `visitorLogs`
    try {
      const logRef = doc(db, 'visitorLogs', logId);
      await setDoc(logRef, logEntry);
    } catch (e) {
      console.warn('Firestore visitor tracking write notice:', e);
    }

    return logEntry;
  } catch (err) {
    console.warn('Visitor tracking error:', err);
    return null;
  }
}

// Real-time listener for visitor logs in the Admin Panel
export function subscribeToVisitorLogs(
  onLogsUpdate: (logs: VisitorLog[]) => void,
  onError?: (error: unknown) => void
) {
  try {
    const logsCol = collection(db, 'visitorLogs');
    const q = query(logsCol, orderBy('timestamp', 'desc'), limit(500));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const remoteLogs: VisitorLog[] = [];
        snapshot.forEach((d) => {
          remoteLogs.push({ id: d.id, ...(d.data() as Omit<VisitorLog, 'id'>) });
        });

        // Merge with local logs if any
        let merged = remoteLogs;
        try {
          const localStr = localStorage.getItem(STORAGE_KEY_LOCAL_LOGS);
          if (localStr) {
            const localLogs: VisitorLog[] = JSON.parse(localStr);
            const idMap = new Map<string, VisitorLog>();
            remoteLogs.forEach((l) => idMap.set(l.id, l));
            localLogs.forEach((l) => {
              if (!idMap.has(l.id)) idMap.set(l.id, l);
            });
            merged = Array.from(idMap.values()).sort((a, b) => b.timestamp - a.timestamp);
          }
        } catch {}

        onLogsUpdate(merged);
      },
      (err) => {
        console.warn('Visitor logs subscription notice, using local cache:', err);
        if (onError) onError(err);
        try {
          const localStr = localStorage.getItem(STORAGE_KEY_LOCAL_LOGS);
          if (localStr) {
            onLogsUpdate(JSON.parse(localStr));
          }
        } catch {}
      }
    );

    return unsubscribe;
  } catch (e) {
    console.warn('Failed to subscribe to visitor logs:', e);
    try {
      const localStr = localStorage.getItem(STORAGE_KEY_LOCAL_LOGS);
      if (localStr) {
        onLogsUpdate(JSON.parse(localStr));
      }
    } catch {}
    return () => {};
  }
}

// Clear all logs action
export async function clearAllVisitorLogs(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY_LOCAL_LOGS);
    const logsCol = collection(db, 'visitorLogs');
    const snap = await getDocs(query(logsCol, limit(300)));
    const batch = writeBatch(db);
    snap.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (e) {
    console.warn('Clear visitor logs error:', e);
  }
}
