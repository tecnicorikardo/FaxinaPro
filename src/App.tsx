import React, { useEffect, useMemo, useState } from 'react';
import {
  FolderSearch,
  LayoutDashboard,
  Layers,
  Moon,
  PackageX,
  SlidersHorizontal,
  Smartphone,
  Sun,
} from 'lucide-react';
import {
  ActiveTab,
  AppCacheEntry,
  CleanHistoryEntry,
  ExclusionRule,
  InstalledAppItem,
  ResidueItem,
  ResidueKind,
  ScanPhase,
  SchedulerSettings,
} from './types/cleaner';
import {
  createInitialAppCaches,
  createInitialInstalledApps,
  createInitialResidues,
  DEVICE_BASE_MEDIA_SYSTEM_MB,
  DEVICE_TOTAL_STORAGE_MB,
  INITIAL_EXCLUSIONS,
  INITIAL_HISTORY,
  INITIAL_SCHEDULER,
} from './data/deviceStorageData';
import { formatMB, formatTimestamp } from './utils/formatters';
import { UpsideDownBinIcon } from './components/UpsideDownBinIcon';
import { OverviewView } from './components/OverviewView';
import { CacheCleanerView } from './components/CacheCleanerView';
import { ResidueCleanerView } from './components/ResidueCleanerView';
import { MassUninstallerView } from './components/MassUninstallerView';
import { AndroidNativeView } from './components/AndroidNativeView';
import { ToolsSection, ToolsSheetModal } from './components/ToolsSheetModal';

