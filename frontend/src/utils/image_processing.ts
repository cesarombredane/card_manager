export const load_image_file = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve_image, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve_image(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to decode image'));
    };
    image.src = url;
  });

export const center_crop_image = async (
  file: File,
  width: number,
  height: number,
): Promise<string> => {
  const image = await load_image_file(file);
  const target_aspect = (width * 8) / (height * 11);
  const image_aspect = image.naturalWidth / image.naturalHeight;
  let source_width = image.naturalWidth;
  let source_height = image.naturalHeight;
  if (image_aspect > target_aspect) source_width = image.naturalHeight * target_aspect;
  else source_height = image.naturalWidth / target_aspect;
  const output_width = target_aspect >= 1 ? 900 : Math.round(900 * target_aspect);
  const output_height = target_aspect >= 1 ? Math.round(900 / target_aspect) : 900;
  const canvas = document.createElement('canvas');
  canvas.width = output_width;
  canvas.height = output_height;
  canvas
    .getContext('2d')
    ?.drawImage(
      image,
      (image.naturalWidth - source_width) / 2,
      (image.naturalHeight - source_height) / 2,
      source_width,
      source_height,
      0,
      0,
      output_width,
      output_height,
    );
  return canvas.toDataURL('image/jpeg', 0.92);
};

export const optimized_image_source = (image: HTMLImageElement): string => {
  const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.92);
};
