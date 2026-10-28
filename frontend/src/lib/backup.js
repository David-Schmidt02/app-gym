import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { api } from './api';
import { hoyIso } from './formato';

/**
 * Exporta la base completa a un archivo JSON.
 * En Android abre la hoja nativa de compartir (Drive, WhatsApp, etc.).
 * En navegador web descarga el archivo directamente.
 */
export async function exportarRespaldo() {
  const datos = await api('/backup');
  const nombreArchivo = `gym-respaldo-${hoyIso()}.json`;
  const jsonStr = JSON.stringify(datos, null, 2);

  if (Capacitor.isNativePlatform()) {
    try {
      const res = await Filesystem.writeFile({
        path: nombreArchivo,
        data: jsonStr,
        directory: Directory.Cache,
      });

      await Share.share({
        title: 'Respaldo Gym',
        text: `Respaldo de entrenamientos Gym al ${hoyIso()}`,
        url: res.uri,
        dialogTitle: 'Guardar respaldo de Gym',
      });
      return { exito: true, metodo: 'share' };
    } catch {
      // Fallback a descarga web si el usuario canceló o el plugin falló
    }
  }

  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { exito: true, metodo: 'descarga' };
}

/**
 * Lee un archivo .json seleccionado por el usuario y restaura la base local.
 */
export async function restaurarRespaldo(archivo) {
  const texto = await archivo.text();
  const datos = JSON.parse(texto);
  await api('/backup/importar', { method: 'POST', body: datos });
  return true;
}