const STORAGE_KEY = 'faxinadroid_pro_state_v1';

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('faxinadroid_theme');
      return saved ? saved === 'dark' : true;
    } catch {
      return true;
    }
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('painel');

  // Core SD Maid Pro datasets
  const [caches, setCaches] = useState<AppCacheEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.caches)) return parsed.caches;
      }
    } catch {
      // ignore storage errors
    }
    return createInitialAppCaches();
  });

  const [residues, setResidues] = useState<ResidueItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.residues)) return parsed.residues;
      }
    } catch {
      // ignore
    }
    return createInitialResidues();
  });

  const [apps, setApps] = useState<InstalledAppItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.apps)) return parsed.apps;
      }
    } catch {
      // ignore
    }
    return createInitialInstalledApps();
  });

  const [exclusions, setExclusions] = useState<ExclusionRule[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.exclusions)) return parsed.exclusions;
      }
    } catch {
      // ignore
    }
    return INITIAL_EXCLUSIONS;
  });

  const [history, setHistory] = useState<CleanHistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.history)) return parsed.history;
      }
    } catch {
      // ignore
    }
    return INITIAL_HISTORY;
  });

  const [scheduler, setScheduler] = useState<SchedulerSettings>(INITIAL_SCHEDULER);

  // Scan / clean orchestration state
  const [scanPhase, setScanPhase] = useState<ScanPhase>('ready');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('');
  const [lastFreedMB, setLastFreedMB] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Real browser storage quota (navigator.storage.estimate)
  const [browserStorageEstimate, setBrowserStorageEstimate] = useState<{
    usage: number;
    quota: number;
  } | null>(null);

  // Tools modal state
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsSection, setToolsSection] = useState<ToolsSection>('analyzer');

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('faxinadroid_theme', isDark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDark]);

  // Persist state in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ caches, residues, apps, exclusions, history })
      );
    } catch {
      // ignore
    }
  }, [caches, residues, apps, exclusions, history]);

  // Fetch real StorageManager estimate if supported
  useEffect(() => {
    if (navigator.storage && typeof navigator.storage.estimate === 'function') {
      navigator.storage
        .estimate()
        .then((est) => {
          if (typeof est.usage === 'number' && typeof est.quota === 'number') {
            setBrowserStorageEstimate({ usage: est.usage, quota: est.quota });
          }
        })
        .catch(() => {});
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  // Derived metrics
  const cacheTotalMB = useMemo(
    () => caches.reduce((sum, app) => sum + app.totalCacheMB, 0),
    [caches]
  );

  const cacheSelectedMB = useMemo(
    () =>
      caches.reduce(
        (sum, app) =>
          sum + app.subPaths.filter((s) => s.selected).reduce((a, b) => a + b.sizeMB, 0),
        0
      ),
    [caches]
  );

  const residueTotalMB = useMemo(
    () => residues.reduce((sum, r) => sum + r.sizeMB, 0),
    [residues]
  );

  const residueSelectedMB = useMemo(
    () => residues.filter((r) => r.selected).reduce((sum, r) => sum + r.sizeMB, 0),
    [residues]
  );

  const appsTotalMB = useMemo(
    () => apps.reduce((sum, a) => sum + a.appSizeMB + a.dataSizeMB + a.cacheSizeMB, 0),
    [apps]
  );

  const inactiveApps = useMemo(
    () => apps.filter((a) => a.originType === 'inativo' || a.daysSinceLastUse >= 60),
    [apps]
  );

  const inactiveAppsMB = useMemo(
    () =>
      inactiveApps.reduce((sum, a) => sum + a.appSizeMB + a.dataSizeMB + a.cacheSizeMB, 0),
    [inactiveApps]
  );

  const selectedApps = useMemo(() => apps.filter((a) => a.selected), [apps]);
  const selectedAppsMB = useMemo(
    () =>
      selectedApps.reduce((sum, a) => sum + a.appSizeMB + a.dataSizeMB + a.cacheSizeMB, 0),
    [selectedApps]
  );

  const usedStorageMB = DEVICE_BASE_MEDIA_SYSTEM_MB + appsTotalMB + cacheTotalMB + residueTotalMB;

  // Full SD Maid Pro Scan sequence
  const handleStartFullScan = async () => {
    setScanPhase('scanning');
    setScanProgress(8);
    const steps = [
      { p: 24, text: 'AppCleaner: analisando /Android/data/*/cache...' },
      { p: 48, text: 'CorpseFinder: cruzando pacotes instalados com diretórios órfãos...' },
      { p: 74, text: 'SystemCleaner: buscando .tmp, .log, .thumbnails e pastas vazias...' },
      { p: 92, text: 'AppControl: verificando aplicativos sem uso há mais de 60 dias...' },
    ];
    for (const step of steps) {
      setScanStatusText(step.text);
      setScanProgress(step.p);
      await new Promise((r) => setTimeout(r, 340));
    }
    setScanProgress(100);
    setScanPhase('ready');
    setScanStatusText('');
    showToast('Varredura completa finalizada.');
  };

  // Quick Clean All (Cache + Selected Residues)
  const handleRunQuickClean = async () => {
    const targetCacheMB = cacheSelectedMB;
    const targetResidueMB = residueSelectedMB;
    const totalToFree = targetCacheMB + targetResidueMB;
    if (totalToFree <= 0) return;

    setScanPhase('cleaning');
    setScanProgress(10);

    const cacheTargets = caches.filter((c) => c.subPaths.some((s) => s.selected));
    for (let i = 0; i < cacheTargets.length; i++) {
      setScanStatusText(`Esvaziando cache de ${cacheTargets[i].packageName}...`);
      setScanProgress(15 + Math.round(((i + 1) / Math.max(1, cacheTargets.length)) * 45));
      await new Promise((r) => setTimeout(r, 140));
    }

    const resTargets = residues.filter((r) => r.selected);
    for (let i = 0; i < resTargets.length; i++) {
      setScanStatusText(`Removendo ${resTargets[i].title}...`);
      setScanProgress(60 + Math.round(((i + 1) / Math.max(1, resTargets.length)) * 35));
      await new Promise((r) => setTimeout(r, 140));
    }

    // Apply removal
    let removedItems = 0;
    setCaches((prev) =>
      prev
        .map((app) => {
          const remainingSubs = app.subPaths.filter((sp) => !sp.selected);
          const removedSubs = app.subPaths.filter((sp) => sp.selected);
          if (removedSubs.length > 0) removedItems += app.fileCount;
          const newTotal = remainingSubs.reduce((s, sp) => s + sp.sizeMB, 0);
          return {
            ...app,
            subPaths: remainingSubs,
            totalCacheMB: newTotal,
            selected: false,
          };
        })
        .filter((app) => app.subPaths.length > 0 && app.totalCacheMB > 0)
    );

    setResidues((prev) => {
      prev.forEach((r) => {
        if (r.selected) removedItems += r.itemCount;
      });
      return prev.filter((r) => !r.selected);
    });

    setLastFreedMB(totalToFree);
    setHistory((prev) => [
      {
        id: `hist-${Date.now()}`,
        timestamp: formatTimestamp(),
        module: 'Limpeza Completa (Cache + Resíduos)',
        freedMB: totalToFree,
        itemsRemoved: removedItems,
      },
      ...prev,
    ]);

    setScanProgress(100);
    setScanPhase('done');
    setScanStatusText('');
    showToast(`${formatMB(totalToFree)} liberados com sucesso.`);
  };

  // Cache Cleaner Handlers
  const handleToggleCacheApp = (appId: string) => {
    setCaches((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        const nextSel = !app.selected;
        return {
          ...app,
          selected: nextSel,
          subPaths: app.subPaths.map((sp) => ({ ...sp, selected: nextSel })),
        };
      })
    );
  };

  const handleToggleCacheSubPath = (appId: string, subPathId: string) => {
    setCaches((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        const nextSubs = app.subPaths.map((sp) =>
          sp.id === subPathId ? { ...sp, selected: !sp.selected } : sp
        );
        return {
          ...app,
          subPaths: nextSubs,
          selected: nextSubs.some((sp) => sp.selected),
        };
      })
    );
  };

  const handleSelectAllCaches = (selected: boolean) => {
    setCaches((prev) =>
      prev.map((app) => ({
        ...app,
        selected,
        subPaths: app.subPaths.map((sp) => ({ ...sp, selected })),
      }))
    );
  };

  const handleCleanSelectedCaches = async () => {
    const freed = cacheSelectedMB;
    if (freed <= 0) return;

    setScanPhase('cleaning');
    const targets = caches.filter((c) => c.subPaths.some((s) => s.selected));
    for (const app of targets) {
      setScanStatusText(`Limpando ${app.packageName}...`);
      await new Promise((r) => setTimeout(r, 140));
    }

    let itemsRemoved = 0;
    setCaches((prev) =>
      prev
        .map((app) => {
          const remainingSubs = app.subPaths.filter((sp) => !sp.selected);
          const removedSubs = app.subPaths.filter((sp) => sp.selected);
          if (removedSubs.length > 0) itemsRemoved += app.fileCount;
          const newTotal = remainingSubs.reduce((s, sp) => s + sp.sizeMB, 0);
          return {
            ...app,
            subPaths: remainingSubs,
            totalCacheMB: newTotal,
            selected: false,
          };
        })
        .filter((app) => app.subPaths.length > 0 && app.totalCacheMB > 0)
    );

    setLastFreedMB(freed);
    setHistory((prev) => [
      {
        id: `hist-${Date.now()}`,
        timestamp: formatTimestamp(),
        module: 'Limpador de Cache (AppCleaner)',
        freedMB: freed,
        itemsRemoved,
      },
      ...prev,
    ]);
    setScanPhase('ready');
    setScanStatusText('');
    showToast(`Cache limpo: ${formatMB(freed)} recuperados.`);
  };

  const handleExcludeCacheApp = (app: AppCacheEntry) => {
    setExclusions((prev) => [
      {
        id: `exc-${Date.now()}`,
        label: `${app.appName} (Cache protegido)`,
        target: app.packageName,
        scope: 'cache',
        addedAt: formatTimestamp(),
      },
      ...prev,
    ]);
    setCaches((prev) => prev.filter((c) => c.id !== app.id));
    showToast(`${app.appName} movido para a Lista de Exclusões.`);
  };

  // Residue Cleaner Handlers
  const handleToggleResidue = (id: string) => {
    setResidues((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSelectResidueByKind = (kind: ResidueKind | 'todos', selected: boolean) => {
    setResidues((prev) =>
      prev.map((r) => {
        if (kind !== 'todos' && r.kind !== kind) return r;
        if (selected && r.safety === 'revisar') return r;
        return { ...r, selected };
      })
    );
  };

  const handleExcludeResidue = (item: ResidueItem) => {
    setExclusions((prev) => [
      {
        id: `exc-${Date.now()}`,
        label: item.title,
        target: item.path,
        scope: 'residuos',
        addedAt: formatTimestamp(),
      },
      ...prev,
    ]);
    setResidues((prev) => prev.filter((r) => r.id !== item.id));
    showToast(`"${item.title}" protegido nas exclusões.`);
  };

  const handleRemoveSingleResidue = (id: string) => {
    const target = residues.find((r) => r.id === id);
    if (!target) return;
    setResidues((prev) => prev.filter((r) => r.id !== id));
    setLastFreedMB(target.sizeMB);
    setHistory((prev) => [
      {
        id: `hist-${Date.now()}`,
        timestamp: formatTimestamp(),
        module: `Resíduo removido: ${target.title}`,
        freedMB: target.sizeMB,
        itemsRemoved: target.itemCount,
      },
      ...prev,
    ]);
    showToast(`${formatMB(target.sizeMB)} liberados.`);
  };

  const handleCleanSelectedResidues = async () => {
    const freed = residueSelectedMB;
    if (freed <= 0) return;

    setScanPhase('cleaning');
    await new Promise((r) => setTimeout(r, 420));

    let itemsRemoved = 0;
    setResidues((prev) => {
      prev.forEach((r) => {
        if (r.selected) itemsRemoved += r.itemCount;
      });
      return prev.filter((r) => !r.selected);
    });

    setLastFreedMB(freed);
    setHistory((prev) => [
      {
        id: `hist-${Date.now()}`,
        timestamp: formatTimestamp(),
        module: 'Cadáveres & Resíduos do Sistema',
        freedMB: freed,
        itemsRemoved,
      },
      ...prev,
    ]);
    setScanPhase('ready');
    showToast(`${formatMB(freed)} de arquivos inúteis removidos.`);
  };

  // Mass Uninstaller Handlers
  const handleToggleInstalledApp = (id: string) => {
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a))
    );
  };

  const handleSelectAppPreset = (preset: 'inativos' | 'bloatware' | 'none') => {
    setApps((prev) =>
      prev.map((a) => {
        if (preset === 'none') return { ...a, selected: false };
        if (preset === 'inativos') {
          return { ...a, selected: a.originType === 'inativo' || a.daysSinceLastUse >= 60 };
        }
        return { ...a, selected: a.originType === 'bloatware' };
      })
    );
  };

  const handleCompleteBatchUninstall = (
    removedIds: string[],
    cleanLeftovers: boolean,
    freedMB: number
  ) => {
    setApps((prev) => prev.filter((a) => !removedIds.includes(a.id)));
    setLastFreedMB(freedMB);
    setHistory((prev) => [
      {
        id: `hist-${Date.now()}`,
        timestamp: formatTimestamp(),
        module: cleanLeftovers
          ? `Desinstalação em Massa + CorpseFinder (${removedIds.length} apps)`
          : `Desinstalação em Massa (${removedIds.length} apps)`,
        freedMB,
        itemsRemoved: removedIds.length,
      },
      ...prev,
    ]);
    showToast(`${removedIds.length} apps desinstalados · ${formatMB(freedMB)} liberados.`);
  };

  // Rescan / Simulate fresh accumulation
  const handleSimulateNewClutter = () => {
    const excludedTargets = new Set(exclusions.map((e) => e.target));
    setCaches(
      createInitialAppCaches().filter((c) => !excludedTargets.has(c.packageName))
    );
    setResidues(
      createInitialResidues().filter((r) => !excludedTargets.has(r.path))
    );
    setScanPhase('ready');
    showToast('Nova varredura encontrou caches e resíduos recentes.');
  };

  const handleResetAllDemoData = () => {
    setCaches(createInitialAppCaches());
    setResidues(createInitialResidues());
    setApps(createInitialInstalledApps());
    setExclusions(INITIAL_EXCLUSIONS);
    setHistory(INITIAL_HISTORY);
    setScheduler(INITIAL_SCHEDULER);
    setScanPhase('ready');
    setToolsOpen(false);
    showToast('Estado inicial de análise restaurado.');
  };

  const openTools = (sec: ToolsSection) => {
    setToolsSection(sec);
    setToolsOpen(true);
  };

  const navItems: {
    id: ActiveTab;
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    badgeText?: string;
  }[] = [
    { id: 'painel', label: 'Painel Geral', shortLabel: 'Painel', icon: LayoutDashboard },
    {
      id: 'cache',
      label: 'Limpeza de Cache',
      shortLabel: 'Cache',
      icon: Layers,
      badgeText: cacheTotalMB > 0 ? formatMB(cacheTotalMB) : undefined,
    },
    {
      id: 'residuos',
      label: 'Resíduos & Cadáveres',
      shortLabel: 'Resíduos',
      icon: FolderSearch,
      badgeText: residueTotalMB > 0 ? formatMB(residueTotalMB) : undefined,
    },
    {
      id: 'apps',
      label: 'Desinstalar em Massa',
      shortLabel: 'Apps',
      icon: PackageX,
      badgeText: selectedApps.length > 0 ? `${selectedApps.length}` : undefined,
    },
    {
      id: 'android',
      label: 'Android Nativo (APK)',
      shortLabel: 'Android',
      icon: Smartphone,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0D1117] text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar (visible lg+) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white dark:bg-[#161B22] border-r border-slate-200 dark:border-[#262E3A] z-30">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200 dark:border-[#262E3A]">
          <UpsideDownBinIcon
            className="w-8 h-8 text-slate-700 dark:text-slate-200 shrink-0"
            dumping={scanPhase === 'cleaning'}
          />
          <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap">
            FaxinaDroid Pro
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full min-h-[46px] px-3.5 rounded-xl flex items-center justify-between gap-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badgeText && (
                  <span
                    className={`font-mono tabular-nums text-[11px] shrink-0 ${
                      active ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {item.badgeText}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-[#262E3A] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => openTools('scheduler')}
              className="flex-1 min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-[#262E3A] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Ajustes Pro</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              aria-label="Alternar tema claro ou escuro"
              className="min-w-[44px] min-h-[44px] rounded-xl border border-slate-200 dark:border-[#262E3A] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center shrink-0"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Compact Sticky Top Bar (52px) */}
      <header className="lg:hidden sticky top-0 z-30 h-[52px] px-4 bg-white/90 dark:bg-[#161B22]/90 backdrop-blur-md border-b border-slate-200 dark:border-[#262E3A] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <UpsideDownBinIcon
            className="w-7 h-7 text-slate-700 dark:text-slate-200 shrink-0"
            dumping={scanPhase === 'cleaning'}
          />
          <span className="font-display text-base font-bold tracking-tight truncate">
            FaxinaDroid Pro
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'android'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Kotlin / APK</span>
          </button>
          <button
            type="button"
            onClick={() => openTools('analyzer')}
            aria-label="Abrir ferramentas e ajustes"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-64">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-20 lg:py-8">
          {activeTab === 'painel' && (
            <OverviewView
              totalStorageMB={DEVICE_TOTAL_STORAGE_MB}
              usedStorageMB={usedStorageMB}
              cacheTotalMB={cacheTotalMB}
              cacheSelectedMB={cacheSelectedMB}
              cacheAppCount={caches.length}
              residueTotalMB={residueTotalMB}
              residueSelectedMB={residueSelectedMB}
              residueItemCount={residues.length}
              inactiveAppsCount={inactiveApps.length}
              inactiveAppsMB={inactiveAppsMB}
              selectedAppsCount={selectedApps.length}
              selectedAppsMB={selectedAppsMB}
              scanPhase={scanPhase}
              scanProgress={scanProgress}
              scanStatusText={scanStatusText}
              lastFreedMB={lastFreedMB}
              browserStorageEstimate={browserStorageEstimate}
              history={history}
              scheduler={scheduler}
              exclusionsCount={exclusions.length}
              onStartFullScan={handleStartFullScan}
              onRunQuickClean={handleRunQuickClean}
              onSimulateNewClutter={handleSimulateNewClutter}
              onNavigateTab={setActiveTab}
              onOpenToolsModal={openTools}
            />
          )}

          {activeTab === 'cache' && (
            <CacheCleanerView
              caches={caches}
              isCleaning={scanPhase === 'cleaning'}
              cleaningProgressText={scanStatusText}
              onToggleApp={handleToggleCacheApp}
              onToggleSubPath={handleToggleCacheSubPath}
              onSelectAll={handleSelectAllCaches}
              onExcludeApp={handleExcludeCacheApp}
              onCleanSelected={handleCleanSelectedCaches}
              onRescanCache={handleSimulateNewClutter}
            />
          )}

          {activeTab === 'residuos' && (
            <ResidueCleanerView
              residues={residues}
              isCleaning={scanPhase === 'cleaning'}
              onToggleResidue={handleToggleResidue}
              onSelectByKind={handleSelectResidueByKind}
              onExcludeResidue={handleExcludeResidue}
              onRemoveSingleResidue={handleRemoveSingleResidue}
              onCleanSelectedResidues={handleCleanSelectedResidues}
              onRescanResidues={handleSimulateNewClutter}
            />
          )}

          {activeTab === 'apps' && (
            <MassUninstallerView
              apps={apps}
              onToggleApp={handleToggleInstalledApp}
              onSelectPreset={handleSelectAppPreset}
              onCompleteBatchUninstall={handleCompleteBatchUninstall}
              onRestoreDemoApps={() => setApps(createInitialInstalledApps())}
            />
          )}

          {activeTab === 'android' && <AndroidNativeView />}
        </div>
      </main>

      {/* Mobile Fixed Bottom Tab Bar (60px) */}
      <nav
        aria-label="Navegação principal"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#161B22]/95 backdrop-blur-md border-t border-slate-200 dark:border-[#262E3A] pb-safe"
      >
        <div className="grid grid-cols-5 h-[60px]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
                  active
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-semibold tracking-tight mt-0.5 whitespace-nowrap">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed top-16 lg:top-6 right-4 z-50 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white px-4 py-3 text-xs font-semibold shadow-xl max-w-xs"
        >
          {toastMessage}
        </div>
      )}

      {/* Tools / Analyzer / Scheduler / Exclusions Modal */}
      <ToolsSheetModal
        isOpen={toolsOpen}
        initialSection={toolsSection}
        isDark={isDark}
        totalStorageMB={DEVICE_TOTAL_STORAGE_MB}
        usedStorageMB={usedStorageMB}
        cacheTotalMB={cacheTotalMB}
        residueTotalMB={residueTotalMB}
        appsTotalMB={appsTotalMB}
        scheduler={scheduler}
        exclusions={exclusions}
        history={history}
        onClose={() => setToolsOpen(false)}
        onToggleTheme={() => setIsDark((d) => !d)}
        onUpdateScheduler={setScheduler}
        onAddExclusion={(label, target, scope) =>
          setExclusions((prev) => [
            {
              id: `exc-${Date.now()}`,
              label,
              target,
              scope,
              addedAt: formatTimestamp(),
            },
            ...prev,
          ])
        }
        onRemoveExclusion={(id) =>
          setExclusions((prev) => prev.filter((e) => e.id !== id))
        }
        onClearHistory={() => setHistory([])}
        onResetAllDemoData={handleResetAllDemoData}
      />
    </div>
  );
}
