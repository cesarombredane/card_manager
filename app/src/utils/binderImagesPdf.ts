import { jsPDF } from 'jspdf';

export type PrintableBinderImage = {
  name: string;
  url: string;
  width: number;
  height: number;
};

// Vault X specifies a 68 × 97 mm internal pocket size for its standard binders.
const pocketWidthMm = 68;
const pocketHeightMm = 97;
const pageColumns = 3;
const pageRows = 3;
const pageWidthMm = 210;
const pageHeightMm = 297;
const marginLeftMm = (pageWidthMm - pageColumns * pocketWidthMm) / 2;
const marginTopMm = (pageHeightMm - pageRows * pocketHeightMm) / 2;

type PositionedImage = PrintableBinderImage & {
  page: number;
  column: number;
  row: number;
};

const safeFileName = (value: string): string =>
  value.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'binder';

const printableImage = async (url: string, width: number, height: number): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load binder image (${response.status})`);
  const objectUrl = URL.createObjectURL(await response.blob());
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Unable to decode binder image'));
      element.src = objectUrl;
    });
    // Render at the same physical aspect ratio used in the PDF. A slot-count-based
    // square canvas would be stretched when inserted into a 68 × 97 mm pocket.
    const targetWidth = Math.max(1, Math.round(width * pocketWidthMm * 10));
    const targetHeight = Math.max(1, Math.round(height * pocketHeightMm * 10));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to prepare binder image');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, targetWidth, targetHeight);
    // Fill the complete pocket area while preserving the source aspect ratio.
    // Any overflow is cropped equally from opposite sides.
    const scale = Math.max(targetWidth / image.naturalWidth, targetHeight / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    context.drawImage(image, (targetWidth - drawWidth) / 2, (targetHeight - drawHeight) / 2, drawWidth, drawHeight);
    return canvas.toDataURL('image/jpeg', 0.95);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const positionImages = (images: PrintableBinderImage[]): PositionedImage[] => {
  const pages: boolean[][][] = [];
  return images.map((image) => {
    const width = Math.min(pageColumns, Math.max(1, Math.floor(image.width)));
    const height = Math.min(pageRows, Math.max(1, Math.floor(image.height)));
    for (let page = 0; ; page += 1) {
      const cells = pages[page] ?? Array.from({ length: pageRows }, () => Array(pageColumns).fill(false));
      pages[page] = cells;
      for (let row = 0; row <= pageRows - height; row += 1) {
        for (let column = 0; column <= pageColumns - width; column += 1) {
          const isFree = Array.from({ length: height }, (_, rowOffset) =>
            Array.from({ length: width }, (_, columnOffset) => !cells[row + rowOffset][column + columnOffset])
          ).every((rowCells) => rowCells.every(Boolean));
          if (!isFree) continue;
          for (let rowOffset = 0; rowOffset < height; rowOffset += 1) {
            for (let columnOffset = 0; columnOffset < width; columnOffset += 1) {
              cells[row + rowOffset][column + columnOffset] = true;
            }
          }
          return { ...image, width, height, page, column, row };
        }
      }
    }
  });
};

export const downloadBinderImagesPdf = async (
  binderName: string,
  images: PrintableBinderImage[]
): Promise<void> => {
  if (images.length === 0) throw new Error('Select at least one binder image to print');
  const positionedImages = positionImages([...images].sort((left, right) => right.width * right.height - left.width * left.height));
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({
    title: `${binderName} binder images`,
    subject: 'Binder images sized for 68 × 97 mm Vault X pockets'
  });

  const pageCount = Math.max(...positionedImages.map((image) => image.page)) + 1;
  for (let page = 1; page < pageCount; page += 1) pdf.addPage();

  for (const image of positionedImages) {
    pdf.setPage(image.page + 1);
    const x = marginLeftMm + image.column * pocketWidthMm;
    const y = marginTopMm + image.row * pocketHeightMm;
    const width = image.width * pocketWidthMm;
    const height = image.height * pocketHeightMm;
    pdf.addImage(await printableImage(image.url, image.width, image.height), 'JPEG', x, y, width, height, undefined, 'FAST');
    pdf.setDrawColor(80);
    pdf.setLineWidth(0.2);
    pdf.rect(x, y, width, height);
  }

  pdf.save(`${safeFileName(binderName)}-binder-images.pdf`);
};
