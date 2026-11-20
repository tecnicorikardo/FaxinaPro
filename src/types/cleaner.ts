export type ActiveTab = 'painel' | 'cache' | 'residuos' | 'apps' | 'android';

export type ScanPhase = 'idle' | 'scanning' | 'ready' | 'cleaning' | 'done';

export interface CacheSubPath {
  id: string;
  label: string;
  path: string;
  sizeMB: number;
  selected: boolean;
}

export interface AppCacheEntry {
  id: string;
  appName: string;
  packageName: string;
  category: 'social' | 'midia' | 'navegador' | 'compras' | 'jogos' | 'utilitario';
  accentColor: string;
  initials: string;
  totalCacheMB: number;
  fileCount: number;
  lastCleanedDaysAgo: number;
  selected: boolean;
  subPaths: CacheSubPath[];
}

export type ResidueKind = 'cadaver' | 'sistema' | 'duplicado';

export type SafetyLevel = 'seguro' | 'revisar';

export interface ResidueItem {
  id: string;
  title: string;
  kind: ResidueKind;
  subType: string;
  originApp?: string;
  path: string;
  sizeMB: number;
  itemCount: number;
  lastModified: string;
  safety: SafetyLevel;
  description: string;
  selected: boolean;
}

export type AppOriginType = 'usuario' | 'bloatware' | 'inativo';

export interface InstalledAppItem {
  id: string;
  name: string;
  packageName: string;
  version: string;
  initials: string;
  accentColor: string;
  appSizeMB: number;
  dataSizeMB: number;
  cacheSizeMB: number;
  daysSinceLastUse: number;
  originType: AppOriginType;
  installedDate: string;
  selected: boolean;
  hasLeftoversAfterUninstall: boolean;
}

export interface ExclusionRule {
  id: string;
  label: string;
  target: string;
  scope: 'cache' | 'residuos' | 'apps';
  addedAt: string;
}

export interface CleanHistoryEntry {
  id: string;
  timestamp: string;
  module: string;
  freedMB: number;
  itemsRemoved: number;
}

export interface SchedulerSettings {
  enabled: boolean;
  frequency: 'diario' | '3dias' | 'semanal';
  autoCleanCache: boolean;
  autoCleanCorpses: boolean;
  autoCleanTemp: boolean;
  minFreeThresholdGB: number;
  nextRunLabel: string;
}

export interface RealFolderEntry {
  id: string;
  name: string;
  relativePath: string;
  sizeBytes: number;
  kind: 'temp' | 'log' | 'apk' | 'cache' | 'empty' | 'large';
  selected: boolean;
}
