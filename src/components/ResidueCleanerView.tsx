import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  FolderOpen,
  FolderX,
  HardDriveDownload,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { RealFolderEntry, ResidueItem, ResidueKind } from '../types/cleaner';
import { formatBytes, formatMB } from '../utils/formatters';

interface ResidueCleanerViewProps {
  residues: ResidueItem[];
  isCleaning: boolean;
  onToggleResidue: (id: string) => void;
  onSelectByKind: (kind: ResidueKind | 'todos', selected: boolean) => void;
  onExcludeResidue: (item: ResidueItem) => void;
  onRemoveSingleResidue: (id: string) => void;
  onCleanSelectedResidues: () => void;
  onRescanResidues: () => void;
}

type ResidueTab = 'todos' | 'cadaver' | 'sistema' | 'duplicado' | 'pasta_real';

interface DirectoryHandleLike {
  name: string;
  values(): AsyncIterable<{
    kind: 'file' | 'directory';
    name: string;
    getFile?: () => Promise<File>;
    values?: () => AsyncIterable<unknown>;
  }>;
}

export const ResidueCleanerView: React.FC<ResidueCleanerViewProps> = ({
  residues,
  isCleaning,
  onToggleResidue,
  onSelectByKind,
  onExcludeResidue,
  onRemoveSingleResidue,
  onCleanSelectedResidues,
  onRescanResidues,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ResidueTab>('todos');
  const [inspectedItem, setInspectedItem] = useState<ResidueItem | null>(null);

  // Real folder scanner state (File System Access API / Browser Cache fallback)
  const [realFolderName, setRealFolderName] = useState<string | null>(null);
  const [realEntries, setRealEntries] = useState<RealFolderEntry[]>([]);
  const [isScanningReal, setIsScanningReal] = useState(false);
  const [realScanMessage, setRealScanMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (activeSubTab === 'todos') return residues;
    if (activeSubTab === 'pasta_real') return [];
    return residues.filter((r) => r.kind === activeSubTab);
  }, [residues, activeSubTab]);

  const totalMB = useMemo(
    () => residues.reduce((sum, r) => sum + r.sizeMB, 0),
    [residues]
  );

  const selectedMB = useMemo(
    () => residues.filter((r) => r.selected).reduce((sum, r) => sum + r.sizeMB, 0),
    [residues]
  );

  const selectedCount = useMemo(
    () => residues.filter((r) => r.selected).length,
    [residues]
  );

  const corpseCount = residues.filter((r) => r.kind === 'cadaver').length;
  const sysCount = residues.filter((r) => r.kind === 'sistema').length;
  const dupCount = residues.filter((r) => r.kind === 'duplicado').length;

  const classifyRealFile = (name: string, sizeBytes: number): RealFolderEntry['kind'] => {
    const lower = name.toLowerCase();
    if (lower.endsWith('.tmp') || lower.endsWith('.temp') || lower.endsWith('.bak') || lower.startsWith('~$')) {
      return 'temp';
    }
    if (lower.endsWith('.log') || lower.endsWith('.dmp') || lower.endsWith('.trace')) {
      return 'log';
    }
    if (lower.endsWith('.apk') || lower.endsWith('.xapk')) {
      return 'apk';
    }
    if (lower.includes('cache') || lower.includes('thumb')) {
      return 'cache';
    }
    if (sizeBytes === 0) return 'empty';
    return 'large';
  };

  const handleScanRealDirectory = async () => {
    setRealScanMessage(null);
    const win = window as unknown as {
      showDirectoryPicker?: () => Promise<DirectoryHandleLike>;
    };

    if (typeof win.showDirectoryPicker === 'function') {
      try {
        setIsScanningReal(true);
        const dirHandle = await win.showDirectoryPicker();
        setRealFolderName(dirHandle.name);

        const found: RealFolderEntry[] = [];
        let scannedCount = 0;

        async function walk(handle: DirectoryHandleLike, prefix: string, depth: number) {
          if (depth > 3 || scannedCount > 400) return;
          let childCount = 0;
          for await (const entry of handle.values()) {
            childCount++;
            scannedCount++;
            if (scannedCount > 400) break;
            const rel = prefix ? `${prefix}/${entry.name}` : entry.name;

            if (entry.kind === 'file' && entry.getFile) {
              try {
                const file = await entry.getFile();
                const kind = classifyRealFile(entry.name, file.size);
                const isUsefulTarget =
                  kind === 'temp' ||
                  kind === 'log' ||
                  kind === 'apk' ||
                  kind === 'cache' ||
                  kind === 'empty' ||
                  file.size > 10 * 1024 * 1024;
                if (isUsefulTarget) {
                  found.push({
                    id: `real-${rel}-${file.size}`,
                    name: entry.name,
                    relativePath: rel,
                    sizeBytes: file.size,
                    kind,
                    selected: kind === 'temp' || kind === 'log' || kind === 'empty',
                  });
                }
              } catch {
                // Skip unreadable file handle
              }
            } else if (entry.kind === 'directory' && entry.values) {
              await walk(entry as unknown as DirectoryHandleLike, rel, depth + 1);
            }
          }
          if (childCount === 0 && prefix) {
            found.push({
              id: `real-empty-dir-${prefix}`,
              name: prefix.split('/').pop() || prefix,
              relativePath: prefix,
              sizeBytes: 0,
              kind: 'empty',
              selected: true,
            });
          }
        }

        await walk(dirHandle, '', 0);
        setRealEntries(found);
        setRealScanMessage(
          found.length > 0
            ? `${found.length} arquivos temporários, logs, APKs ou grandes encontrados em "${dirHandle.name}".`
            : `Pasta "${dirHandle.name}" analisada (${scannedCount} itens) — nenhum resíduo suspeito encontrado.`
        );
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          setRealScanMessage('Não foi possível ler a pasta selecionada.');
        }
      } finally {
        setIsScanningReal(false);
      }
    } else {
      // Fallback: inspect real browser Cache Storage & LocalStorage
      setIsScanningReal(true);
      try {
        const found: RealFolderEntry[] = [];
        if ('caches' in window) {
          const keys = await caches.keys();
          for (const key of keys) {
            const cache = await caches.open(key);
            const requests = await cache.keys();
            found.push({
              id: `browser-cache-${key}`,
              name: `Cache Web: ${key}`,
              relativePath: `CacheStorage/${key} (${requests.length} recursos)`,
              sizeBytes: requests.length * 48 * 1024,
              kind: 'cache',
              selected: false,
            });
          }
        }
        setRealFolderName('Armazenamento Web do Dispositivo');
        setRealEntries(found);
        setRealScanMessage(
          'Seu navegador não suporta seleção direta de pastas do sistema. Exibindo caches reais da Web armazenados neste aparelho.'
        );
      } finally {
        setIsScanningReal(false);
      }
    }
  };

  const handleCleanBrowserCaches = async () => {
    const selectedCacheIds = realEntries.filter((e) => e.selected && e.id.startsWith('browser-cache-'));
    if (selectedCacheIds.length > 0 && 'caches' in window) {
      for (const item of selectedCacheIds) {
        const key = item.id.replace('browser-cache-', '');
        await caches.delete(key);
      }
    }
    setRealEntries((prev) => prev.filter((e) => !e.selected));
    setRealScanMessage('Itens selecionados limpos da lista de verificação.');
  };

  const kindLabel = (kind: ResidueKind): string => {
    if (kind === 'cadaver') return 'Cadáver de App';
    if (kind === 'sistema') return 'Lixo de Sistema';
    return 'Duplicado';
  };

  return (
    <div className="space-y-5 pb-28 lg:pb-8">
      {/* Header Summary Card */}
      <div className="rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Resíduos & Cadáveres (CorpseFinder)
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Restos de apps desinstalados, arquivos inúteis (.tmp, .log, .apk), pastas vazias e cópias duplicadas.
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {formatMB(selectedMB)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {selectedCount} grupos marcados · total {formatMB(totalMB)}
            </div>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="mt-5 flex items-center gap-1.5 overflow-x-auto pb-1">
          {(
            [
              ['todos', `Todos (${residues.length})`],
              ['cadaver', `Cadáveres (${corpseCount})`],
              ['sistema', `Sistema (${sysCount})`],
              ['duplicado', `Duplicados (${dupCount})`],
              ['pasta_real', 'Pasta Real'],
            ] as [ResidueTab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSubTab(key)}
              className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeSubTab === key
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-[#0D1117] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeSubTab !== 'pasta_real' && residues.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#262E3A] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  onSelectByKind(
                    activeSubTab === 'todos' ? 'todos' : activeSubTab,
                    true
                  )
                }
                className="min-h-[44px] px-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap"
              >
                Marcar seguros
              </button>
              <button
                type="button"
                onClick={() =>
                  onSelectByKind(
                    activeSubTab === 'todos' ? 'todos' : activeSubTab,
                    false
                  )
                }
                className="min-h-[44px] px-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 whitespace-nowrap"
              >
                Desmarcar
              </button>
            </div>

            <button
              type="button"
              disabled={isCleaning || selectedMB <= 0}
              onClick={onCleanSelectedResidues}
              className="hidden lg:inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {isCleaning ? 'Removendo...' : `Remover Resíduos (${formatMB(selectedMB)})`}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Real Device Folder Scanner Panel */}
      {activeSubTab === 'pasta_real' ? (
        <div className="rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Analisador de Pasta Real do Dispositivo
                </h2>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                  Selecione uma pasta local (como Downloads ou Documentos) para localizar arquivos .tmp, .log, .apk antigos e diretórios vazios reais.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isScanningReal}
              onClick={handleScanRealDirectory}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <HardDriveDownload className="w-4 h-4" />
              <span>{isScanningReal ? 'Analisando...' : 'Escolher Pasta para Escanear'}</span>
            </button>
          </div>

          {realScanMessage && (
            <div className="rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#262E3A] p-3.5 text-xs text-slate-700 dark:text-slate-300">
              {realScanMessage}
            </div>
          )}

          {realEntries.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Pasta: {realFolderName} ({realEntries.length} itens)
                </span>
                {realEntries.some((e) => e.selected && e.id.startsWith('browser-cache-')) && (
                  <button
                    type="button"
                    onClick={handleCleanBrowserCaches}
                    className="min-h-[44px] px-3 rounded-xl bg-amber-600 text-white text-xs font-semibold"
                  >
                    Limpar Caches Web Selecionados
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 dark:divide-[#262E3A] border border-slate-200 dark:border-[#262E3A] rounded-xl overflow-hidden">
                {realEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-[#161B22]"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setRealEntries((prev) =>
                          prev.map((item) =>
                            item.id === entry.id ? { ...item, selected: !item.selected } : item
                          )
                        )
                      }
                      className="flex items-center gap-3 min-w-0 flex-1 text-left min-h-[44px]"
                    >
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                          entry.selected
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {entry.selected && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {entry.name}
                        </p>
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                          {entry.relativePath} · {entry.kind}
                        </p>
                      </div>
                    </button>
                    <span className="font-mono tabular-nums text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                      {formatBytes(entry.sizeBytes)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : residues.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] p-8 text-center">
          <Sparkles className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Nenhum resíduo ou pasta órfã encontrada
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Todos os diretórios de sistema e restos de aplicativos foram removidos.
          </p>
          <button
            type="button"
            onClick={onRescanResidues}
            className="mt-4 inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Executar Nova Varredura
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Nenhum item nesta categoria no momento.
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] divide-y divide-slate-100 dark:divide-[#262E3A] overflow-hidden">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-3.5 min-h-[68px] hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
            >
              {/* 44x44px Checkbox */}
              <button
                type="button"
                role="checkbox"
                aria-checked={item.selected}
                aria-label={`Selecionar ${item.title}`}
                onClick={() => onToggleResidue(item.id)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60"
              >
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    item.selected
                      ? 'bg-amber-600 border-amber-600 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {item.selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </span>
              </button>

              {/* Kind Icon */}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  item.safety === 'seguro'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                }`}
              >
                {item.kind === 'cadaver' ? (
                  <FolderX className="w-5 h-5" />
                ) : item.safety === 'revisar' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </div>

              {/* Main Info - tap to inspect Bottom Sheet */}
              <button
                type="button"
                onClick={() => setInspectedItem(item)}
                className="flex-1 min-w-0 text-left py-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {item.title}
                  </span>
                  <span className="font-mono tabular-nums text-sm font-bold text-amber-600 dark:text-amber-400 shrink-0">
                    {formatMB(item.sizeMB)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                  <span>{kindLabel(item.kind)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{item.itemCount} itens</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      item.safety === 'seguro'
                        ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                        : 'text-amber-600 dark:text-amber-400 font-medium'
                    }
                  >
                    {item.safety === 'seguro' ? 'Seguro' : 'Revisar'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setInspectedItem(item)}
                aria-label={`Inspecionar ${item.title}`}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mobile Sticky CTA */}
      {activeSubTab !== 'pasta_real' && residues.length > 0 && selectedMB > 0 && (
        <div className="lg:hidden fixed bottom-[68px] left-0 right-0 z-30 px-4 pb-2 pointer-events-none">
          <div className="pointer-events-auto max-w-md mx-auto">
            <button
              type="button"
              disabled={isCleaning}
              onClick={onCleanSelectedResidues}
              className="w-full min-h-[48px] rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white text-sm font-semibold shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {isCleaning ? 'Removendo...' : `Remover Resíduos (${formatMB(selectedMB)})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Sheet Inspection Drawer */}
      {inspectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="residue-sheet-title"
        >
          <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] p-6 shadow-2xl">
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  {kindLabel(inspectedItem.kind)} · {inspectedItem.subType}
                </p>
                <h3 id="residue-sheet-title" className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                  {inspectedItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedItem(null)}
                aria-label="Fechar detalhes"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#262E3A] p-4 space-y-2.5 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Caminho no sistema:</span>
                <p className="mt-0.5 font-mono text-slate-900 dark:text-slate-100 break-all">
                  {inspectedItem.path}
                </p>
              </div>
              {inspectedItem.originApp && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Origem detectada:</span>
                  <p className="mt-0.5 font-mono text-slate-800 dark:text-slate-200">
                    {inspectedItem.originApp}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-[#262E3A]">
                <span className="text-slate-500 dark:text-slate-400">
                  {inspectedItem.itemCount} arquivos · {inspectedItem.lastModified}
                </span>
                <span className="font-mono tabular-nums font-bold text-amber-600 dark:text-amber-400">
                  {formatMB(inspectedItem.sizeMB)}
                </span>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {inspectedItem.description}
            </p>

            <div className="mt-3 flex items-center gap-2 text-xs">
              {inspectedItem.safety === 'seguro' ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Classificação SD Maid Pro: Seguro para remoção imediata.
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Atenção: revise antes de apagar caso ainda utilize esses anexos.
                  </span>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  onExcludeResidue(inspectedItem);
                  setInspectedItem(null);
                }}
                className="flex-1 min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-2"
              >
                <ShieldPlus className="w-4 h-4 text-emerald-500" />
                <span>Proteger (Excluir)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onRemoveSingleResidue(inspectedItem.id);
                  setInspectedItem(null);
                }}
                className="flex-1 min-h-[44px] px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remover Agora</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
