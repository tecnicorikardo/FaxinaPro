import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  ShieldPlus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { AppCacheEntry } from '../types/cleaner';
import { formatMB } from '../utils/formatters';

interface CacheCleanerViewProps {
  caches: AppCacheEntry[];
  isCleaning: boolean;
  cleaningProgressText: string;
  onToggleApp: (appId: string) => void;
  onToggleSubPath: (appId: string, subPathId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onExcludeApp: (app: AppCacheEntry) => void;
  onCleanSelected: () => void;
  onRescanCache: () => void;
}

type CacheFilter = 'todos' | 'maiores' | 'social' | 'midia' | 'navegador';

export const CacheCleanerView: React.FC<CacheCleanerViewProps> = ({
  caches,
  isCleaning,
  cleaningProgressText,
  onToggleApp,
  onToggleSubPath,
  onSelectAll,
  onExcludeApp,
  onCleanSelected,
  onRescanCache,
}) => {
  const [filter, setFilter] = useState<CacheFilter>('todos');
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return caches.filter((c) => {
      if (q && !c.appName.toLowerCase().includes(q) && !c.packageName.toLowerCase().includes(q)) {
        return false;
      }
      if (filter === 'maiores') return c.totalCacheMB >= 400;
      if (filter === 'social') return c.category === 'social';
      if (filter === 'midia') return c.category === 'midia';
      if (filter === 'navegador') return c.category === 'navegador';
      return true;
    });
  }, [caches, filter, search]);

  const selectedMB = useMemo(() => {
    return caches.reduce((sum, app) => {
      const appSubSelected = app.subPaths
        .filter((sp) => sp.selected)
        .reduce((s, sp) => s + sp.sizeMB, 0);
      return sum + appSubSelected;
    }, 0);
  }, [caches]);

  const totalMB = useMemo(
    () => caches.reduce((sum, app) => sum + app.totalCacheMB, 0),
    [caches]
  );

  const allSelected = caches.length > 0 && caches.every((c) => c.selected);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-5 pb-28 lg:pb-8">
      {/* Header & Summary Card */}
      <div className="rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Limpador de Cache (AppCleaner)
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Cache temporário acumulando espaço sem apagar contas, chats ou fotos salvas.
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatMB(selectedMB)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              selecionado de {formatMB(totalMB)}
            </div>
          </div>
        </div>

        {/* Search and Filter Tabs */}
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar app ou pacote (ex: com.whatsapp)..."
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#262E3A] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                ['todos', 'Todos'],
                ['maiores', 'Maiores'],
                ['social', 'Redes Sociais'],
                ['midia', 'Mídia'],
                ['navegador', 'Navegador'],
              ] as [CacheFilter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  filter === key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-[#0D1117] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        {caches.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#262E3A] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onSelectAll(!allSelected)}
              className="min-h-[44px] px-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline whitespace-nowrap"
            >
              {allSelected ? 'Desmarcar todos' : 'Selecionar todos os caches'}
            </button>

            <button
              type="button"
              disabled={isCleaning || selectedMB <= 0}
              onClick={onCleanSelected}
              className="hidden lg:inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {isCleaning ? 'Limpando...' : `Limpar Cache (${formatMB(selectedMB)})`}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Cleaning Progress Banner */}
      {isCleaning && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Executando limpeza de cache...
            </p>
            <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
              {cleaningProgressText}
            </p>
          </div>
        </div>
      )}

      {/* App Cache List */}
      {caches.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] p-8 text-center">
          <Sparkles className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Todos os caches foram esvaziados
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Nenhum cache dispensável restante nos aplicativos monitorados.
          </p>
          <button
            type="button"
            onClick={onRescanCache}
            className="mt-4 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Reescanear Caches
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Nenhum aplicativo encontrado para esse filtro.
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] divide-y divide-slate-100 dark:divide-[#262E3A] overflow-hidden">
          {filtered.map((app) => {
            const isExpanded = !!expandedIds[app.id];
            const selectedAppMB = app.subPaths
              .filter((sp) => sp.selected)
              .reduce((s, sp) => s + sp.sizeMB, 0);

            return (
              <div key={app.id} className="transition-colors">
                <div className="flex items-center gap-3 px-4 py-3 min-h-[68px]">
                  {/* 44x44px Checkbox Touch Target */}
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={app.selected}
                    aria-label={`Selecionar cache de ${app.appName}`}
                    onClick={() => onToggleApp(app.id)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  >
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        app.selected
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-transparent'
                      }`}
                    >
                      {app.selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </span>
                  </button>

                  {/* App Initials Badge */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: app.accentColor }}
                  >
                    {app.initials}
                  </div>

                  {/* App Info + Expand Trigger */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(app.id)}
                    className="flex-1 min-w-0 text-left py-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {app.appName}
                      </span>
                      <span className="font-mono tabular-nums text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {formatMB(selectedAppMB > 0 ? selectedAppMB : app.totalCacheMB)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                      <span className="font-mono truncate">{app.packageName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="shrink-0 tabular-nums">{app.fileCount} arquivos</span>
                    </div>
                  </button>

                  {/* Expand / Collapse Chevron */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(app.id)}
                    aria-label={isExpanded ? 'Ocultar pastas de cache' : 'Ver pastas de cache'}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 shrink-0"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expanded Sub-paths */}
                {isExpanded && (
                  <div className="bg-slate-50/80 dark:bg-[#0D1117]/70 px-4 py-3 border-t border-slate-100 dark:border-[#262E3A] space-y-2">
                    {app.subPaths.map((sp) => (
                      <div
                        key={sp.id}
                        className="flex items-center justify-between gap-3 pl-2 pr-1 py-1.5"
                      >
                        <button
                          type="button"
                          onClick={() => onToggleSubPath(app.id, sp.id)}
                          className="flex items-center gap-3 min-w-0 flex-1 text-left min-h-[44px]"
                        >
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                              sp.selected
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {sp.selected && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                              {sp.label}
                            </p>
                            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                              {sp.path}
                            </p>
                          </div>
                        </button>
                        <span className="font-mono tabular-nums text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                          {formatMB(sp.sizeMB)}
                        </span>
                      </div>
                    ))}

                    <div className="pt-2 border-t border-slate-200/70 dark:border-[#262E3A] flex justify-end">
                      <button
                        type="button"
                        onClick={() => onExcludeApp(app)}
                        className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                      >
                        <ShieldPlus className="w-4 h-4 text-emerald-500" />
                        <span>Proteger na Lista de Exclusões</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile Sticky CTA above Bottom Nav */}
      {caches.length > 0 && selectedMB > 0 && (
        <div className="lg:hidden fixed bottom-[68px] left-0 right-0 z-30 px-4 pb-2 pointer-events-none">
          <div className="pointer-events-auto max-w-md mx-auto">
            <button
              type="button"
              disabled={isCleaning}
              onClick={onCleanSelected}
              className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-sm font-semibold shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {isCleaning ? 'Esvaziando cache...' : `Limpar Cache (${formatMB(selectedMB)})`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
