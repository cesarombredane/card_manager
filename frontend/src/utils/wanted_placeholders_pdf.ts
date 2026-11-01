// import utils
import { jsPDF } from 'jspdf';

// import types
import type { Display_Card } from './card_display';

export type Wanted_Placeholder = {
  card: Display_Card;
  quantity: number;
};

const card_width_mm = 63;
const card_height_mm = 88;
const gap_mm = 3;
const columns = 3;
const rows = 3;
const page_width_mm = 210;
const page_height_mm = 297;
const grid_width_mm = columns * card_width_mm + (columns - 1) * gap_mm;
const grid_height_mm = rows * card_height_mm + (rows - 1) * gap_mm;
const margin_left_mm = (page_width_mm - grid_width_mm) / 2;
const margin_top_mm = (page_height_mm - grid_height_mm) / 2;

const grayscale_image = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load card image (${response.status})`);
  const object_url = URL.createObjectURL(await response.blob());
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Unable to decode card image'));
      element.src = object_url;
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
    URL.revokeObjectURL(object_url);
  }
};

const safe_file_name = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'collection';

export const download_wanted_placeholders_pdf = async (
  collection_name: string,
  placeholders: Wanted_Placeholder[],
): Promise<void> => {
  const cards = placeholders.flatMap(({ card, quantity }) =>
    Array.from({ length: Math.max(1, Math.floor(quantity)) }, () => card),
  );
  if (cards.length === 0) throw new Error('There are no wanted cards to print');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({
    title: `${collection_name} wanted card placeholders`,
    subject: 'Black-and-white placeholders sized for Pokémon cards',
  });

  const cached_images = new Map<string, Promise<string>>();
  for (let index = 0; index < cards.length; index += 1) {
    if (index > 0 && index % (columns * rows) === 0) pdf.addPage();
    const position = index % (columns * rows);
    const column = position % columns;
    const row = Math.floor(position / columns);
    const x = margin_left_mm + column * (card_width_mm + gap_mm);
    const y = margin_top_mm + row * (card_height_mm + gap_mm);
    const card = cards[index];

    pdf.setDrawColor(70);
    pdf.setLineWidth(0.25);
    pdf.rect(x, y, card_width_mm, card_height_mm);

    if (card.image_url) {
      let image_promise = cached_images.get(card.image_url);
      if (!image_promise) {
        image_promise = grayscale_image(card.image_url);
        cached_images.set(card.image_url, image_promise);
      }
      try {
        pdf.addImage(
          await image_promise,
          'JPEG',
          x,
          y,
          card_width_mm,
          card_height_mm,
          undefined,
          'FAST',
        );
        continue;
      } catch {
        // Fall through to a text placeholder when a local scan cannot be loaded.
      }
    }

    pdf.setTextColor(30);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    const title = pdf.splitTextToSize(card.display_name, card_width_mm - 8);
    pdf.text(title, x + card_width_mm / 2, y + card_height_mm / 2 - 4, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(
      `${card.set_name ?? card.set_id} · #${card.number}`,
      x + card_width_mm / 2,
      y + card_height_mm / 2 + 8,
      {
        align: 'center',
        maxWidth: card_width_mm - 8,
      },
    );
  }

  pdf.save(`${safe_file_name(collection_name)}-wanted-placeholders.pdf`);
};
