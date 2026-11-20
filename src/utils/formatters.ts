export function formatMB(mb: number): string {
  if (mb <= 0) return '0 MB';
  if (mb < 1) {
    return `${Math.round(mb * 1024)} KB`;
  }
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2).replace('.', ',')} GB`;
  }
  if (mb >= 100) {
    return `${Math.round(mb)} MB`;
  }
  return `${mb.toFixed(1).replace('.', ',')} MB`;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2).replace('.', ',')} GB`;
}

export function formatTimestamp(isoOrDate: Date = new Date()): string {
  return isoOrDate.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
