import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  PackageX,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { AppOriginType, InstalledAppItem } from '../types/cleaner';
import { formatMB } from '../utils/formatters';

interface MassUninstallerViewProps {
  apps: InstalledAppItem[];
  onToggleApp: (id: string) => void;
  onSelectPreset: (preset: 'inativos' | 'bloatware' | 'none') => void;
  onCompleteBatchUninstall: (removedIds: string[], cleanLeftovers: boolean, freedMB: number) => void;
  onRestoreDemoApps: () => void;
}

type AppFilter = 'todos' | 'inativo' | 'bloatware' | 'usuario';
type AppSort = 'tamanho' | 'inatividade' | 'nome';

interface QueueLogItem {
  id: string;
  name: string;
  packageName: string;
  freedMB: number;
  leftoversCleaned: boolean;
}

export const MassUninstallerView: React.FC<MassUninstallerViewProps> = ({
  apps,
  onToggleApp,
  onSelectPreset,
  onCompleteBatchUninstall,
  onRestoreDemoApps,
}) => {
  const [filter, setFilter] = useState<AppFilter>('todos');
  const [sortBy, setSortBy] = useState<AppSort>('tamanho');
  const [search, setSearch] = useState('');

  // Batch confirmation + automated execution state
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  const [cleanLeftoversAuto, setCleanLeftoversAuto] = useState(true);
  const [isRunningQueue, setIsRunningQueue] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [queueApps, setQueueApps] = useState<InstalledAppItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stepLabel, setStepLabel] = useState('');
  const [completedLogs, setCompletedLogs] = useState<QueueLogItem[]>([]);
  const [queueDone, setQueueDone] = useState(false);

  const pausedRef = useRef(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  const getAppTotalMB = (app: InstalledAppItem) =>
    app.appSizeMB + app.dataSizeMB + app.cacheSizeMB;

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = apps.filter((a) => {
      if (q && !a.name.toLowerCase().includes(q) && !a.packageName.toLowerCase().includes(q)) {
        return false;
      }
      if (filter !== 'todos' && a.originType !== filter) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'tamanho') return getAppTotalMB(b) - getAppTotalMB(a);
      if (sortBy === 'inatividade') return b.daysSinceLastUse - a.daysSinceLastUse;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [apps, filter, sortBy, search]);

  const selectedApps = useMemo(() => apps.filter((a) => a.selected), [apps]);
  const selectedTotalMB = useMemo(
    () => selectedApps.reduce((sum, a) => sum + getAppTotalMB(a), 0),
    [selectedApps]
  );

  const originLabel = (origin: AppOriginType) => {
    if (origin === 'inativo') return 'Inativo';
    if (origin === 'bloatware') return 'Pré-instalado';
    return 'Uso frequente';
  };

  const sleepWithPauseCheck = async (ms: number) => {
    const chunk = 60;
    let elapsed = 0;
    while (elapsed < ms) {
      if (cancelledRef.current) throw new Error('CANCELLED');
      if (!pausedRef.current) {
        elapsed += chunk;
      }
      await new Promise((r) => setTimeout(r, chunk));
    }
  };

  const startAutomatedBatchUninstall = async () => {
    const targets = [...selectedApps];
    if (targets.length === 0) return;

    cancelledRef.current = false;
    setShowConfirmSheet(false);
    setQueueApps(targets);
    setCompletedLogs([]);
    setCurrentIndex(0);
    setQueueDone(false);
    setIsPaused(false);
    setIsRunningQueue(true);

    const removedIds: string[] = [];
    let totalFreed = 0;

    try {
      for (let i = 0; i < targets.length; i++) {
        const app = targets[i];
        setCurrentIndex(i);

        setStepLabel(`Encerrando processos em segundo plano (${app.packageName})...`);
        await sleepWithPauseCheck(320);

        setStepLabel(`Limpando cache e dados locais de ${app.name}...`);
        await sleepWithPauseCheck(340);

        setStepLabel(`Executando desinstalação automática do pacote ${app.packageName}...`);
        await sleepWithPauseCheck(420);

        if (cleanLeftoversAuto && app.hasLeftoversAfterUninstall) {
          setStepLabel(`CorpseFinder: removendo pastas órfãs residuais de ${app.name}...`);
          await sleepWithPauseCheck(300);
        }

        const appTotal = getAppTotalMB(app);
        removedIds.push(app.id);
        totalFreed += appTotal;

        setCompletedLogs((prev) => [
          {
            id: app.id,
            name: app.name,
            packageName: app.packageName,
            freedMB: appTotal,
            leftoversCleaned: cleanLeftoversAuto && app.hasLeftoversAfterUninstall,
          },
          ...prev,
        ]);
      }

      setQueueDone(true);
      setStepLabel('Fila de desinstalação em massa concluída.');
      onCompleteBatchUninstall(removedIds, cleanLeftoversAuto, totalFreed);
    } catch {
      // Cancelled midway: still commit what was already uninstalled
      if (removedIds.length > 0) {
        onCompleteBatchUninstall(removedIds, cleanLeftoversAuto, totalFreed);
      }
      setIsRunningQueue(false);
    }
  };

  const handleCancelQueue = () => {
    cancelledRef.current = true;
    setIsRunningQueue(false);
  };

  return (
    <div className="space-y-5 pb-28 lg:pb-8">
      {/* Top Control Card */}
      <div className="rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Desinstalação Automática em Massa (AppControl)
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Marque vários aplicativos inativos ou pré-instalados e remova todos em fila automática sem confirmações repetidas.
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
              {selectedApps.length} {selectedApps.length === 1 ? 'app' : 'apps'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {formatMB(selectedTotalMB)} a liberar
            </div>
          </div>
        </div>

        {/* Smart Presets */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectPreset('inativos')}
            className="min-h-[44px] px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            Selecionar Inativos (&gt;60 dias)
          </button>
          <button
            type="button"
            onClick={() => onSelectPreset('bloatware')}
            className="min-h-[44px] px-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            Selecionar Bloatware
          </button>
          {selectedApps.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectPreset('none')}
              className="min-h-[44px] px-3.5 rounded-xl bg-slate-100 dark:bg-[#0D1117] text-slate-600 dark:text-slate-400 text-xs font-semibold hover:text-slate-900 dark:hover:text-slate-200 whitespace-nowrap"
            >
              Limpar Seleção
            </button>
          )}
        </div>

        {/* Search, Filters & Sort */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#262E3A] flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar aplicativo instalado..."
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#262E3A] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {(
              [
                ['todos', 'Todos'],
                ['inativo', 'Inativos'],
                ['bloatware', 'Bloatware'],
                ['usuario', 'Em uso'],
              ] as [AppFilter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  filter === key
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 dark:bg-[#0D1117] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <select
            aria-label="Ordenar aplicativos por"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as AppSort)}
            className="min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#262E3A] text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0"
          >
            <option value="tamanho">Ordenar: Maior tamanho</option>
            <option value="inatividade">Ordenar: Mais tempo sem uso</option>
            <option value="nome">Ordenar: Nome (A–Z)</option>
          </select>
        </div>

        {/* Desktop Mass Uninstall CTA */}
        {selectedApps.length > 0 && (
          <div className="hidden lg:flex mt-4 pt-3 border-t border-slate-100 dark:border-[#262E3A] items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Pronto para desinstalar automaticamente <strong>{selectedApps.length}</strong> aplicativo(s) e recuperar{' '}
              <strong className="font-mono tabular-nums text-rose-500">{formatMB(selectedTotalMB)}</strong>.
            </span>
            <button
              type="button"
              onClick={() => setShowConfirmSheet(true)}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <PackageX className="w-4 h-4" />
              <span>Desinstalar em Massa ({selectedApps.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* App List */}
      {apps.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] p-8 text-center">
          <Sparkles className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Todos os aplicativos da lista foram removidos
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Deseja recarregar o inventário de aplicativos para novas simulações?
          </p>
          <button
            type="button"
            onClick={onRestoreDemoApps}
            className="mt-4 inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Recarregar Inventário</span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] divide-y divide-slate-100 dark:divide-[#262E3A] overflow-hidden">
          {filteredAndSorted.map((app) => {
            const totalMB = getAppTotalMB(app);
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => onToggleApp(app.id)}
                className="w-full text-left flex items-center gap-3 px-4 py-3.5 min-h-[70px] hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
              >
                <span className="min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0">
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                      app.selected
                        ? 'bg-rose-600 border-rose-600 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {app.selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </span>
                </span>

                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: app.accentColor }}
                >
                  {app.initials}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {app.name}
                    </span>
                    <span className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-slate-100 shrink-0">
                      {formatMB(totalMB)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono truncate max-w-[180px] sm:max-w-none">{app.packageName}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        app.originType === 'inativo'
                          ? 'text-rose-600 dark:text-rose-400 font-medium'
                          : app.originType === 'bloatware'
                            ? 'text-amber-600 dark:text-amber-400 font-medium'
                            : ''
                      }
                    >
                      {originLabel(app.originType)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {app.daysSinceLastUse === 0
                        ? 'Usado hoje'
                        : `Sem uso há ${app.daysSinceLastUse}d`}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile Sticky Mass Uninstall Bar */}
      {selectedApps.length > 0 && (
        <div className="lg:hidden fixed bottom-[68px] left-0 right-0 z-30 px-4 pb-2 pointer-events-none">
          <div className="pointer-events-auto max-w-md mx-auto">
            <button
              type="button"
              onClick={() => setShowConfirmSheet(true)}
              className="w-full min-h-[48px] rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-sm font-semibold shadow-lg flex items-center justify-center gap-2 transition-all"
            >
              <PackageX className="w-4 h-4" />
              <span>
                Desinstalar em Massa ({selectedApps.length} · {formatMB(selectedTotalMB)})
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Confirmation Bottom Sheet */}
      {showConfirmSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-confirm-title"
        >
          <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="batch-confirm-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Confirmar Desinstalação em Massa
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {selectedApps.length} aplicativos selecionados · {formatMB(selectedTotalMB)} serão liberados
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmSheet(false)}
                aria-label="Cancelar"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedApps.some((a) => a.originType === 'usuario') && (
              <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Você marcou aplicativos de uso frequente. Verifique se possui backup antes de continuar.
                </span>
              </div>
            )}

            <div className="mt-4 overflow-y-auto divide-y divide-slate-100 dark:divide-[#262E3A] border border-slate-200 dark:border-[#262E3A] rounded-xl max-h-52">
              {selectedApps.map((app) => (
                <div key={app.id} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{app.name}</p>
                    <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {app.packageName}
                    </p>
                  </div>
                  <span className="font-mono tabular-nums font-semibold text-rose-500 shrink-0">
                    {formatMB(getAppTotalMB(app))}
                  </span>
                </div>
              ))}
            </div>

            {/* Auto-clean corpse toggle (SD Maid Pro signature) */}
            <button
              type="button"
              onClick={() => setCleanLeftoversAuto((v) => !v)}
              className="mt-4 flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#262E3A] text-left min-h-[52px]"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Varrer resíduos (CorpseFinder) automaticamente
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Apaga pastas /Android/data e /obb deixadas após cada remoção
                </p>
              </div>
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                  cleanLeftoversAuto
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-slate-400 dark:border-slate-600'
                }`}
              >
                {cleanLeftoversAuto && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </span>
            </button>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmSheet(false)}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={startAutomatedBatchUninstall}
                className="flex-1 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Iniciar Fila Automática</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Automated Batch Execution Queue Modal */}
      {isRunningQueue && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-queue-title"
        >
          <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="batch-queue-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {queueDone
                    ? 'Desinstalação em Massa Concluída'
                    : `Desinstalando ${Math.min(currentIndex + 1, queueApps.length)} de ${queueApps.length}`}
                </h3>
                <p className="mt-1 text-xs font-mono text-emerald-600 dark:text-emerald-400">
                  {stepLabel}
                </p>
              </div>
              {queueDone && (
                <CheckCircle2 className="w-7 h-7 text-emerald-500 shrink-0" />
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    queueDone ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{
                    width: `${
                      queueApps.length > 0
                        ? Math.round((completedLogs.length / queueApps.length) * 100)
                        : 100
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Completed items log */}
            <div className="mt-4 max-h-56 overflow-y-auto space-y-2 pr-1">
              {completedLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#262E3A] px-3.5 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {log.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {log.leftoversCleaned
                          ? 'App e pastas órfãs removidos'
                          : 'Pacote desinstalado'}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                    +{formatMB(log.freedMB)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex gap-3">
              {!queueDone ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsPaused((p) => !p)}
                    className="flex-1 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-2"
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    <span>{isPaused ? 'Retomar' : 'Pausar'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelQueue}
                    className="flex-1 min-h-[44px] rounded-xl bg-slate-900 dark:bg-slate-800 hover:opacity-90 text-white text-sm font-semibold"
                  >
                    Interromper Fila
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsRunningQueue(false)}
                  className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                >
                  Concluir
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
