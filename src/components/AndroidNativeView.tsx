import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileCode2,
  FolderArchive,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';
import { buildZipBlob } from '../utils/zipBuilder';

const androidRawFiles = import.meta.glob('/android/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

interface AndroidPermissionSpec {
  permission: string;
  purpose: string;
  apiUsed: string;
  critical: boolean;
}

const ANDROID_PERMISSIONS: AndroidPermissionSpec[] = [
  {
    permission: 'MANAGE_EXTERNAL_STORAGE',
    purpose:
      'Acesso completo ao armazenamento (/storage/emulated/0) para apagar pastas órfãs em Android/obb, arquivos .tmp, .log, .bak, .thumbnails e diretórios vazios.',
    apiUsed: 'Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION',
    critical: true,
  },
  {
    permission: 'BIND_ACCESSIBILITY_SERVICE',
    purpose:
      'Técnica oficial do SD Maid Pro para aparelhos sem Root: automatiza os toques em "Armazenamento -> Limpar cache" e confirma cada diálogo de desinstalação na fila em massa.',
    apiUsed: 'CleanerAccessibilityService : AccessibilityService',
    critical: true,
  },
  {
    permission: 'PACKAGE_USAGE_STATS',
    purpose:
      'Permite ler o tamanho real de cache, dados e APK de cada app instalado e identificar aplicativos sem uso há mais de 60 dias.',
    apiUsed: 'StorageStatsManager + UsageStatsManager',
    critical: true,
  },
  {
    permission: 'SAF (ACTION_OPEN_DOCUMENT_TREE)',
    purpose:
      'Concede acesso persistente à pasta restrita /Android/data no Android 11–15 para o CorpseFinder localizar e apagar sobras de apps já removidos.',
    apiUsed: 'DocumentFile.fromTreeUri()',
    critical: true,
  },
  {
    permission: 'QUERY_ALL_PACKAGES & REQUEST_DELETE_PACKAGES',
    purpose:
      'Lista todos os pacotes do aparelho e dispara a desinstalação automática sequencial em massa.',
    apiUsed: 'PackageManager + Intent(Intent.ACTION_DELETE)',
    critical: false,
  },
];

export const AndroidNativeView: React.FC = () => {
  const fileEntries = useMemo(() => {
    return Object.entries(androidRawFiles)
      .map(([path, content]) => ({
        path: path.replace(/^\//, ''),
        content,
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, []);

  const [selectedPath, setSelectedPath] = useState<string>(
    () =>
      fileEntries.find((f) => f.path.endsWith('AndroidManifest.xml'))?.path ||
      fileEntries[0]?.path ||
      ''
  );
  const [copied, setCopied] = useState(false);

  const selectedFile = fileEntries.find((f) => f.path === selectedPath) || fileEntries[0];

  const handleDownloadZip = () => {
    if (fileEntries.length === 0) return;
    const blob = buildZipBlob(fileEntries);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'FaxinaDroidPro-Android-Kotlin.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = async () => {
    if (!selectedFile) return;
    try {
      await navigator.clipboard.writeText(selectedFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* Top Banner */}
      <div className="rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Projeto Android Nativo (Kotlin + Jetpack Compose)
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Código-fonte Android completo com permissões de sistema, Serviço de Acessibilidade (padrão SD Maid Pro) e ícone da lixeira virada pro chão.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={fileEntries.length === 0}
            className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-sm font-semibold transition-all whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Projeto Android (.zip)</span>
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/25 p-3.5 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Como gerar o APK no seu aparelho:</strong> este ambiente de visualização executa no navegador (onde o Android bloqueia acesso de sistema). Baixe o arquivo <strong>.zip</strong> acima, abra a pasta <span className="font-mono">android/</span> no <strong>Android Studio</strong> e compile em <strong>Build &gt; Build APK(s)</strong> ou execute diretamente via USB no celular.
          </div>
        </div>
      </div>

      {/* Android Permissions Architecture Matrix */}
      <div className="rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] p-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
          Permissões Reais Implementadas no AndroidManifest.xml & Kotlin
        </h2>
        <div className="divide-y divide-slate-100 dark:divide-[#262E3A]">
          {ANDROID_PERMISSIONS.map((item) => (
            <div key={item.permission} className="py-3.5 first:pt-1 last:pb-1 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {item.permission}
                </span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {item.apiUsed}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.purpose}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Source Code Explorer */}
      <div className="rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#262E3A] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-[#262E3A] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            <FolderArchive className="w-4 h-4 text-emerald-500" />
            <span>Arquivos Kotlin, XML e Gradle ({fileEntries.length})</span>
          </div>

          {selectedFile && (
            <button
              type="button"
              onClick={handleCopyCode}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-[#262E3A] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar arquivo'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* File list */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-[#262E3A] max-h-64 lg:max-h-[520px] overflow-y-auto divide-y divide-slate-100 dark:divide-[#262E3A]">
            {fileEntries.map((file) => {
              const active = file.path === selectedFile?.path;
              const shortName = file.path.split('/').pop() || file.path;
              const folder = file.path.replace(`/${shortName}`, '');
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedPath(file.path)}
                  className={`w-full text-left px-4 py-2.5 min-h-[48px] flex items-center gap-2.5 transition-colors ${
                    active
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <FileCode2 className="w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{shortName}</p>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                      {folder}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Code preview */}
          <div className="lg:col-span-8 bg-[#0D1117] text-slate-200 p-4 max-h-[520px] overflow-auto">
            {selectedFile ? (
              <pre className="text-xs font-mono leading-relaxed whitespace-pre overflow-x-auto">
                <code>{selectedFile.content}</code>
              </pre>
            ) : (
              <p className="text-xs text-slate-400">Nenhum arquivo selecionado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
