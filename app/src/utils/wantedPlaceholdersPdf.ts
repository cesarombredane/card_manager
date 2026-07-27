import { jsPDF } from 'jspdf';
import type { DisplayCard } from './cardDisplay';

export type WantedPlaceholder = {
  card: DisplayCard;
  quantity: number;
};

const cardWidthMm = 63;
const cardHeightMm = 88;
const gapMm = 3;
const columns = 3;
const rows = 3;
const pageWidthMm = 210;
const pageHeightMm = 297;
const gridWidthMm = columns * cardWidthMm + (columns - 1) * gapMm;
const gridHeightMm = rows * cardHeightMm + (rows - 1) * gapMm;
const marginLeftMm = (pageWidthMm - gridWidthMm) / 2;
const marginTopMm = (pageHeightMm - gridHeightMm) / 2;

const grayscaleImage = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load card image (${response.status})`);
  const objectUrl = URL.createObjectURL(await response.blob());
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Unable to decode card image'));
      element.src = objectUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to prepare card image');
    context.filter = 'grayscale(1)';
    context.drawImage(image, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const safeFileName = (value: string): string =>
  value.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'collection';

export const downloadWantedPlaceholdersPdf = async (
  collectionName: string,
  placeholders: WantedPlaceholder[]
): Promise<void> => {
  const cards = placeholders.flatMap(({ card, quantity }) =>
    Array.from({ length: Math.max(1, Math.floor(quantity)) }, () => card)
  );
  if (cards.length === 0) throw new Error('There are no wanted cards to print');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({
    title: `${collectionName} wanted card placeholders`,
    subject: 'Black-and-white placeholders sized for Pokémon cards'
  });

  const cachedImages = new Map<string, Promise<string>>();
  for (let index = 0; index < cards.length; index += 1) {
    if (index > 0 && index % (columns * rows) === 0) pdf.addPage();
    const position = index % (columns * rows);
    const column = position % columns;
    const row = Math.floor(position / columns);
    const x = marginLeftMm + column * (cardWidthMm + gapMm);
    const y = marginTopMm + row * (cardHeightMm + gapMm);
    const card = cards[index];

    pdf.setDrawColor(70);
    pdf.setLineWidth(0.25);
    pdf.rect(x, y, cardWidthMm, cardHeightMm);

    if (card.image_url) {
      let imagePromise = cachedImages.get(card.image_url);
      if (!imagePromise) {
        imagePromise = grayscaleImage(card.image_url);
        cachedImages.set(card.image_url, imagePromise);
      }
      try {
        pdf.addImage(await imagePromise, 'JPEG', x, y, cardWidthMm, cardHeightMm, undefined, 'FAST');
        continue;
      } catch {
        // Fall through to a text placeholder when a local scan cannot be loaded.
      }
    }

    pdf.setTextColor(30);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    const title = pdf.splitTextToSize(card.display_name, cardWidthMm - 8);
    pdf.text(title, x + cardWidthMm / 2, y + cardHeightMm / 2 - 4, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(`${card.set_name ?? card.set_id} · #${card.number}`, x + cardWidthMm / 2, y + cardHeightMm / 2 + 8, {
      align: 'center',
      maxWidth: cardWidthMm - 8
    });
  }

  pdf.save(`${safeFileName(collectionName)}-wanted-placeholders.pdf`);
};
