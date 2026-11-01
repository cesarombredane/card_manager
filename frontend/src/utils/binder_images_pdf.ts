// import utils
import { jsPDF } from 'jspdf';

export type Printable_Binder_Image = {
  name: string;
  url: string;
  width: number;
  height: number;
};

// Vault X specifies a 68 × 97 mm internal pocket size for its standard binders.
const pocket_width_mm = 68;
const pocket_height_mm = 97;
const page_columns = 3;
const page_rows = 3;
const page_width_mm = 210;
const page_height_mm = 297;
const margin_left_mm = (page_width_mm - page_columns * pocket_width_mm) / 2;
const margin_top_mm = (page_height_mm - page_rows * pocket_height_mm) / 2;

type Positioned_Image = Printable_Binder_Image & {
  page: number;
  column: number;
  row: number;
};

const safe_file_name = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'binder';

const printable_image = async (url: string, width: number, height: number): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load binder image (${response.status})`);
  const object_url = URL.createObjectURL(await response.blob());
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Unable to decode binder image'));
      element.src = object_url;
    });
    // Render at the same physical aspect ratio used in the PDF. A slot-count-based
    // square canvas would be stretched when inserted into a 68 × 97 mm pocket.
    const target_width = Math.max(1, Math.round(width * pocket_width_mm * 10));
    const target_height = Math.max(1, Math.round(height * pocket_height_mm * 10));
    const canvas = document.createElement('canvas');
    canvas.width = target_width;
    canvas.height = target_height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to prepare binder image');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, target_width, target_height);
    // Fill the complete pocket area while preserving the source aspect ratio.
    // Any overflow is cropped equally from opposite sides.
    const scale = Math.max(target_width / image.naturalWidth, target_height / image.naturalHeight);
    const draw_width = image.naturalWidth * scale;
    const draw_height = image.naturalHeight * scale;
    context.drawImage(
      image,
      (target_width - draw_width) / 2,
      (target_height - draw_height) / 2,
      draw_width,
      draw_height,
    );
    return canvas.toDataURL('image/jpeg', 0.95);
  } finally {
    URL.revokeObjectURL(object_url);
  }
};

const position_images = (images: Printable_Binder_Image[]): Positioned_Image[] => {
  const pages: boolean[][][] = [];
  return images.map((image) => {
    const width = Math.min(page_columns, Math.max(1, Math.floor(image.width)));
    const height = Math.min(page_rows, Math.max(1, Math.floor(image.height)));
    for (let page = 0; ; page += 1) {
      const cells =
        pages[page] ?? Array.from({ length: page_rows }, () => Array(page_columns).fill(false));
      pages[page] = cells;
      for (let row = 0; row <= page_rows - height; row += 1) {
        for (let column = 0; column <= page_columns - width; column += 1) {
          const is_free = Array.from({ length: height }, (_, row_offset) =>
            Array.from(
              { length: width },
              (_, column_offset) => !cells[row + row_offset][column + column_offset],
            ),
          ).every((row_cells) => row_cells.every(Boolean));
          if (!is_free) continue;
          for (let row_offset = 0; row_offset < height; row_offset += 1) {
            for (let column_offset = 0; column_offset < width; column_offset += 1) {
              cells[row + row_offset][column + column_offset] = true;
            }
          }
          return { ...image, width, height, page, column, row };
        }
      }
    }
  });
};

export const download_binder_images_pdf = async (
  binder_name: string,
  images: Printable_Binder_Image[],
): Promise<void> => {
  if (images.length === 0) throw new Error('Select at least one binder image to print');
  const positioned_images = position_images(
    [...images].sort((left, right) => right.width * right.height - left.width * left.height),
  );
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({
    title: `${binder_name} binder images`,
    subject: 'Binder images sized for 68 × 97 mm Vault X pockets',
  });

  const page_count = Math.max(...positioned_images.map((image) => image.page)) + 1;
  for (let page = 1; page < page_count; page += 1) pdf.addPage();

  for (const image of positioned_images) {
    pdf.setPage(image.page + 1);
    const x = margin_left_mm + image.column * pocket_width_mm;
    const y = margin_top_mm + image.row * pocket_height_mm;
    const width = image.width * pocket_width_mm;
    const height = image.height * pocket_height_mm;
    pdf.addImage(
      await printable_image(image.url, image.width, image.height),
      'JPEG',
      x,
      y,
      width,
      height,
      undefined,
      'FAST',
    );
    pdf.setDrawColor(80);
    pdf.setLineWidth(0.2);
    pdf.rect(x, y, width, height);
  }

  pdf.save(`${safe_file_name(binder_name)}-binder-images.pdf`);
};
