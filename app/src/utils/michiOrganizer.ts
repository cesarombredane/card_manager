import type { BinderImage, BinderImagePlacement, BinderLayout } from './binders';

export type MichiMode = 'date' | 'color' | 'pokedex';

export type MichiCardInput = {
  slotValue: string | null;
  name: string;
  imageUrl: string | null;
  date: string | null;
  groupKey: string;
  setOrder: string;
  undatedFlexible: boolean;
  pokedexOrder: number | null;
  pokedexGroupKey: string | null;
  isProxy: boolean;
  quantity: number;
};

export type MichiImageInput = BinderImage & {
  imageUrl: string;
};

export type MichiOptions = {
  mode: MichiMode;
  lockedPages: number[];
  seed: number;
};

export type MichiOrganizerInput = {
  pageCount: number;
  layout: BinderLayout;
  currentSlots: Array<string | null>;
  currentImagePlacements: BinderImagePlacement[];
  cards: MichiCardInput[];
  images: MichiImageInput[];
  pokedexSlots: Array<{ key: string; order: number; name: string }>;
  options: MichiOptions;
};

export type MichiLayoutProposal = {
  slots: Array<string | null>;
  imagePlacements: BinderImagePlacement[];
  score: number;
  warnings: string[];
  seed: number;
  placedCards: number;
  placedImages: number;
  emptySlots: number;
};

type VisualFeatures = {
  lab: [number, number, number];
  edges: {
    top: [number, number, number];
    right: [number, number, number];
    bottom: [number, number, number];
    left: [number, number, number];
  };
  hue: number;
  readable: boolean;
};

type CardInstance = MichiCardInput & {
  features: VisualFeatures;
  ordinal: number;
};

const neutralLab: [number, number, number] = [50, 0, 0];
const neutralFeatures: VisualFeatures = {
  lab: neutralLab,
  edges: { top: neutralLab, right: neutralLab, bottom: neutralLab, left: neutralLab },
  hue: 0,
  readable: false
};
const featureCache = new Map<string, Promise<VisualFeatures>>();

const slotsPerSide = (layout: BinderLayout): number => layout === '2x2' ? 4 : 9;
const dimensionForLayout = (layout: BinderLayout): number => layout === '2x2' ? 2 : 3;

const seededRandom = (initialSeed: number): (() => number) => {
  let state = initialSeed >>> 0 || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
};

const srgbToLinear = (value: number): number => {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
};

const rgbToLab = (red: number, green: number, blue: number): [number, number, number] => {
  const r = srgbToLinear(red);
  const g = srgbToLinear(green);
  const b = srgbToLinear(blue);
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const transform = (value: number): number =>
    value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
  const fx = transform(x);
  const fy = transform(y);
  const fz = transform(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

const averagePixels = (
  pixels: Uint8ClampedArray,
  width: number,
  predicate: (x: number, y: number) => boolean
): [number, number, number] => {
  let red = 0;
  let green = 0;
  let blue = 0;
  let weight = 0;
  const height = pixels.length / 4 / width;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!predicate(x, y)) continue;
      const offset = (y * width + x) * 4;
      const alpha = pixels[offset + 3] / 255;
      red += pixels[offset] * alpha;
      green += pixels[offset + 1] * alpha;
      blue += pixels[offset + 2] * alpha;
      weight += alpha;
    }
  }
  return weight ? rgbToLab(red / weight, green / weight, blue / weight) : neutralLab;
};

const labHue = (lab: [number, number, number]): number =>
  (Math.atan2(lab[2], lab[1]) * 180 / Math.PI + 360) % 360;

const analyzeImage = (url: string | null): Promise<VisualFeatures> => {
  if (!url) return Promise.resolve(neutralFeatures);
  const cached = featureCache.get(url);
  if (cached) return cached;
  const promise = new Promise<VisualFeatures>((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Canvas is unavailable');
        context.drawImage(image, 0, 0, size, size);
        const pixels = context.getImageData(0, 0, size, size).data;
        const lab = averagePixels(pixels, size, () => true);
        const edgeSize = 5;
        resolve({
          lab,
          edges: {
            top: averagePixels(pixels, size, (_x, y) => y < edgeSize),
            right: averagePixels(pixels, size, (x) => x >= size - edgeSize),
            bottom: averagePixels(pixels, size, (_x, y) => y >= size - edgeSize),
            left: averagePixels(pixels, size, (x) => x < edgeSize)
          },
          hue: labHue(lab),
          readable: true
        });
      } catch {
        resolve(neutralFeatures);
      }
    };
    image.onerror = () => resolve(neutralFeatures);
    image.src = url;
  });
  featureCache.set(url, promise);
  return promise;
};

