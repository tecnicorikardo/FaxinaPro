import React, { useState } from 'react';
import {
  CalendarClock,
  Check,
  History,
  Moon,
  PieChart,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import {
  CleanHistoryEntry,
  ExclusionRule,
  SchedulerSettings,
} from '../types/cleaner';
import { formatMB } from '../utils/formatters';

export type ToolsSection = 'analyzer' | 'scheduler' | 'exclusions' | 'history';

interface ToolsSheetModalProps {
  isOpen: boolean;
  initialSection: ToolsSection;
  isDark: boolean;
  totalStorageMB: number;
  usedStorageMB: number;
  cacheTotalMB: number;
  residueTotalMB: number;
  appsTotalMB: number;
  scheduler: SchedulerSettings;
  exclusions: ExclusionRule[];
  history: CleanHistoryEntry[];
  onClose: () => void;
  onToggleTheme: () => void;
  onUpdateScheduler: (next: SchedulerSettings) => void;
  onAddExclusion: (label: string, target: string, scope: ExclusionRule['scope']) => void;
  onRemoveExclusion: (id: string) => void;
  onClearHistory: () => void;
  onResetAllDemoData: () => void;
}

export const ToolsSheetModal: React.FC<ToolsSheetModalProps> = ({
  isOpen,
  initialSection,
  isDark,
  totalStorageMB,
  usedStorageMB,
  cacheTotalMB,
  residueTotalMB,
  appsTotalMB,
  scheduler,
  exclusions,
  history,
  onClose,
  onToggleTheme,
  onUpdateScheduler,
  onAddExclusion,
  onRemoveExclusion,
  onClearHistory,
  onResetAllDemoData,
}) => {
  const [section, setSection] = useState<ToolsSection>(initialSection);
  const [newPath, setNewPath] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newScope, setNewScope] = useState<ExclusionRule['scope']>('residuos');

  React.useEffect(() => {
    if (isOpen) setSection(initialSection);
  }, [isOpen, initialSection]);

  if (!isOpen) return null;

  const mediaAndOsMB = Math.max(0, usedStorageMB - cacheTotalMB - residueTotalMB - appsTotalMB);
  const freeMB = Math.max(0, totalStorageMB - usedStorageMB);

  const storageCategories = [
    { label: 'Sistema, Fotos & Vídeos', mb: mediaAndOsMB, color: 'bg-slate-500' },
    { label: 'Aplicativos Instalados', mb: appsTotalMB, color: 'bg-sky-500' },
    { label: 'Cache de Apps (Recuperável)', mb: cacheTotalMB, color: 'bg-emerald-500' },
    { label: 'Resíduos & Cadáveres', mb: residueTotalMB, color: 'bg-amber-500' },
    { label: 'Espaço Livre', mb: freeMB, color: 'bg-slate-300 dark:bg-slate-700' },
  ];

  const handleCreateExclusion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPath.trim()) return;
    onAddExclusion(
      newLabel.trim() || newPath.trim().split('/').pop() || 'Regra Personalizada',
      newPath.trim(),
      newScope
    );
    setNewPath('');
    setNewLabel('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tools-modal-title"
    >
      <div className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Sheet Handle + Header */}
        <div className="px-5 pt-3 pb-4 border-b border-slate-200 dark:border-[#262E3A]">
          <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between gap-4">
            <h2 id="tools-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Ferramentas & Ajustes Pro
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-[#262E3A] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                <span>{isDark ? 'Claro' : 'Escuro'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar ajustes"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Section Switcher */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
            {(
              [
                ['analyzer', 'Analisador', PieChart],
                ['scheduler', 'Agendador', CalendarClock],
                ['exclusions', 'Exclusões', ShieldCheck],
                ['history', 'Histórico', History],
              ] as [ToolsSection, string, React.ElementType][]
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  section === key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-[#0D1117] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {section === 'analyzer' && (
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Mapa de Ocupação do Armazenamento
                </h3>
                <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                  Total: {formatMB(totalStorageMB)}
                </span>
              </div>

              <div className="space-y-3">
                {storageCategories.map((cat) => {
                  const pct = Math.max(1, Math.round((cat.mb / totalStorageMB) * 100));
                  return (
                    <div key={cat.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {cat.label}
                        </span>
                        <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                          {formatMB(cat.mb)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className={`h-full rounded-full ${cat.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-[#262E3A] flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Restaurar estado inicial de demonstração do aparelho
                </span>
                <button
                  type="button"
                  onClick={onResetAllDemoData}
                  className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Resetar Dados</span>
                </button>
              </div>
            </div>
          )}

          {section === 'scheduler' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#262E3A]">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Limpeza Automática Agendada
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {scheduler.enabled ? scheduler.nextRunLabel : 'Agendador desativado'}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={scheduler.enabled}
                  onClick={() =>
                    onUpdateScheduler({ ...scheduler, enabled: !scheduler.enabled })
                  }
                  className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold transition-colors ${
                    scheduler.enabled
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {scheduler.enabled ? 'Ativado' : 'Ativar'}
                </button>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Frequência de execução
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['diario', 'Diário'],
                      ['3dias', 'A cada 3 dias'],
                      ['semanal', 'Semanal'],
                    ] as [SchedulerSettings['frequency'], string][]
                  ).map(([freq, label]) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() =>
                        onUpdateScheduler({
                          ...scheduler,
                          frequency: freq,
                          nextRunLabel:
                            freq === 'diario'
                              ? 'Hoje às 03:00 (carregando)'
                              : freq === '3dias'
                                ? 'Em 2 dias às 03:00 (carregando)'
                                : 'Próximo domingo às 03:00',
                        })
                      }
                      className={`min-h-[44px] rounded-xl text-xs font-semibold border transition-colors ${
                        scheduler.frequency === freq
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-slate-200 dark:border-[#262E3A] text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Módulos incluídos na rotina automática
                </p>
                {(
                  [
                    ['autoCleanCache', 'AppCleaner (Cache de aplicativos)'],
                    ['autoCleanCorpses', 'CorpseFinder (Pastas órfãs de apps removidos)'],
                    ['autoCleanTemp', 'SystemCleaner (.tmp, .log e pastas vazias)'],
                  ] as const
                ).map(([key, label]) => {
                  const active = scheduler[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onUpdateScheduler({ ...scheduler, [key]: !active })}
                      className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-[#262E3A] text-left min-h-[48px]"
                    >
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {label}
                      </span>
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                          active
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {section === 'exclusions' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Pastas, pacotes ou caminhos adicionados aqui nunca serão tocados pelas limpezas automáticas ou manuais.
              </p>

              <form onSubmit={handleCreateExclusion} className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#262E3A]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Nome (ex: Documentos fiscais)"
                    className="min-h-[44px] px-3 rounded-xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] text-xs text-slate-900 dark:text-slate-100"
                  />
                  <select
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value as ExclusionRule['scope'])}
                    className="min-h-[44px] px-3 rounded-xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="residuos">Resíduos / Pastas</option>
                    <option value="cache">Cache de App</option>
                    <option value="apps">Aplicativo Protegido</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                    placeholder="Caminho ou pacote (ex: /storage/emulated/0/Backup)"
                    className="flex-1 min-h-[44px] px-3 rounded-xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </form>

              {exclusions.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Nenhuma exclusão cadastrada.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-[#262E3A] border border-slate-200 dark:border-[#262E3A] rounded-xl overflow-hidden">
                  {exclusions.map((exc) => (
                    <div key={exc.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {exc.label}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                          {exc.target} · {exc.addedAt}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveExclusion(exc.id)}
                        aria-label={`Remover exclusão ${exc.label}`}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Registro de Limpezas Realizadas
                </h3>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="min-h-[44px] px-3 text-xs font-semibold text-rose-500 hover:underline"
                  >
                    Limpar histórico
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Nenhum registro no histórico.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-[#262E3A] border border-slate-200 dark:border-[#262E3A] rounded-xl overflow-hidden">
                  {history.map((h) => (
                    <div key={h.id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {h.module}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400">
                          {h.timestamp} · {h.itemsRemoved} itens removidos
                        </p>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        +{formatMB(h.freedMB)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
