/**
 * Chart export utilities for CSV and PNG downloads.
 */

/**
 * Trigger a file download in the browser by creating a temporary anchor element.
 */
function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export an array of data objects to a CSV file and trigger a download.
 *
 * @param data - Array of objects to convert to CSV rows
 * @param filename - Download filename (without extension)
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;

  // Collect all unique keys across every row to form the header
  const headers = Array.from(
    data.reduce<Set<string>>((keys, row) => {
      Object.keys(row).forEach((k) => keys.add(k));
      return keys;
    }, new Set())
  );

  const escapeCell = (value: unknown): string => {
    const str = value == null ? '' : String(value);
    // Wrap in quotes if the value contains a comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [
    headers.map(escapeCell).join(','),
    ...data.map((row) => headers.map((h) => escapeCell(row[h])).join(',')),
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  triggerDownload(url, `${filename}.csv`);
  URL.revokeObjectURL(url);
}

/**
 * Render an SVG element to a PNG image and trigger a download.
 *
 * The function clones the SVG, inlines computed styles for text elements
 * (so that Tailwind classes render correctly on the canvas), serialises it
 * to a blob URL, draws it onto an off-screen canvas, and finally exports
 * the canvas as a PNG.
 *
 * @param svgElement - The SVG DOM element to export
 * @param filename - Download filename (without extension)
 */
export function exportToPNG(svgElement: SVGSVGElement, filename: string) {
  // Clone so we can modify without affecting the live DOM
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // Inline computed styles on text elements so they render on canvas
  const originalTexts = svgElement.querySelectorAll('text');
  const clonedTexts = clone.querySelectorAll('text');
  originalTexts.forEach((orig, i) => {
    const computed = window.getComputedStyle(orig);
    const cloned = clonedTexts[i];
    if (cloned) {
      cloned.setAttribute('fill', computed.fill || computed.color || '#94a3b8');
      cloned.setAttribute('font-size', computed.fontSize || '12px');
      cloned.setAttribute('font-family', computed.fontFamily || 'sans-serif');
    }
  });

  // Ensure the SVG has explicit width/height attributes for the canvas
  const bbox = svgElement.getBoundingClientRect();
  const width = bbox.width;
  const height = bbox.height;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  // Add a dark background rect so the PNG isn't transparent
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', '#0f172a'); // slate-900
  clone.insertBefore(bgRect, clone.firstChild);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    // Use 2x scale for sharper output on retina displays
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);

    URL.revokeObjectURL(url);

    const pngUrl = canvas.toDataURL('image/png');
    triggerDownload(pngUrl, `${filename}.png`);
  };

  img.onerror = () => {
    URL.revokeObjectURL(url);
    console.error('Failed to render SVG to PNG');
  };

  img.src = url;
}