const colorDistance = (
  left: [number, number, number],
  right: [number, number, number]
): number => Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);

const parseDate = (value: string | null): number => {
  if (!value) return Number.POSITIVE_INFINITY;
  const localized = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const normalized = localized ? `${localized[3]}-${localized[2]}-${localized[1]}` : value;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
};

const chronologicalCompare = (left: CardInstance, right: CardInstance): number => {
  const dateDifference = parseDate(left.date) - parseDate(right.date);
  if (Number.isFinite(dateDifference) && dateDifference !== 0) return dateDifference;
  if (Number.isFinite(parseDate(left.date)) !== Number.isFinite(parseDate(right.date))) {
    return Number.isFinite(parseDate(left.date)) ? -1 : 1;
  }
  return left.groupKey.localeCompare(right.groupKey)
    || left.setOrder.localeCompare(right.setOrder, undefined, { numeric: true, sensitivity: 'base' })
    || left.name.localeCompare(right.name)
    || left.ordinal - right.ordinal;
};

const removePreservedInstances = (
  instances: CardInstance[],
  preservedSlots: Array<string | null>
): CardInstance[] => {
  const remaining = [...instances];
  for (const value of preservedSlots) {
    if (!value) continue;
    const index = remaining.findIndex((candidate) => candidate.slotValue === value);
    if (index !== -1) remaining.splice(index, 1);
  }
  return remaining;
};

