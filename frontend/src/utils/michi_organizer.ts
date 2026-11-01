// import types
import type { Binder_Image, Binder_Image_Placement, Binder_Layout } from '../store/modules/binders';

export type Michi_Mode = 'date' | 'color' | 'pokedex';

export type Michi_Card_Input = {
  slot_value: string | null;
  name: string;
  image_url: string | null;
  date: string | null;
  group_key: string;
  set_order: string;
  undated_flexible: boolean;
  pokedex_order: number | null;
  pokedex_group_key: string | null;
  is_proxy: boolean;
  quantity: number;
};

export type Michi_Image_Input = Binder_Image & {
  image_url: string;
};

export type Michi_Options = {
  mode: Michi_Mode;
  locked_pages: number[];
  seed: number;
  pokedex_line_focus?: boolean;
};

export type Michi_Organizer_Input = {
  page_count: number;
  layout: Binder_Layout;
  current_slots: Array<string | null>;
  current_image_placements: Binder_Image_Placement[];
  cards: Michi_Card_Input[];
  images: Michi_Image_Input[];
  pokedex_slots: Array<{
    key: string;
    order: number;
    name: string;
    generation: number;
    line_key?: string;
  }>;
  options: Michi_Options;
};

export type Michi_Layout_Proposal = {
  slots: Array<string | null>;
  image_placements: Binder_Image_Placement[];
  score: number;
  warnings: string[];
  seed: number;
  placed_cards: number;
  placed_images: number;
  empty_slots: number;
};

type Visual_Features = {
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

type Card_Instance = Michi_Card_Input & {
  features: Visual_Features;
  ordinal: number;
};

const neutral_lab: [number, number, number] = [50, 0, 0];
const neutral_features: Visual_Features = {
  lab: neutral_lab,
  edges: { top: neutral_lab, right: neutral_lab, bottom: neutral_lab, left: neutral_lab },
  hue: 0,
  readable: false,
};
const feature_cache = new Map<string, Promise<Visual_Features>>();

const slots_per_side = (layout: Binder_Layout): number => (layout === '2x2' ? 4 : 9);
const dimension_for_layout = (layout: Binder_Layout): number => (layout === '2x2' ? 2 : 3);

const seeded_random = (initial_seed: number): (() => number) => {
  let state = initial_seed >>> 0 || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const srgb_to_linear = (value: number): number => {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
};

const rgb_to_lab = (red: number, green: number, blue: number): [number, number, number] => {
  const r = srgb_to_linear(red);
  const g = srgb_to_linear(green);
  const b = srgb_to_linear(blue);
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

const average_pixels = (
  pixels: Uint8ClampedArray,
  width: number,
  predicate: (x: number, y: number) => boolean,
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
  return weight ? rgb_to_lab(red / weight, green / weight, blue / weight) : neutral_lab;
};

const lab_hue = (lab: [number, number, number]): number =>
  ((Math.atan2(lab[2], lab[1]) * 180) / Math.PI + 360) % 360;

const analyze_image = (url: string | null): Promise<Visual_Features> => {
  if (!url) return Promise.resolve(neutral_features);
  const cached = feature_cache.get(url);
  if (cached) return cached;
  const promise = new Promise<Visual_Features>((resolve) => {
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
        const lab = average_pixels(pixels, size, () => true);
        const edge_size = 5;
        resolve({
          lab,
          edges: {
            top: average_pixels(pixels, size, (_x, y) => y < edge_size),
            right: average_pixels(pixels, size, (x) => x >= size - edge_size),
            bottom: average_pixels(pixels, size, (_x, y) => y >= size - edge_size),
            left: average_pixels(pixels, size, (x) => x < edge_size),
          },
          hue: lab_hue(lab),
          readable: true,
        });
      } catch {
        resolve(neutral_features);
      }
    };
    image.onerror = () => resolve(neutral_features);
    image.src = url;
  });
  feature_cache.set(url, promise);
  return promise;
};

const color_distance = (left: [number, number, number], right: [number, number, number]): number =>
  Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);

