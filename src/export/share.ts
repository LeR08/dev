import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export type ExportResult = 'shared' | 'downloaded' | 'unavailable';

/**
 * Hands a generated file to the user.
 *
 * On device the file is written to the cache directory and passed to the share
 * sheet — that keeps the export a deliberate, user-initiated act, which is the
 * only way data ever leaves the device. In the browser it becomes a download.
 */
export async function exportText(
  fileName: string,
  content: string,
  mimeType: string
): Promise<ExportResult> {
  if (Platform.OS === 'web') {
    return downloadInBrowser(fileName, content, mimeType);
  }

  const file = new File(Paths.cache, fileName);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(content);

  if (!(await Sharing.isAvailableAsync())) {
    return 'unavailable';
  }

  await Sharing.shareAsync(file.uri, {
    mimeType,
    dialogTitle: 'Export your log',
    UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json',
  });
  return 'shared';
}

function downloadInBrowser(fileName: string, content: string, mimeType: string): ExportResult {
  if (typeof document === 'undefined') return 'unavailable';

  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Give the browser a beat to start the download before revoking the handle.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