export const generateMichiLayout = async (input: MichiOrganizerInput): Promise<MichiLayoutProposal> => {
  const { options } = input;
  const dimension = dimensionForLayout(input.layout);
  const sideSize = slotsPerSide(input.layout);
  const totalSlots = input.pageCount * 2 * sideSize;
  const random = seededRandom(options.seed);
  const warnings: string[] = [];

  const uniqueUrls = [...new Set([
    ...input.cards.map((card) => card.imageUrl),
    ...input.images.map((image) => image.imageUrl)
  ].filter((url): url is string => Boolean(url)))];
  const analyzed = new Map<string, VisualFeatures>();
  await Promise.all(uniqueUrls.map(async (url) => analyzed.set(url, await analyzeImage(url))));

  const instances: CardInstance[] = input.cards.flatMap((card) =>
    Array.from({ length: Math.max(0, Math.floor(card.quantity)) }, (_, ordinal) => ({
      ...card,
      ordinal,
      features: card.imageUrl ? analyzed.get(card.imageUrl) ?? neutralFeatures : neutralFeatures
    }))
  );
  const unreadableCards = instances.filter((card) => !card.features.readable).length;
  const unreadableImages = input.images.filter((image) => !(analyzed.get(image.imageUrl)?.readable)).length;
  if (unreadableCards || unreadableImages) {
    warnings.push(`${unreadableCards + unreadableImages} visual asset(s) could not be color-analyzed and were treated as neutral.`);
  }

  const lockedPages = new Set(options.lockedPages);
  const lockedCells = new Set(Array.from(lockedPages).flatMap((pageIndex) =>
    Array.from({ length: sideSize }, (_, offset) => pageIndex * sideSize + offset)
  ));
  const slots: Array<string | null> = Array(totalSlots).fill(null);
  for (const pageIndex of lockedPages) {
    const start = pageIndex * sideSize;
    slots.splice(start, sideSize, ...input.currentSlots.slice(start, start + sideSize));
  }
  let remainingCards = removePreservedInstances(
    instances,
    slots.filter((_slot, index) => lockedPages.has(Math.floor(index / sideSize)))
  );
  const insertAtGroupBoundaries = (
    orderedCards: CardInstance[],
    flexibleCards: CardInstance[],
    groupKey: (card: CardInstance) => string
  ): CardInstance[] => {
    const groupBoundaries = [
      0,
      ...orderedCards.flatMap((card, index) =>
        index > 0 && groupKey(orderedCards[index - 1]) !== groupKey(card) ? [index] : []
      ),
      orderedCards.length
    ];
    const cardsAtBoundary = new Map<number, CardInstance[]>();
    for (const card of flexibleCards) {
      const boundary = groupBoundaries[Math.floor(random() * groupBoundaries.length)];
      cardsAtBoundary.set(boundary, [...(cardsAtBoundary.get(boundary) ?? []), card]);
    }
    const result: CardInstance[] = [];
    for (let index = 0; index <= orderedCards.length; index += 1) {
      result.push(...(cardsAtBoundary.get(index) ?? []));
      if (index < orderedCards.length) result.push(orderedCards[index]);
    }
    return result;
  };
  if (options.mode === 'date') {
    const flexibleProxies = remainingCards.filter((card) => card.undatedFlexible);
    const datedCards = remainingCards.filter((card) => !card.undatedFlexible).sort(chronologicalCompare);
    remainingCards = insertAtGroupBoundaries(datedCards, flexibleProxies, (card) => card.groupKey);
  } else if (options.mode === 'pokedex') {
    const proxies = remainingCards.filter((card) => card.isProxy);
    const cardsByGroup = new Map<string, CardInstance[]>();
    const ungroupedCards: CardInstance[] = [];
    for (const card of remainingCards.filter((candidate) => !candidate.isProxy)) {
      if (!card.pokedexGroupKey) {
        ungroupedCards.push(card);
        continue;
      }
      cardsByGroup.set(card.pokedexGroupKey, [...(cardsByGroup.get(card.pokedexGroupKey) ?? []), card]);
    }
    const orderedCards = input.pokedexSlots.flatMap((slot): CardInstance[] => {
      const cards = cardsByGroup.get(slot.key);
      if (cards?.length) return cards.sort(chronologicalCompare);
      return [{
        slotValue: null,
        name: slot.name,
        imageUrl: null,
        date: null,
        groupKey: slot.key,
        setOrder: '',
        undatedFlexible: false,
        pokedexOrder: slot.order,
        pokedexGroupKey: slot.key,
        isProxy: false,
        quantity: 1,
        features: neutralFeatures,
        ordinal: 0
      }];
    });
    orderedCards.push(...ungroupedCards.sort(chronologicalCompare));
    remainingCards = insertAtGroupBoundaries(
      orderedCards,
      proxies,
      (card) => card.pokedexGroupKey ?? `other:${card.groupKey}`
    );
  } else {
    remainingCards.sort((left, right) => left.features.hue - right.features.hue
      || left.features.lab[0] - right.features.lab[0]
      || left.name.localeCompare(right.name)
      || left.ordinal - right.ordinal
    );
  }
  const firstOrganizedSide = 0;
  const pageColorAnchors = new Map<number, [number, number, number]>();
  for (let offset = 0; offset < remainingCards.length; offset += sideSize) {
    const pageCards = remainingCards.slice(offset, offset + sideSize);
    const divisor = Math.max(1, pageCards.length);
    pageColorAnchors.set(firstOrganizedSide + Math.floor(offset / sideSize), [
      pageCards.reduce((total, card) => total + card.features.lab[0], 0) / divisor,
      pageCards.reduce((total, card) => total + card.features.lab[1], 0) / divisor,
      pageCards.reduce((total, card) => total + card.features.lab[2], 0) / divisor
    ]);
  }

  const placements: BinderImagePlacement[] = [];
  const occupiedImageCells = new Set<number>();
  const reservedCells = new Set<number>();
  const imageAtCell = new Map<number, MichiImageInput>();
  const preservedImageIds = new Set<string>();

  const registerPlacement = (image: MichiImageInput, placement: BinderImagePlacement): void => {
    placements.push(placement);
    preservedImageIds.add(image.id);
    for (let row = 0; row < image.height; row += 1) {
      for (let column = 0; column < image.width; column += 1) {
        const localIndex = row * image.width + column;
        const slotIndex = placement.side_index * sideSize
          + (placement.row + row) * dimension
          + placement.column + column;
        occupiedImageCells.add(slotIndex);
        imageAtCell.set(slotIndex, image);
        if (!image.card_slots.includes(localIndex)) reservedCells.add(slotIndex);
      }
    }
  };

  const fixedPlacements = input.currentImagePlacements.filter((placement) => lockedPages.has(placement.side_index));
  for (const placement of fixedPlacements) {
    const image = input.images.find((candidate) => candidate.id === placement.image_id);
    if (image) registerPlacement(image, placement);
  }

  const imagesToPlace = input.images
    .filter((image) => !preservedImageIds.has(image.id))
    .sort((left, right) => {
      const areaDifference = right.width * right.height - left.width * left.height;
      if (areaDifference) return areaDifference;
      if (options.mode === 'color') {
        return (analyzed.get(left.imageUrl)?.hue ?? 0) - (analyzed.get(right.imageUrl)?.hue ?? 0);
      }
      return random() - 0.5;
    });
  const totalReservedImageCells = input.images.reduce(
    (total, image) => total + image.width * image.height - image.card_slots.length,
    0
  );
  const availableOrganizedSides = input.pageCount * 2 - lockedPages.size;
  const estimatedActiveSideCount = Math.min(
    availableOrganizedSides,
    Math.max(1, Math.ceil((remainingCards.length + totalReservedImageCells) / sideSize))
  );

  for (const [imageIndex, image] of imagesToPlace.entries()) {
    const desiredSideOffset = imagesToPlace.length <= 1
      ? Math.floor((estimatedActiveSideCount - 1) / 2)
      : Math.round(imageIndex * (estimatedActiveSideCount - 1) / (imagesToPlace.length - 1));
    const desiredSide = firstOrganizedSide + desiredSideOffset;
    const candidates: Array<{ side: number; row: number; column: number; score: number }> = [];
    for (let side = 0; side < input.pageCount * 2; side += 1) {
      if (lockedPages.has(side)) continue;
      for (let row = 0; row <= dimension - image.height; row += 1) {
        for (let column = 0; column <= dimension - image.width; column += 1) {
          const cells = Array.from({ length: image.width * image.height }, (_, index) => {
            const localRow = Math.floor(index / image.width);
            const localColumn = index % image.width;
            return side * sideSize + (row + localRow) * dimension + column + localColumn;
          });
          if (cells.some((cell) => occupiedImageCells.has(cell))) continue;
          const newReservedCells = cells.filter((_cell, index) => !image.card_slots.includes(index));
          const totalSides = input.pageCount * 2;
          const spreadStart = side === 0 ? null : side % 2 === 1 ? side : side - 1;
          const isFacingSpread = spreadStart !== null && spreadStart + 1 < totalSides - 1;
          if (isFacingSpread) {
            const reservedOnSpread = [...reservedCells]
              .filter((cell) => {
                const cellSide = Math.floor(cell / sideSize);
                return cellSide === spreadStart || cellSide === spreadStart + 1;
              })
              .length;
            if (reservedOnSpread + newReservedCells.length >= sideSize * 2) continue;
          }
          const centerDistance = Math.abs(column + image.width / 2 - dimension / 2)
            + Math.abs(row + image.height / 2 - dimension / 2);
          const existingImageCells = [...occupiedImageCells]
            .filter((cell) => Math.floor(cell / sideSize) === side)
            .length;
          const imageFeatures = analyzed.get(image.imageUrl) ?? neutralFeatures;
          const pageAnchor = pageColorAnchors.get(side);
          const pageColorDistance = pageAnchor
            ? colorDistance(imageFeatures.lab, pageAnchor)
            : 90;
          const existingIllustrationPenalty = existingImageCells
            ? (input.layout === '2x2' ? 75 : 50) + existingImageCells * 4
            : 0;
          candidates.push({
            side,
            row,
            column,
            score: Math.abs(side - desiredSide) * 90
              + existingIllustrationPenalty
              + pageColorDistance * 0.35
              + centerDistance * 2
              + random() * 8
          });
        }
      }
    }
    const selected = candidates.sort((left, right) => left.score - right.score)[0];
    if (!selected) throw new Error(`No valid page position could be found for “${image.name}” (${image.width}×${image.height}).`);
    registerPlacement(image, {
      image_id: image.id,
      side_index: selected.side,
      row: selected.row,
      column: selected.column
    });
  }

  for (let spreadStart = 1; spreadStart + 1 < input.pageCount * 2 - 1; spreadStart += 2) {
    const reservedOnSpread = [...reservedCells]
      .filter((cell) => {
        const side = Math.floor(cell / sideSize);
        return side === spreadStart || side === spreadStart + 1;
      })
      .length;
    if (reservedOnSpread >= sideSize * 2) {
      throw new Error(
        `Pages ${spreadStart + 1}–${spreadStart + 2} would contain only illustrations. `
        + 'Every facing-page spread must contain at least one card.'
      );
    }
  }

  const availableSlotCount = slots.reduce((count, value, index) =>
    count + (!value && !reservedCells.has(index) && !lockedCells.has(index) ? 1 : 0), 0);
  if (remainingCards.length > availableSlotCount) {
    const missing = remainingCards.length - availableSlotCount;
    throw new Error(`The binder needs ${missing} more usable slot${missing === 1 ? '' : 's'} to fit every card and illustration.`);
  }
  const placedFeatures = new Map<number, VisualFeatures>();
  const featureForPreserved = new Map(instances.map((card) => [card.slotValue, card.features]));
  slots.forEach((value, index) => {
    if (value) placedFeatures.set(index, featureForPreserved.get(value) ?? neutralFeatures);
  });

  const placeCard = (slotIndex: number, card: CardInstance): void => {
    slots[slotIndex] = card.slotValue;
    placedFeatures.set(slotIndex, card.features);
  };
  const usableIndices = (): number[] => Array.from({ length: totalSlots }, (_, index) => index)
    .filter((index) => !slots[index] && !reservedCells.has(index) && !lockedCells.has(index));

  if (options.mode === 'date' || options.mode === 'pokedex') {
    const available = usableIndices();
    remainingCards.forEach((card, index) => {
      const slotIndex = available[index];
      if (slotIndex === undefined) {
        throw new Error(`No preview slot was available for “${card.name}”. Increase the binder capacity.`);
      }
      placeCard(slotIndex, card);
    });
    remainingCards = [];
  } else {
    for (let slotIndex = 0; slotIndex < totalSlots && remainingCards.length; slotIndex += 1) {
      if (slots[slotIndex] || reservedCells.has(slotIndex) || lockedCells.has(slotIndex)) continue;
    const row = Math.floor((slotIndex % sideSize) / dimension);
    const column = slotIndex % dimension;
    const neighborFeatures = [
      column > 0 ? placedFeatures.get(slotIndex - 1) : undefined,
      row > 0 ? placedFeatures.get(slotIndex - dimension) : undefined
    ].filter((features): features is VisualFeatures => Boolean(features));
    const background = imageAtCell.get(slotIndex);
    const backgroundFeatures = background ? analyzed.get(background.imageUrl) : undefined;
    const windowSize = remainingCards.length;
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let index = 0; index < windowSize; index += 1) {
      const candidate = remainingCards[index];
      const adjacency = neighborFeatures.reduce(
        (total, neighbor) => total + colorDistance(candidate.features.lab, neighbor.lab),
        0
      );
      const backgroundDistance = backgroundFeatures
        ? colorDistance(candidate.features.lab, backgroundFeatures.lab)
        : 0;
      const score = adjacency + backgroundDistance * 0.7 + random() * 0.05;
      if (score < bestScore) {
        bestIndex = index;
        bestScore = score;
      }
    }
    const [selected] = remainingCards.splice(bestIndex, 1);
      placeCard(slotIndex, selected);
    }
  }

  if (remainingCards.length) throw new Error('The layout could not place every card.');

  let totalDistance = 0;
  let comparisons = 0;
  for (let index = 0; index < totalSlots; index += 1) {
    const current = placedFeatures.get(index);
    if (!current) continue;
    const localIndex = index % sideSize;
    if (localIndex % dimension < dimension - 1) {
      const right = placedFeatures.get(index + 1);
      if (right) {
        totalDistance += colorDistance(current.edges.right, right.edges.left);
        comparisons += 1;
      }
    }
    if (Math.floor(localIndex / dimension) < dimension - 1) {
      const bottom = placedFeatures.get(index + dimension);
      if (bottom) {
        totalDistance += colorDistance(current.edges.bottom, bottom.edges.top);
        comparisons += 1;
      }
    }
  }
  const averageDistance = comparisons ? totalDistance / comparisons : 0;
  const score = Math.max(0, Math.round(1000 - averageDistance * 10));

  return {
    slots,
    imagePlacements: placements,
    score,
    warnings,
    seed: options.seed,
    placedCards: slots.filter(Boolean).length,
    placedImages: placements.length,
    emptySlots: slots.filter((value, index) => !value && !reservedCells.has(index)).length
  };
};