const parse_date = (value: string | null): number => {
  if (!value) return Number.POSITIVE_INFINITY;
  const localized = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const normalized = localized ? `${localized[3]}-${localized[2]}-${localized[1]}` : value;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
};

const chronological_compare = (left: Card_Instance, right: Card_Instance): number => {
  const date_difference = parse_date(left.date) - parse_date(right.date);
  if (Number.isFinite(date_difference) && date_difference !== 0) return date_difference;
  if (Number.isFinite(parse_date(left.date)) !== Number.isFinite(parse_date(right.date))) {
    return Number.isFinite(parse_date(left.date)) ? -1 : 1;
  }
  return (
    left.group_key.localeCompare(right.group_key) ||
    left.set_order.localeCompare(right.set_order, undefined, {
      numeric: true,
      sensitivity: 'base',
    }) ||
    left.name.localeCompare(right.name) ||
    left.ordinal - right.ordinal
  );
};

const partition_preserved_instances = (
  instances: Card_Instance[],
  preserved_slots: Array<string | null>,
): { remaining: Card_Instance[]; preserved: Card_Instance[] } => {
  const remaining = [...instances];
  const preserved: Card_Instance[] = [];
  for (const value of preserved_slots) {
    if (!value) continue;
    const index = remaining.findIndex((candidate) => candidate.slot_value === value);
    if (index !== -1) preserved.push(...remaining.splice(index, 1));
  }
  return { remaining, preserved };
};

