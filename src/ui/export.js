// Turning art into files: SVG text, PNG blobs, downloads and the Web Share sheet.

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** The page ground, so exported PNGs look like they do on screen. */
export const groundColor = () => cssVar('--bg');

/** Renders an artwork SVG to a PNG blob on the page ground, at `scale` times its 240 x 380 size. */
export function svgToPng(svg, scale = 4) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 240 * scale;
      c.height = 380 * scale;
      const g = c.getContext('2d');
      g.fillStyle = groundColor();
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))), 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not draw the artwork'));
    };
    img.src = url;
  });
}

export function canvasToBlob(canvas, type = 'image/png', quality) {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), type, quality));
}

export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const svgBlob = (svg) => new Blob([svg], { type: 'image/svg+xml' });

/** A file-name-safe slug, such as "dragon-curve". */
export const slug = (s) => String(s || 'design').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'design';

const coarse = window.matchMedia('(pointer: coarse)');

/**
 * Shares an image (and a link when there is one). Phones get the system share sheet; desktops,
 * or browsers without file sharing, get the link copied, or the image downloaded if there is no link.
 * @returns {Promise<'shared' | 'copied' | 'downloaded' | 'cancelled'>}
 */
export async function share({ blob, filename, url, title }) {
  const file = blob ? new File([blob], filename, { type: blob.type }) : null;
  if (coarse.matches && navigator.share) {
    const withFile = { files: file ? [file] : undefined, title, text: url ? title + ' ' + url : title };
    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share(withFile);
        return 'shared';
      }
      if (url) {
        await navigator.share({ title, url });
        return 'shared';
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  if (url && (await copyText(url))) return 'copied';
  if (blob) {
    download(blob, filename);
    return 'downloaded';
  }
  return 'cancelled';
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
