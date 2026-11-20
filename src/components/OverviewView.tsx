import React from 'react';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FolderSearch,
  HardDrive,
  Layers,
  PackageX,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  ActiveTab,
  CleanHistoryEntry,
  ScanPhase,
  SchedulerSettings,
} from '../types/cleaner';
import { formatBytes, formatMB } from '../utils/formatters';
import { UpsideDownBinIcon } from './UpsideDownBinIcon';

interface OverviewViewProps {
  totalStorageMB: number;
  usedStorageMB: number;
  cacheTotalMB: number;
  cacheSelectedMB: number;
  cacheAppCount: number;
  residueTotalMB: number;
  residueSelectedMB: number;
  residueItemCount: number;
  inactiveAppsCount: number;
  inactiveAppsMB: number;
  selectedAppsCount: number;
  selectedAppsMB: number;
  scanPhase: ScanPhase;
  scanProgress: number;
  scanStatusText: string;
  lastFreedMB: number;
  browserStorageEstimate: { usage: number; quota: number } | null;
  history: CleanHistoryEntry[];
  scheduler: SchedulerSettings;
  exclusionsCount: number;
  onStartFullScan: () => void;
  onRunQuickClean: () => void;
  onSimulateNewClutter: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenToolsModal: (section: 'analyzer' | 'scheduler' | 'exclusions' | 'history') => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  totalStorageMB,
  usedStorageMB,
  cacheTotalMB,
  cacheSelectedMB,
  cacheAppCount,
  residueTotalMB,
  residueSelectedMB,
  residueItemCount,
  inactiveAppsCount,
  inactiveAppsMB,
  selectedAppsCount,
  selectedAppsMB,
  scanPhase,
  scanProgress,
  scanStatusText,
  lastFreedMB,
  browserStorageEstimate,
  history,
  scheduler,
  exclusionsCount,
  onStartFullScan,
  onRunQuickClean,
  onSimulateNewClutter,
  onNavigateTab,
  onOpenToolsModal,
}) => {
  const totalRecoverableMB = cacheSelectedMB + residueSelectedMB;
  const totalPossibleMB = cacheTotalMB + residueTotalMB;
  const usedPercent = Math.min(100, Math.round((usedStorageMB / totalStorageMB) * 100));
  const recoverablePercent = Math.min(usedPercent, Math.round((totalPossibleMB / totalStorageMB) * 100));
  const freeStorageMB = Math.max(0, totalStorageMB - usedStorageMB);

  const isBusy = scanPhase === 'scanning' || scanPhase === 'cleaning';

  return (
    <div className="space-y-6 pb-8">
      {/* Hero Storage + One-Tap Action Section */}
      <section className="rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <UpsideDownBinIcon
                className="w-10 h-10 text-slate-700 dark:text-slate-300"
                dumping={scanPhase === 'cleaning'}
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {scanPhase === 'scanning'
                  ? 'Varredura Profunda em Andamento'
                  : scanPhase === 'cleaning'
                    ? 'Esvaziando Lixo do Dispositivo'
                    : totalPossibleMB > 0
                      ? `${formatMB(totalPossibleMB)} pronto para despejar`
                      : 'Dispositivo Limpo e Otimizado'}
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {isBusy ? (
                  <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                    {scanStatusText}
                  </span>
                ) : totalPossibleMB > 0 ? (
                  <span>
                    Cache de {cacheAppCount} apps, {residueItemCount} blocos de resíduos e {inactiveAppsCount} apps inativos detectados.
                  </span>
                ) : (
                  <span>
                    Última limpeza liberou{' '}
                    <strong className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatMB(lastFreedMB)}
                    </strong>
                    . Todos os diretórios monitorados estão limpos.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              disabled={isBusy}
              onClick={onStartFullScan}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1117] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${scanPhase === 'scanning' ? 'animate-spin' : ''}`} />
              <span>{scanPhase === 'scanning' ? 'Verificando...' : 'Verificar Tudo'}</span>
            </button>

            {totalRecoverableMB > 0 ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={onRunQuickClean}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-sm font-semibold transition-all disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>Limpar Tudo ({formatMB(totalRecoverableMB)})</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isBusy}
                onClick={onSimulateNewClutter}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:opacity-90 text-white text-sm font-semibold transition-opacity disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>Nova Análise Completa</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar during Scan or Clean */}
        {isBusy && (
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>{scanPhase === 'scanning' ? 'Inspecionando partições e diretórios' : 'Removendo caches e resíduos'}</span>
              <span className="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                {scanProgress}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-200 rounded-full"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Storage Breakdown Bar */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-[#262E3A]">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              <HardDrive className="w-4 h-4 text-slate-500" />
              <span>Armazenamento Interno</span>
            </div>
            <div className="text-xs sm:text-sm font-mono tabular-nums text-slate-600 dark:text-slate-400">
              <strong className="text-slate-900 dark:text-slate-100">{formatMB(usedStorageMB)}</strong> usados de{' '}
              {formatMB(totalStorageMB)} · <span className="text-emerald-600 dark:text-emerald-400">{formatMB(freeStorageMB)} livres</span>
            </div>
          </div>

          <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
            <div
              className="h-full bg-slate-500 dark:bg-slate-500 transition-all duration-300"
              style={{ width: `${Math.max(0, usedPercent - recoverablePercent)}%` }}
              title="Sistema, Apps e Mídia"
            />
            {recoverablePercent > 0 && (
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${recoverablePercent}%` }}
                title="Cache e Resíduos Recuperáveis"
              />
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-500 inline-block" />
                Sistema e Dados ({usedPercent - recoverablePercent}%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                Recuperável ({formatMB(totalPossibleMB)})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 inline-block" />
                Livre ({100 - usedPercent}%)
              </span>
            </div>

            {browserStorageEstimate && browserStorageEstimate.quota > 0 && (
              <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                Cota real do navegador: {formatBytes(browserStorageEstimate.usage)} / {formatBytes(browserStorageEstimate.quota)}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Core SD Maid Pro Modules Grid */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Módulos de Limpeza
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Estilo SD Maid Pro
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: AppCleaner */}
          <button
            type="button"
            onClick={() => onNavigateTab('cache')}
            className="group text-left rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] hover:border-emerald-500/60 p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">
              Limpador de Cache (AppCleaner)
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              Elimina caches ocultos de vídeos, figurinhas, WebView e miniaturas de aplicativos sem apagar seus dados pessoais.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#262E3A] flex items-center justify-between text-xs">
              <span className="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                {cacheTotalMB > 0 ? formatMB(cacheTotalMB) : '0 MB'}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {cacheAppCount} apps com cache
              </span>
            </div>
          </button>

          {/* Card 2: CorpseFinder & SystemCleaner */}
          <button
            type="button"
            onClick={() => onNavigateTab('residuos')}
            className="group text-left rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] hover:border-amber-500/60 p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <FolderSearch className="w-5 h-5" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">
              Cadáveres & Resíduos do Sistema
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              Localiza pastas órfãs de apps removidos, APKs antigos, arquivos .tmp/.log, pastas vazias e duplicados.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#262E3A] flex items-center justify-between text-xs">
              <span className="font-mono tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                {residueTotalMB > 0 ? formatMB(residueTotalMB) : '0 MB'}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {residueItemCount} grupos detectados
              </span>
            </div>
          </button>

          {/* Card 3: AppControl Mass Uninstaller */}
          <button
            type="button"
            onClick={() => onNavigateTab('apps')}
            className="group text-left rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] hover:border-rose-500/60 p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <PackageX className="w-5 h-5" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">
              Desinstalação Automática em Massa
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              Selecione vários aplicativos inativos ou pré-instalados e execute a fila automática de remoção com limpeza de sobras.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#262E3A] flex items-center justify-between text-xs">
              <span className="font-mono tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                {selectedAppsCount > 0
                  ? `${selectedAppsCount} marcados (${formatMB(selectedAppsMB)})`
                  : `${inactiveAppsCount} inativos (${formatMB(inactiveAppsMB)})`}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Fila automática
              </span>
            </div>
          </button>

          {/* Card 4: Scheduler & Exclusions */}
          <button
            type="button"
            onClick={() => onOpenToolsModal('scheduler')}
            className="group text-left rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] hover:border-sky-500/60 p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <CalendarClock className="w-5 h-5" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">
              Agendador Automático & Exclusões
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              Configure rotinas automáticas de limpeza periódica e gerencie pastas ou apps protegidos contra remoção.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#262E3A] flex items-center justify-between text-xs">
              <span className="font-semibold text-sky-600 dark:text-sky-400">
                {scheduler.enabled ? 'Agendamento ativo' : 'Agendamento pausado'}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {exclusionsCount} exclusões protegidas
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* Bottom Row: Recent History & Quick Tools */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Histórico Recente de Limpeza
            </h2>
            <button
              type="button"
              onClick={() => onOpenToolsModal('history')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline min-h-[44px] px-2 flex items-center"
            >
              Ver tudo
            </button>
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
              Nenhuma limpeza executada nesta sessão ainda.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#262E3A]">
              {history.slice(0, 3).map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {item.module}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.timestamp} · {item.itemsRemoved} itens removidos
                      </p>
                    </div>
                  </div>
                  <span className="font-mono tabular-nums text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                    +{formatMB(item.freedMB)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Proteção de Dados Pessoais</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              A limpeza de cache e cadáveres preserva fotos da galeria, conversas, logins salvos e documentos protegidos na Lista de Exclusões.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenToolsModal('exclusions')}
            className="mt-4 w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
          >
            Gerenciar Exclusões ({exclusionsCount})
          </button>
        </div>
      </section>
    </div>
  );
};
