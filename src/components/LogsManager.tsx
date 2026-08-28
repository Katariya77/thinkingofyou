import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Search, 
  MapPin, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Clock, 
  Calendar, 
  ExternalLink, 
  Copy, 
  Check, 
  Trash2, 
  Download, 
  RefreshCw, 
  Filter, 
  Globe, 
  Compass, 
  UserCheck, 
  Layers, 
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Shield,
  Plus,
  X,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { VisitorLog, IgnoredVisitorsConfig, IgnoredRule } from '../types';
import { 
  subscribeToVisitorLogs, 
  clearAllVisitorLogs,
  getCurrentDeviceDetails,
  isCurrentDeviceIgnored,
  toggleIgnoreCurrentDevice,
  subscribeToIgnoredConfig,
  addIgnoredRule,
  removeIgnoredRule,
  clearAllIgnoredRules,
  reverseGeocodeCoordinates
} from '../lib/visitorTracker';
import { motion, AnimatePresence } from 'motion/react';

type TimeRangeFilter = 'all' | '1h' | '6h' | '24h' | 'today' | 'yesterday' | '7d';

export const LogsManager: React.FC = () => {
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('all');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'desktop' | 'mobile' | 'tablet'>('all');
  const [gpsFilter, setGpsFilter] = useState<'all' | 'granted' | 'denied'>('all');
  const [selectedUserKey, setSelectedUserKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  // Ignored devices & rules state
  const [ignoredConfig, setIgnoredConfig] = useState<IgnoredVisitorsConfig>({
    ignoredDeviceIds: [],
    ignoredBrowserIds: [],
    ignoredIps: [],
    rules: [],
  });
  const [selfIgnored, setSelfIgnored] = useState<boolean>(() => isCurrentDeviceIgnored());
  const [showIgnoreModal, setShowIgnoreModal] = useState<boolean>(false);
  const [newRuleType, setNewRuleType] = useState<'deviceId' | 'browserId' | 'ip'>('deviceId');
  const [newRuleValue, setNewRuleValue] = useState<string>('');
  const [newRuleLabel, setNewRuleLabel] = useState<string>('');
  const [isAddingRule, setIsAddingRule] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Dynamic geocoding cache for coordinates without explicit city
  const [geoCache, setGeoCache] = useState<Record<string, string>>({});

  const currentDevice = useMemo(() => getCurrentDeviceDetails(), []);

  // Subscribe to real-time logs
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToVisitorLogs(
      (newLogs) => {
        setLogs(newLogs);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Subscribe to ignored visitors config
  useEffect(() => {
    const unsub = subscribeToIgnoredConfig((cfg) => {
      setIgnoredConfig(cfg);
      setSelfIgnored(isCurrentDeviceIgnored());
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Dynamic reverse geocode helper for logs that have GPS coordinates but no city string
  useEffect(() => {
    logs.forEach(async (log) => {
      if (log.exactLocation?.latitude && log.exactLocation?.longitude && (!log.city || log.city === 'Unknown' || log.city === 'Unknown Location')) {
        const key = `${log.exactLocation.latitude},${log.exactLocation.longitude}`;
        if (!geoCache[key]) {
          try {
            const res = await reverseGeocodeCoordinates(log.exactLocation.latitude, log.exactLocation.longitude);
            if (res.city || res.formattedAddress) {
              setGeoCache((prev) => ({
                ...prev,
                [key]: [res.city, res.region, res.country].filter(Boolean).join(', ') || res.formattedAddress || 'Resolved GPS Location',
              }));
            }
          } catch {}
        }
      }
    });
  }, [logs, geoCache]);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleClearLogs = async () => {
    setIsClearing(true);
    await clearAllVisitorLogs();
    setLogs([]);
    setIsClearing(false);
    setShowClearConfirm(false);
    showToast('Visitor logs cleared successfully.');
  };

  // Toggle Self-Device Ignore
  const handleToggleSelfIgnore = async () => {
    const next = !selfIgnored;
    setSelfIgnored(next);
    await toggleIgnoreCurrentDevice(next, 'Admin (This Device)');
    showToast(next ? 'This device is now IGNORED from all visitor logs.' : 'This device will now be recorded in visitor logs.');
  };

  // Add custom ignore rule
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleValue.trim()) return;
    setIsAddingRule(true);
    await addIgnoredRule(newRuleType, newRuleValue.trim(), newRuleLabel.trim() || undefined);
    setNewRuleValue('');
    setNewRuleLabel('');
    setIsAddingRule(false);
    showToast(`Rule added to ignore list.`);
  };

  // Remove ignore rule
  const handleRemoveRule = async (ruleId: string) => {
    await removeIgnoredRule(ruleId);
    showToast('Rule removed from ignore list.');
  };

  // Quick Ignore directly from a Log Card
  const handleQuickIgnore = async (type: 'deviceId' | 'browserId' | 'ip', value: string, label?: string) => {
    await addIgnoredRule(type, value, label || `Visitor ${type}`);
    showToast(`Added ${type} (${value.slice(0, 14)}...) to ignore list.`);
  };

  // Timestamp boundaries calculation
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();

  const startOfYesterday = new Date(startOfTodayMs - 24 * 60 * 60 * 1000);
  const startOfYesterdayMs = startOfYesterday.getTime();

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const logTime = log.timestamp || log.createdAt;

      // 1. Time range filter
      if (timeRange === '1h' && now - logTime > 60 * 60 * 1000) return false;
      if (timeRange === '6h' && now - logTime > 6 * 60 * 60 * 1000) return false;
      if (timeRange === '24h' && now - logTime > 24 * 60 * 60 * 1000) return false;
      if (timeRange === 'today' && logTime < startOfTodayMs) return false;
      if (timeRange === 'yesterday' && (logTime < startOfYesterdayMs || logTime >= startOfTodayMs)) return false;
      if (timeRange === '7d' && now - logTime > 7 * 24 * 60 * 60 * 1000) return false;

      // 2. Device filter
      if (deviceFilter !== 'all' && log.deviceType !== deviceFilter) return false;

      // 3. GPS filter
      if (gpsFilter === 'granted' && log.locationPermission !== 'granted') return false;
      if (gpsFilter === 'denied' && log.locationPermission === 'granted') return false;

      // 4. Selected single user identifier
      if (selectedUserKey) {
        const matchesUser = log.deviceId === selectedUserKey || log.browserId === selectedUserKey || log.ip === selectedUserKey;
        if (!matchesUser) return false;
      }

      // 5. Search query (browserId, deviceId, ip, city, country, browser, os, path)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = 
          log.browserId.toLowerCase().includes(q) ||
          log.deviceId.toLowerCase().includes(q) ||
          log.ip.toLowerCase().includes(q) ||
          (log.city && log.city.toLowerCase().includes(q)) ||
          (log.country && log.country.toLowerCase().includes(q)) ||
          (log.region && log.region.toLowerCase().includes(q)) ||
          log.browserName.toLowerCase().includes(q) ||
          log.osName.toLowerCase().includes(q) ||
          log.path.toLowerCase().includes(q) ||
          (log.pageTitle && log.pageTitle.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [logs, timeRange, deviceFilter, gpsFilter, selectedUserKey, searchQuery, now, startOfTodayMs, startOfYesterdayMs]);

  // Overall & Timeframe Metric calculations
  const totalViews = logs.length;
  const viewsToday = logs.filter((l) => (l.timestamp || l.createdAt) >= startOfTodayMs).length;
  const viewsYesterday = logs.filter((l) => {
    const t = l.timestamp || l.createdAt;
    return t >= startOfYesterdayMs && t < startOfTodayMs;
  }).length;
  const viewsLast1h = logs.filter((l) => now - (l.timestamp || l.createdAt) <= 60 * 60 * 1000).length;
  const viewsLast24h = logs.filter((l) => now - (l.timestamp || l.createdAt) <= 24 * 60 * 60 * 1000).length;

  const uniqueDevices = useMemo(() => new Set(logs.map((l) => l.deviceId)).size, [logs]);
  const uniqueBrowsers = useMemo(() => new Set(logs.map((l) => l.browserId)).size, [logs]);
  const uniqueIps = useMemo(() => new Set(logs.map((l) => l.ip)).size, [logs]);
  const gpsGrantedCount = useMemo(() => logs.filter((l) => l.locationPermission === 'granted').length, [logs]);

  // Single User Stats (if a search or user is active)
  const activeUserStats = useMemo(() => {
    const activeKey = selectedUserKey || (searchQuery.trim().length > 3 ? searchQuery.trim() : null);
    if (!activeKey) return null;

    const userLogs = logs.filter(
      (l) => l.deviceId === activeKey || l.browserId === activeKey || l.ip === activeKey
    );

    if (userLogs.length === 0) return null;

    const uToday = userLogs.filter((l) => (l.timestamp || l.createdAt) >= startOfTodayMs).length;
    const uYesterday = userLogs.filter((l) => {
      const t = l.timestamp || l.createdAt;
      return t >= startOfYesterdayMs && t < startOfTodayMs;
    }).length;
    const uLast1h = userLogs.filter((l) => now - (l.timestamp || l.createdAt) <= 60 * 60 * 1000).length;
    const uLast6h = userLogs.filter((l) => now - (l.timestamp || l.createdAt) <= 6 * 60 * 60 * 1000).length;
    const uLast24h = userLogs.filter((l) => now - (l.timestamp || l.createdAt) <= 24 * 60 * 60 * 1000).length;
    const uLast7d = userLogs.filter((l) => now - (l.timestamp || l.createdAt) <= 7 * 24 * 60 * 60 * 1000).length;

    const firstSeen = Math.min(...userLogs.map((l) => l.timestamp || l.createdAt));
    const lastSeen = Math.max(...userLogs.map((l) => l.timestamp || l.createdAt));
    const locations = Array.from(new Set(userLogs.map((l) => [l.city, l.country].filter(Boolean).join(', ')).filter(Boolean)));
    const sample = userLogs[0];

    return {
      key: activeKey,
      totalViews: userLogs.length,
      viewsToday: uToday,
      viewsYesterday: uYesterday,
      viewsLast1h: uLast1h,
      viewsLast6h: uLast6h,
      viewsLast24h: uLast24h,
      viewsLast7d: uLast7d,
      firstSeen,
      lastSeen,
      locations,
      sample,
    };
  }, [logs, selectedUserKey, searchQuery, now, startOfTodayMs, startOfYesterdayMs]);

  // Export CSV
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = [
      'Timestamp',
      'Date & Time',
      'Device ID',
      'Browser ID',
      'IP Address',
      'City',
      'Region',
      'Country',
      'Latitude',
      'Longitude',
      'GPS Accuracy (m)',
      'GPS Permission',
      'Browser',
      'OS',
      'Device Type',
      'Screen Resolution',
      'Path Visited',
      'Referrer',
    ];

    const rows = filteredLogs.map((l) => [
      l.timestamp,
      `"${new Date(l.timestamp).toISOString()}"`,
      `"${l.deviceId}"`,
      `"${l.browserId}"`,
      `"${l.ip}"`,
      `"${l.city || ''}"`,
      `"${l.region || ''}"`,
      `"${l.country || ''}"`,
      l.exactLocation?.latitude || '',
      l.exactLocation?.longitude || '',
      l.exactLocation?.accuracy || '',
      l.locationPermission,
      `"${l.browserName}"`,
      `"${l.osName}"`,
      `"${l.deviceType}"`,
      `"${l.screenResolution}"`,
      `"${l.path}"`,
      `"${l.referrer}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `visitor-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Status Toast */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-emerald-400/60 hover:text-emerald-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Stream Status Banner & Realtime Counters */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#111111] border border-white/10 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white uppercase tracking-wider">Live View Count & Location Telemetry</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Realtime Active
                </span>
              </div>
              <p className="text-[11px] text-[#777777]">
                Capturing visitor views, device IDs, browser identifiers, IP endpoints, and exact Google Map GPS coordinates.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Ignore My Current Device Toggle Button */}
            <button
              onClick={handleToggleSelfIgnore}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
                selfIgnored
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                  : 'bg-white/5 border-white/10 text-[#AAAAAA] hover:text-white hover:bg-white/10'
              }`}
              title={selfIgnored ? 'Click to re-enable tracking for this device' : 'Click to ignore this device from all visitor logs'}
            >
              {selfIgnored ? (
                <>
                  <ShieldOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>My Device Ignored: ON</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 text-[#888888]" />
                  <span>Ignore My Device: OFF</span>
                </>
              )}
            </button>

            {/* Manage Ignored Devices Modal Button */}
            <button
              onClick={() => setShowIgnoreModal(true)}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-[#CCCCCC] hover:text-white transition-all flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Ignore Rules ({ignoredConfig.rules.length})</span>
            </button>

            <button
              onClick={handleManualRefresh}
              className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#AAAAAA] hover:text-white transition-all ${
                isRefreshing ? 'animate-spin text-white' : ''
              }`}
              title="Refresh Logs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleExportCsv}
              disabled={filteredLogs.length === 0}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-[#CCCCCC] hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={logs.length === 0}
              className="px-3 py-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 border border-red-800/30 text-xs font-mono text-red-400 hover:text-red-300 transition-all flex items-center gap-1.5 disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Logs</span>
            </button>
          </div>
        </div>

        {/* Real-time Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#666666] flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              Total Views
            </span>
            <div className="text-xl font-bold font-mono text-white">{totalViews}</div>
            <span className="text-[10px] text-[#888888] font-mono">All-time visits</span>
          </div>

          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#666666] flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400" />
              Last 1 Hour
            </span>
            <div className="text-xl font-bold font-mono text-blue-400">{viewsLast1h}</div>
            <span className="text-[10px] text-[#888888] font-mono">Live traffic</span>
          </div>

          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#666666] flex items-center gap-1">
              <Calendar className="w-3 h-3 text-purple-400" />
              Today
            </span>
            <div className="text-xl font-bold font-mono text-purple-400">{viewsToday}</div>
            <span className="text-[10px] text-[#888888] font-mono">Since 12:00 AM</span>
          </div>

          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#666666] flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              Yesterday
            </span>
            <div className="text-xl font-bold font-mono text-amber-400">{viewsYesterday}</div>
            <span className="text-[10px] text-[#888888] font-mono">Previous day</span>
          </div>

          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#666666] flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-cyan-400" />
              Unique Devices
            </span>
            <div className="text-xl font-bold font-mono text-cyan-400">{uniqueDevices}</div>
            <span className="text-[10px] text-[#888888] font-mono">Hardware IDs</span>
          </div>

          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#666666] flex items-center gap-1">
              <Globe className="w-3 h-3 text-rose-400" />
              Unique IPs
            </span>
            <div className="text-xl font-bold font-mono text-rose-400">{uniqueIps}</div>
            <span className="text-[10px] text-[#888888] font-mono">Network nodes</span>
          </div>

          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#666666] flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-400" />
              GPS Verified
            </span>
            <div className="text-xl font-bold font-mono text-emerald-400">{gpsGrantedCount}</div>
            <span className="text-[10px] text-[#888888] font-mono">High precision</span>
          </div>
        </div>
      </div>

      {/* IGNORED RULES & EXCLUSION MODAL */}
      <AnimatePresence>
        {showIgnoreModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#141414] border border-white/15 rounded-2xl p-6 space-y-5 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Ignore Users, Devices & IP Addresses</h3>
                    <p className="text-xs text-[#888888]">
                      Excluded devices and IPs will be completely omitted from visitor logging and live view counts.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIgnoreModal(false)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#888888] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Current Device Box */}
              <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-white flex items-center gap-2">
                    <span>Your Current Device Status</span>
                    {selfIgnored ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                        IGNORED (Hidden from logs)
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                        TRACKED
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleToggleSelfIgnore}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                      selfIgnored
                        ? 'bg-amber-500 hover:bg-amber-400 text-black'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {selfIgnored ? 'Un-ignore This Device' : 'Ignore My Device Now'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#888888]">
                  <div className="truncate">
                    Device ID: <span className="text-white font-medium">{currentDevice.deviceId}</span>
                  </div>
                  <div className="truncate">
                    Browser ID: <span className="text-white font-medium">{currentDevice.browserId}</span>
                  </div>
                </div>
              </div>

              {/* Add New Rule Form */}
              <form onSubmit={handleAddRule} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3 shrink-0">
                <div className="text-xs font-semibold text-white uppercase tracking-wider">Add Custom Ignore Rule</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-[#777777] font-mono mb-1">Target Type</label>
                    <select
                      value={newRuleType}
                      onChange={(e) => setNewRuleType(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-lg bg-black border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    >
                      <option value="deviceId">Device ID (DEV-...)</option>
                      <option value="browserId">Browser ID (BRW-...)</option>
                      <option value="ip">IP Address (e.g. 1.2.3.4)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#777777] font-mono mb-1">Identifier / Value</label>
                    <input
                      type="text"
                      value={newRuleValue}
                      onChange={(e) => setNewRuleValue(e.target.value)}
                      placeholder={newRuleType === 'ip' ? '192.168.1.1' : 'DEV-XXXX...'}
                      className="w-full px-3 py-1.5 rounded-lg bg-black border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400 font-mono placeholder:text-[#555555]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#777777] font-mono mb-1">Label / Description</label>
                    <input
                      type="text"
                      value={newRuleLabel}
                      onChange={(e) => setNewRuleLabel(e.target.value)}
                      placeholder="e.g. My iPhone, Office WiFi"
                      className="w-full px-3 py-1.5 rounded-lg bg-black border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400 font-mono placeholder:text-[#555555]"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isAddingRule || !newRuleValue.trim()}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs font-mono transition-all flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Ignore List</span>
                  </button>
                </div>
              </form>

              {/* Active Rules List */}
              <div className="flex-1 overflow-y-auto space-y-2 min-h-[140px] pr-1">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-semibold text-[#AAAAAA] uppercase font-mono">
                    Active Ignored Rules ({ignoredConfig.rules.length})
                  </span>
                  {ignoredConfig.rules.length > 0 && (
                    <button
                      onClick={async () => {
                        if (confirm('Clear all ignored rules?')) {
                          await clearAllIgnoredRules();
                          showToast('All ignore rules cleared.');
                        }
                      }}
                      className="text-[10px] font-mono text-red-400 hover:underline"
                    >
                      Clear All Rules
                    </button>
                  )}
                </div>

                {ignoredConfig.rules.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#666666] font-mono border border-dashed border-white/10 rounded-xl">
                    No active ignore rules. Use the form above or toggle "Ignore My Device" to prevent logging your visits.
                  </div>
                ) : (
                  ignoredConfig.rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between gap-3 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-amber-300 uppercase font-semibold shrink-0">
                          {rule.type}
                        </span>
                        <div className="min-w-0">
                          <div className="text-white font-medium truncate">{rule.value}</div>
                          {rule.label && <div className="text-[10px] text-[#777777] truncate">{rule.label}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-[#555555]">
                          {new Date(rule.createdAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => handleRemoveRule(rule.id)}
                          className="p-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-800/30"
                          title="Remove Rule"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SINGLE USER DEEP-DIVE INSPECTOR (If active) */}
      {activeUserStats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-gradient-to-r from-blue-950/30 via-purple-950/20 to-black border border-blue-500/30 space-y-3 shadow-lg"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-blue-500/20">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <span>Single User Analytics</span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono truncate max-w-[200px] sm:max-w-none">
                    {activeUserStats.key}
                  </span>
                </div>
                <div className="text-[10px] text-[#AAAAAA] font-mono">
                  First seen {new Date(activeUserStats.firstSeen).toLocaleDateString()} • Last active {getRelativeTimeString(activeUserStats.lastSeen)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleQuickIgnore('deviceId', activeUserStats.key, 'Ignored from Inspector')}
                className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-mono text-amber-300 flex items-center gap-1"
                title="Add this identifier to the ignore list"
              >
                <ShieldOff className="w-3 h-3 text-amber-400" />
                <span>Ignore This User</span>
              </button>

              <button
                onClick={() => {
                  setSelectedUserKey(null);
                  setSearchQuery('');
                }}
                className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-mono text-white"
              >
                Clear User Filter
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 font-mono text-center">
            <div className="p-2 rounded bg-black/40 border border-white/5">
              <div className="text-[9px] uppercase text-[#777777]">Total Visits</div>
              <div className="text-base font-bold text-white">{activeUserStats.totalViews}</div>
            </div>
            <div className="p-2 rounded bg-black/40 border border-white/5">
              <div className="text-[9px] uppercase text-[#777777]">Last 1 Hour</div>
              <div className="text-base font-bold text-blue-400">{activeUserStats.viewsLast1h}</div>
            </div>
            <div className="p-2 rounded bg-black/40 border border-white/5">
              <div className="text-[9px] uppercase text-[#777777]">Last 6 Hours</div>
              <div className="text-base font-bold text-purple-400">{activeUserStats.viewsLast6h}</div>
            </div>
            <div className="p-2 rounded bg-black/40 border border-white/5">
              <div className="text-[9px] uppercase text-[#777777]">Today</div>
              <div className="text-base font-bold text-emerald-400">{activeUserStats.viewsToday}</div>
            </div>
            <div className="p-2 rounded bg-black/40 border border-white/5">
              <div className="text-[9px] uppercase text-[#777777]">Yesterday</div>
              <div className="text-base font-bold text-amber-400">{activeUserStats.viewsYesterday}</div>
            </div>
            <div className="p-2 rounded bg-black/40 border border-white/5">
              <div className="text-[9px] uppercase text-[#777777]">Last 7 Days</div>
              <div className="text-base font-bold text-rose-400">{activeUserStats.viewsLast7d}</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* SEARCH AND FILTER TOOLBAR */}
      <div className="p-3 sm:p-4 rounded-xl bg-[#111111] border border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Device ID, Browser ID, IP, City, Country, or Page Path..."
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-black border border-white/10 text-xs text-white focus:outline-none focus:border-white/30 font-mono placeholder:text-[#555555]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#777777] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Time range buttons */}
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-black border border-white/10 text-xs font-mono">
            {(['all', '1h', '6h', '24h', 'today', 'yesterday', '7d'] as TimeRangeFilter[]).map((tr) => (
              <button
                key={tr}
                onClick={() => setTimeRange(tr)}
                className={`px-2.5 py-1 rounded capitalize transition-all ${
                  timeRange === tr
                    ? 'bg-white text-black font-semibold'
                    : 'text-[#888888] hover:text-white'
                }`}
              >
                {tr === 'all' ? 'All Time' : tr === '1h' ? '1 Hour' : tr === '6h' ? '6 Hours' : tr === '24h' ? '24 Hours' : tr}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[#666666] text-[11px] flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Device:
            </span>
            {(['all', 'desktop', 'mobile', 'tablet'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDeviceFilter(d)}
                className={`px-2 py-0.5 rounded text-[11px] capitalize ${
                  deviceFilter === d
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-[#777777] hover:text-[#CCCCCC]'
                }`}
              >
                {d}
              </button>
            ))}

            <span className="text-[#333333]">•</span>

            <span className="text-[#666666] text-[11px]">GPS Permission:</span>
            {(['all', 'granted', 'denied'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGpsFilter(g)}
                className={`px-2 py-0.5 rounded text-[11px] capitalize ${
                  gpsFilter === g
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-[#777777] hover:text-[#CCCCCC]'
                }`}
              >
                {g === 'all' ? 'All' : g === 'granted' ? '📍 GPS Allowed' : 'IP Geo Only'}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-[#777777]">
            Showing <span className="text-white font-semibold">{filteredLogs.length}</span> of {logs.length} logged visits
          </div>
        </div>
      </div>

      {/* CLEAR LOGS CONFIRMATION MODAL */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#141414] border border-red-500/30 rounded-2xl p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-red-400">
                <Trash2 className="w-6 h-6" />
                <h3 className="text-sm font-semibold text-white">Permanently Clear All Visitor Logs?</h3>
              </div>
              <p className="text-xs text-[#AAAAAA] leading-relaxed">
                This will delete all visitor telemetry records, device IDs, GPS locations, and view count history from both local storage and the database.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-mono"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearLogs}
                  disabled={isClearing}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs text-white font-mono font-semibold transition-all disabled:opacity-50"
                >
                  {isClearing ? 'Clearing...' : 'Confirm Clear All'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LOGS STREAM / TABLE */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#888888] font-mono flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-white" />
          <span>Synchronizing live visitor stream...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 rounded-xl bg-[#111111] border border-white/5 text-center space-y-3">
          <Activity className="w-8 h-8 text-[#555555] mx-auto" />
          <div className="text-xs font-semibold text-white">No visitor logs found matching current criteria</div>
          <p className="text-[11px] text-[#777777] max-w-sm mx-auto">
            Try adjusting your search terms, timeframes, or check if visits are being filtered by the ignore list.
          </p>
          {(searchQuery || timeRange !== 'all' || deviceFilter !== 'all' || gpsFilter !== 'all' || selectedUserKey) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedUserKey(null);
                setTimeRange('all');
                setDeviceFilter('all');
                setGpsFilter('all');
              }}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white font-mono"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const hasExactGps = log.locationPermission === 'granted' && log.exactLocation;
            const logDate = new Date(log.timestamp || log.createdAt);
            
            // Check if this log is associated with an ignored rule
            const isIgnoredDevice = ignoredConfig.ignoredDeviceIds.includes(log.deviceId);
            const isIgnoredBrowser = ignoredConfig.ignoredBrowserIds.includes(log.browserId);
            const isIgnoredIp = ignoredConfig.ignoredIps.includes(log.ip);
            const isAnyIgnored = isIgnoredDevice || isIgnoredBrowser || isIgnoredIp;

            // Resolved location label
            const geoCacheKey = log.exactLocation ? `${log.exactLocation.latitude},${log.exactLocation.longitude}` : '';
            const resolvedLoc = 
              geoCache[geoCacheKey] ||
              [log.city, log.region, log.country].filter(Boolean).join(', ') ||
              log.exactLocation?.formattedAddress ||
              'IP Location';

            return (
              <div
                key={log.id}
                className="p-4 rounded-xl bg-[#111111] border border-white/10 hover:border-white/20 transition-all space-y-3 group"
              >
                {/* Header Row: Timestamp + Device / Location summary */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-white/5 text-white">
                      {log.deviceType === 'mobile' ? (
                        <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                      ) : log.deviceType === 'tablet' ? (
                        <Tablet className="w-3.5 h-3.5 text-purple-400" />
                      ) : (
                        <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{logDate.toLocaleDateString()} at {logDate.toLocaleTimeString()}</span>
                        <span className="text-[10px] text-[#666666] font-mono">
                          ({getRelativeTimeString(log.timestamp || log.createdAt)})
                        </span>
                        {isAnyIgnored && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                            Ignored Rule Match
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#888888] font-mono flex items-center gap-2">
                        <span>{log.browserName} on {log.osName}</span>
                        <span>•</span>
                        <span>{log.screenResolution}</span>
                      </div>
                    </div>
                  </div>

                  {/* Location & GPS Status */}
                  <div className="flex items-center gap-2">
                    {hasExactGps ? (
                      <a
                        href={log.exactLocation?.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-md bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-[11px] font-mono text-purple-200 flex items-center gap-1.5 transition-colors shadow-sm"
                        title="View exact GPS coordinates in Google Maps"
                      >
                        <Compass className="w-3 h-3 text-purple-400 animate-pulse" />
                        <span>Exact GPS ({log.exactLocation?.latitude?.toFixed(4)}, {log.exactLocation?.longitude?.toFixed(4)})</span>
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </a>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-[10px] font-mono text-[#888888] border border-white/5 flex items-center gap-1">
                        <ShieldAlert className="w-2.5 h-2.5 text-[#666666]" />
                        <span>IP Geolocation</span>
                      </span>
                    )}

                    <div className="px-2.5 py-0.5 rounded bg-black/80 border border-white/10 text-xs text-[#EEEEEE] flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>{resolvedLoc}</span>
                    </div>
                  </div>
                </div>

                {/* Identifiers Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                  {/* Device ID */}
                  <div className="p-2.5 rounded-lg bg-black/50 border border-white/5 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase text-[#666666] flex items-center gap-1">
                        <span>Device ID</span>
                        {isIgnoredDevice && <span className="text-amber-400 font-bold">(Ignored)</span>}
                      </div>
                      <div className="text-white font-semibold truncate text-[11px]">{log.deviceId}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => handleCopy(log.deviceId, `dev-${log.id}`)}
                        className="p-1 text-[#666666] hover:text-white rounded"
                        title="Copy Device ID"
                      >
                        {copiedKey === `dev-${log.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUserKey(log.deviceId);
                          setSearchQuery('');
                        }}
                        className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[9px] text-blue-400 hover:text-blue-300"
                        title="Filter and count all visits by this device"
                      >
                        Analyze
                      </button>
                      {!isIgnoredDevice && (
                        <button
                          onClick={() => handleQuickIgnore('deviceId', log.deviceId, `Visitor (${log.browserName})`)}
                          className="px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-[9px] text-amber-300 border border-amber-500/20"
                          title="Ignore this device from future visitor logs"
                        >
                          Ignore
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Browser ID */}
                  <div className="p-2.5 rounded-lg bg-black/50 border border-white/5 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase text-[#666666] flex items-center gap-1">
                        <span>Browser ID</span>
                        {isIgnoredBrowser && <span className="text-amber-400 font-bold">(Ignored)</span>}
                      </div>
                      <div className="text-white font-semibold truncate text-[11px]">{log.browserId}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => handleCopy(log.browserId, `brw-${log.id}`)}
                        className="p-1 text-[#666666] hover:text-white rounded"
                        title="Copy Browser ID"
                      >
                        {copiedKey === `brw-${log.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUserKey(log.browserId);
                          setSearchQuery('');
                        }}
                        className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[9px] text-purple-400 hover:text-purple-300"
                        title="Filter and count all visits by this browser"
                      >
                        Analyze
                      </button>
                      {!isIgnoredBrowser && (
                        <button
                          onClick={() => handleQuickIgnore('browserId', log.browserId, `Browser (${log.browserName})`)}
                          className="px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-[9px] text-amber-300 border border-amber-500/20"
                          title="Ignore this browser session from logs"
                        >
                          Ignore
                        </button>
                      )}
                    </div>
                  </div>

                  {/* IP Address & ISP */}
                  <div className="p-2.5 rounded-lg bg-black/50 border border-white/5 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase text-[#666666] flex items-center gap-1">
                        <span>IP Address {log.isp ? `• ${log.isp}` : ''}</span>
                        {isIgnoredIp && <span className="text-amber-400 font-bold">(Ignored)</span>}
                      </div>
                      <div className="text-emerald-400 font-semibold truncate text-[11px]">{log.ip}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => handleCopy(log.ip, `ip-${log.id}`)}
                        className="p-1 text-[#666666] hover:text-white rounded"
                        title="Copy IP Address"
                      >
                        {copiedKey === `ip-${log.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUserKey(log.ip);
                          setSearchQuery('');
                        }}
                        className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[9px] text-emerald-400 hover:text-emerald-300"
                        title="Filter all visits from this IP"
                      >
                        Analyze
                      </button>
                      {!isIgnoredIp && (
                        <button
                          onClick={() => handleQuickIgnore('ip', log.ip, `IP (${log.city || 'Visitor'})`)}
                          className="px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-[9px] text-amber-300 border border-amber-500/20"
                          title="Ignore this IP from future logs"
                        >
                          Ignore
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer details: Path Visited + Referrer */}
                <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] text-[#777777] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-[#555555]">Path:</span>
                    <span className="text-white px-1.5 py-0.5 rounded bg-white/5">{log.path || '/'}</span>
                    {log.pageTitle && <span className="text-[#888888]">({log.pageTitle})</span>}
                  </div>
                  <div>
                    <span className="text-[#555555]">Referrer: </span>
                    <span className="text-[#AAAAAA]">{log.referrer || 'Direct'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function getRelativeTimeString(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