export const generate_michi_layout = async (
  input: Michi_Organizer_Input,
): Promise<Michi_Layout_Proposal> => {
  const { options } = input;
  const dimension = dimension_for_layout(input.layout);
  const side_size = slots_per_side(input.layout);
  const total_slots = input.page_count * 2 * side_size;
  const random = seeded_random(options.seed);
  const warnings: string[] = [];

  const unique_urls = [
    ...new Set(
      [
        ...input.cards.map((card) => card.image_url),
        ...input.images.map((image) => image.image_url),
      ].filter((url): url is string => Boolean(url)),
    ),
  ];
  const analyzed = new Map<string, Visual_Features>();
  await Promise.all(unique_urls.map(async (url) => analyzed.set(url, await analyze_image(url))));

  const instances: Card_Instance[] = input.cards.flatMap((card) =>
    Array.from({ length: Math.max(0, Math.floor(card.quantity)) }, (_, ordinal) => ({
      ...card,
      ordinal,
      features: card.image_url
        ? (analyzed.get(card.image_url) ?? neutral_features)
        : neutral_features,
    })),
  );
  const unreadable_cards = instances.filter((card) => !card.features.readable).length;
  const unreadable_images = input.images.filter(
    (image) => !analyzed.get(image.image_url)?.readable,
  ).length;
  if (options.mode === 'color' && (unreadable_cards || unreadable_images)) {
    warnings.push(
      `${unreadable_cards + unreadable_images} visual asset(s) could not be color-analyzed and were treated as neutral.`,
    );
  }

  const locked_pages = new Set(options.locked_pages);
  const locked_cells = new Set(
    Array.from(locked_pages).flatMap((page_index) =>
      Array.from({ length: side_size }, (_, offset) => page_index * side_size + offset),
    ),
  );
  const slots: Array<string | null> = Array(total_slots).fill(null);
  for (const page_index of locked_pages) {
    const start = page_index * side_size;
    slots.splice(start, side_size, ...input.current_slots.slice(start, start + side_size));
  }
  const preserved_partition = partition_preserved_instances(
    instances,
    slots.filter((_slot, index) => locked_pages.has(Math.floor(index / side_size))),
  );
  let remaining_cards = preserved_partition.remaining;
  const insert_at_group_boundaries = (
    ordered_cards: Card_Instance[],
    flexible_cards: Card_Instance[],
    group_key: (card: Card_Instance) => string,
  ): Card_Instance[] => {
    const group_boundaries = [
      0,
      ...ordered_cards.flatMap((card, index) =>
        index > 0 && group_key(ordered_cards[index - 1]) !== group_key(card) ? [index] : [],
      ),
      ordered_cards.length,
    ];
    const cards_at_boundary = new Map<number, Card_Instance[]>();
    for (const card of flexible_cards) {
      const boundary = group_boundaries[Math.floor(random() * group_boundaries.length)];
      cards_at_boundary.set(boundary, [...(cards_at_boundary.get(boundary) ?? []), card]);
    }
    const result: Card_Instance[] = [];
    for (let index = 0; index <= ordered_cards.length; index += 1) {
      result.push(...(cards_at_boundary.get(index) ?? []));
      if (index < ordered_cards.length) result.push(ordered_cards[index]);
    }
    return result;
  };
  if (options.mode === 'date') {
    const flexible_proxies = remaining_cards.filter((card) => card.undated_flexible);
    const dated_cards = remaining_cards
      .filter((card) => !card.undated_flexible)
      .sort(chronological_compare);
    remaining_cards = insert_at_group_boundaries(
      dated_cards,
      flexible_proxies,
      (card) => card.group_key,
    );
  } else if (options.mode === 'pokedex') {
    const proxies = remaining_cards.filter((card) => card.is_proxy);
    const preserved_pokedex_groups = new Set(
      preserved_partition.preserved.flatMap((card) =>
        card.pokedex_group_key ? [card.pokedex_group_key] : [],
      ),
    );
    const cards_by_group = new Map<string, Card_Instance[]>();
    const ungrouped_cards: Card_Instance[] = [];
    for (const card of remaining_cards.filter((candidate) => !candidate.is_proxy)) {
      if (!card.pokedex_group_key) {
        ungrouped_cards.push(card);
        continue;
      }
      cards_by_group.set(card.pokedex_group_key, [
        ...(cards_by_group.get(card.pokedex_group_key) ?? []),
        card,
      ]);
    }
    const ordered_cards: Card_Instance[] = [];
    let previous_line_key: string | undefined;
    let previous_generation: number | undefined;
    const focused_line_sizes = new Map<string, number>();
    if (options.pokedex_line_focus) {
      for (const slot of input.pokedex_slots) {
        if (!slot.line_key) continue;
        if (!cards_by_group.get(slot.key)?.length && preserved_pokedex_groups.has(slot.key))
          continue;
        focused_line_sizes.set(
          slot.line_key,
          (focused_line_sizes.get(slot.line_key) ?? 0) +
            (cards_by_group.get(slot.key)?.length || 1),
        );
      }
    }
    for (const slot of input.pokedex_slots) {
      const cards = cards_by_group.get(slot.key);
      if (!cards?.length && preserved_pokedex_groups.has(slot.key)) continue;
      if (previous_generation !== undefined && slot.generation !== previous_generation) {
        while (ordered_cards.length % side_size !== 0) {
          ordered_cards.push({
            slot_value: null,
            name: '',
            image_url: null,
            date: null,
            group_key: `generation-padding:${previous_generation}`,
            set_order: '',
            undated_flexible: false,
            pokedex_order: slot.order,
            pokedex_group_key: `generation-padding:${previous_generation}`,
            is_proxy: false,
            quantity: 1,
            features: neutral_features,
            ordinal: 0,
          });
        }
      }
      if (options.pokedex_line_focus && previous_line_key && slot.line_key !== previous_line_key) {
        const used_columns = ordered_cards.length % dimension;
        const next_line_size = slot.line_key ? (focused_line_sizes.get(slot.line_key) ?? 1) : 1;
        while (
          used_columns > 0 &&
          next_line_size > dimension - used_columns &&
          ordered_cards.length % dimension !== 0
        ) {
          ordered_cards.push({
            slot_value: null,
            name: '',
            image_url: null,
            date: null,
            group_key: `line-padding:${previous_line_key}`,
            set_order: '',
            undated_flexible: false,
            pokedex_order: slot.order,
            pokedex_group_key: `line-padding:${previous_line_key}`,
            is_proxy: false,
            quantity: 1,
            features: neutral_features,
            ordinal: 0,
          });
        }
      }
      ordered_cards.push(
        ...(cards?.length
          ? cards.sort(chronological_compare)
          : [
              {
                slot_value: null,
                name: slot.name,
                image_url: null,
                date: null,
                group_key: slot.key,
                set_order: '',
                undated_flexible: false,
                pokedex_order: slot.order,
                pokedex_group_key: slot.key,
                is_proxy: false,
                quantity: 1,
                features: neutral_features,
                ordinal: 0,
              },
            ]),
      );
      previous_line_key = slot.line_key;
      previous_generation = slot.generation;
    }
    const oversized_lines = [...focused_line_sizes.values()].filter(
      (size) => size > dimension,
    ).length;
    if (oversized_lines) {
      warnings.push(
        `${oversized_lines} evolution line(s) contain more than ${dimension} cards and continue on the next row.`,
      );
    }
    ordered_cards.push(...ungrouped_cards.sort(chronological_compare));
    remaining_cards = [...ordered_cards, ...proxies];
  } else {
    remaining_cards.sort(
      (left, right) =>
        left.features.hue - right.features.hue ||
        left.features.lab[0] - right.features.lab[0] ||
        left.name.localeCompare(right.name) ||
        left.ordinal - right.ordinal,
    );
  }
  const first_organized_side = 0;
  const page_color_anchors = new Map<number, [number, number, number]>();
  for (let offset = 0; offset < remaining_cards.length; offset += side_size) {
    const page_cards = remaining_cards.slice(offset, offset + side_size);
    const divisor = Math.max(1, page_cards.length);
    page_color_anchors.set(first_organized_side + Math.floor(offset / side_size), [
      page_cards.reduce((total, card) => total + card.features.lab[0], 0) / divisor,
      page_cards.reduce((total, card) => total + card.features.lab[1], 0) / divisor,
      page_cards.reduce((total, card) => total + card.features.lab[2], 0) / divisor,
    ]);
  }

  const placements: Binder_Image_Placement[] = [];
  const occupied_image_cells = new Set<number>();
  const reserved_cells = new Set<number>();
  const image_at_cell = new Map<number, Michi_Image_Input>();
  const preserved_image_ids = new Set<string>();

  const register_placement = (
    image: Michi_Image_Input,
    placement: Binder_Image_Placement,
  ): void => {
    placements.push(placement);
    preserved_image_ids.add(image.id);
    for (let row = 0; row < image.height; row += 1) {
      for (let column = 0; column < image.width; column += 1) {
        const local_index = row * image.width + column;
        const slot_index =
          placement.side_index * side_size +
          (placement.row + row) * dimension +
          placement.column +
          column;
        occupied_image_cells.add(slot_index);
        image_at_cell.set(slot_index, image);
        if (!image.card_slots.includes(local_index)) reserved_cells.add(slot_index);
      }
    }
  };

  const fixed_placements = input.current_image_placements.filter((placement) =>
    locked_pages.has(placement.side_index),
  );
  for (const placement of fixed_placements) {
    const image = input.images.find((candidate) => candidate.id === placement.image_id);
    if (image) register_placement(image, placement);
  }

  const images_to_place = input.images
    .filter((image) => !preserved_image_ids.has(image.id))
    .sort((left, right) => {
      const area_difference = right.width * right.height - left.width * left.height;
      if (area_difference) return area_difference;
      if (options.mode === 'color') {
        return (analyzed.get(left.image_url)?.hue ?? 0) - (analyzed.get(right.image_url)?.hue ?? 0);
      }
      return random() - 0.5;
    });
  const total_reserved_image_cells = input.images.reduce(
    (total, image) => total + image.width * image.height - image.card_slots.length,
    0,
  );
  const available_organized_sides = input.page_count * 2 - locked_pages.size;
  const estimated_active_side_count = Math.min(
    available_organized_sides,
    Math.max(1, Math.ceil((remaining_cards.length + total_reserved_image_cells) / side_size)),
  );

  for (const [image_index, image] of images_to_place.entries()) {
    const desired_side_offset =
      images_to_place.length <= 1
        ? Math.floor((estimated_active_side_count - 1) / 2)
        : Math.round(
            (image_index * (estimated_active_side_count - 1)) / (images_to_place.length - 1),
          );
    const desired_side = first_organized_side + desired_side_offset;
    const candidates: Array<{ side: number; row: number; column: number; score: number }> = [];
    for (let side = 0; side < input.page_count * 2; side += 1) {
      if (locked_pages.has(side)) continue;
      for (let row = 0; row <= dimension - image.height; row += 1) {
        for (let column = 0; column <= dimension - image.width; column += 1) {
          const cells = Array.from({ length: image.width * image.height }, (_, index) => {
            const local_row = Math.floor(index / image.width);
            const local_column = index % image.width;
            return side * side_size + (row + local_row) * dimension + column + local_column;
          });
          if (cells.some((cell) => occupied_image_cells.has(cell))) continue;
          const new_reserved_cells = cells.filter(
            (_cell, index) => !image.card_slots.includes(index),
          );
          const total_sides = input.page_count * 2;
          const spread_start = side === 0 ? null : side % 2 === 1 ? side : side - 1;
          const is_facing_spread = spread_start !== null && spread_start + 1 < total_sides - 1;
          if (is_facing_spread) {
            const reserved_on_spread = [...reserved_cells].filter((cell) => {
              const cell_side = Math.floor(cell / side_size);
              return cell_side === spread_start || cell_side === spread_start + 1;
            }).length;
            if (reserved_on_spread + new_reserved_cells.length >= side_size * 2) continue;
          }
          const center_distance =
            Math.abs(column + image.width / 2 - dimension / 2) +
            Math.abs(row + image.height / 2 - dimension / 2);
          const existing_image_cells = [...occupied_image_cells].filter(
            (cell) => Math.floor(cell / side_size) === side,
          ).length;
          const image_features = analyzed.get(image.image_url) ?? neutral_features;
          const page_anchor = page_color_anchors.get(side);
          const page_color_distance = page_anchor
            ? color_distance(image_features.lab, page_anchor)
            : 90;
          const existing_illustration_penalty = existing_image_cells
            ? (input.layout === '2x2' ? 75 : 50) + existing_image_cells * 4
            : 0;
          candidates.push({
            side,
            row,
            column,
            score:
              Math.abs(side - desired_side) * 90 +
              existing_illustration_penalty +
              page_color_distance * 0.35 +
              center_distance * 2 +
              random() * 8,
          });
        }
      }
    }
    const selected = candidates.sort((left, right) => left.score - right.score)[0];
    if (!selected)
      throw new Error(
        `No valid page position could be found for “${image.name}” (${image.width}×${image.height}).`,
      );
    register_placement(image, {
      image_id: image.id,
      side_index: selected.side,
      row: selected.row,
      column: selected.column,
    });
  }

  for (let spread_start = 1; spread_start + 1 < input.page_count * 2 - 1; spread_start += 2) {
    const reserved_on_spread = [...reserved_cells].filter((cell) => {
      const side = Math.floor(cell / side_size);
      return side === spread_start || side === spread_start + 1;
    }).length;
    if (reserved_on_spread >= side_size * 2) {
      throw new Error(
        `Pages ${spread_start + 1}–${spread_start + 2} would contain only illustrations. ` +
          'Every facing-page spread must contain at least one card.',
      );
    }
  }

  const available_slot_count = slots.reduce(
    (count, value, index) =>
      count + (!value && !reserved_cells.has(index) && !locked_cells.has(index) ? 1 : 0),
    0,
  );
  if (remaining_cards.length > available_slot_count) {
    const missing = remaining_cards.length - available_slot_count;
    throw new Error(
      `The binder needs ${missing} more usable slot${missing === 1 ? '' : 's'} to fit every card and illustration.`,
    );
  }
  const placed_features = new Map<number, Visual_Features>();
  const feature_for_preserved = new Map(instances.map((card) => [card.slot_value, card.features]));
  slots.forEach((value, index) => {
    if (value) placed_features.set(index, feature_for_preserved.get(value) ?? neutral_features);
  });

  const place_card = (slot_index: number, card: Card_Instance): void => {
    slots[slot_index] = card.slot_value;
    placed_features.set(slot_index, card.features);
  };
  const usable_indices = (): number[] =>
    Array.from({ length: total_slots }, (_, index) => index).filter(
      (index) => !slots[index] && !reserved_cells.has(index) && !locked_cells.has(index),
    );

  if (options.mode === 'date' || options.mode === 'pokedex') {
    const available = usable_indices();
    remaining_cards.forEach((card, index) => {
      const slot_index = available[index];
      if (slot_index === undefined) {
        throw new Error(
          `No preview slot was available for “${card.name}”. Increase the binder capacity.`,
        );
      }
      place_card(slot_index, card);
    });
    remaining_cards = [];
  } else {
    for (let slot_index = 0; slot_index < total_slots && remaining_cards.length; slot_index += 1) {
      if (slots[slot_index] || reserved_cells.has(slot_index) || locked_cells.has(slot_index))
        continue;
      const row = Math.floor((slot_index % side_size) / dimension);
      const column = slot_index % dimension;
      const neighbor_features = [
        column > 0 ? placed_features.get(slot_index - 1) : undefined,
        row > 0 ? placed_features.get(slot_index - dimension) : undefined,
      ].filter((features): features is Visual_Features => Boolean(features));
      const background = image_at_cell.get(slot_index);
      const background_features = background ? analyzed.get(background.image_url) : undefined;
      const window_size = remaining_cards.length;
      let best_index = 0;
      let best_score = Number.POSITIVE_INFINITY;
      for (let index = 0; index < window_size; index += 1) {
        const candidate = remaining_cards[index];
        const adjacency = neighbor_features.reduce(
          (total, neighbor) => total + color_distance(candidate.features.lab, neighbor.lab),
          0,
        );
        const background_distance = background_features
          ? color_distance(candidate.features.lab, background_features.lab)
          : 0;
        const score = adjacency + background_distance * 0.7 + random() * 0.05;
        if (score < best_score) {
          best_index = index;
          best_score = score;
        }
      }
      const [selected] = remaining_cards.splice(best_index, 1);
      place_card(slot_index, selected);
    }
  }

  if (remaining_cards.length) throw new Error('The layout could not place every card.');

  let total_distance = 0;
  let comparisons = 0;
  for (let index = 0; index < total_slots; index += 1) {
    const current = placed_features.get(index);
    if (!current) continue;
    const local_index = index % side_size;
    if (local_index % dimension < dimension - 1) {
      const right = placed_features.get(index + 1);
      if (right) {
        total_distance += color_distance(current.edges.right, right.edges.left);
        comparisons += 1;
      }
    }
    if (Math.floor(local_index / dimension) < dimension - 1) {
      const bottom = placed_features.get(index + dimension);
      if (bottom) {
        total_distance += color_distance(current.edges.bottom, bottom.edges.top);
        comparisons += 1;
      }
    }
  }
  const average_distance = comparisons ? total_distance / comparisons : 0;
  const score = Math.max(0, Math.round(1000 - average_distance * 10));

  return {
    slots,
    image_placements: placements,
    score,
    warnings,
    seed: options.seed,
    placed_cards: slots.filter(Boolean).length,
    placed_images: placements.length,
    empty_slots: slots.filter((value, index) => !value && !reserved_cells.has(index)).length,
  };
};
