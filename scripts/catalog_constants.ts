// Upstream mappings retained from the original catalog generator.
export const source_folders: Record<string, Record<string, string>> = {
  data: {
    region_id: 'INTL',
    region_name: 'International',
    series_prefix: 'intl',
  },
  'data-asia': {
    region_id: 'ASIA',
    region_name: 'Asia',
    series_prefix: 'asia',
  },
};
export const language_names: Record<string, string> = {
  de: 'German',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  id: 'Indonesian',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  nl: 'Dutch',
  pl: 'Polish',
  'pt-BR': 'Portuguese (Brazil)',
  ru: 'Russian',
  th: 'Thai',
  'zh-CN': 'Simplified Chinese',
  'zh-TW': 'Traditional Chinese',
};
export const language_code_map: Record<string, string> = {
  pt: 'pt-BR',
  'pt-br': 'pt-BR',
  'zh-cn': 'zh-CN',
  'zh-tw': 'zh-TW',
};
export const energy_map: Record<string, string> = {
  colorless: 'normal',
  darkness: 'dark',
  electric: 'lightning',
};
export const variant_map: Record<string, string> = {
  '1st': 'first_edition',
  first: 'first_edition',
  firstedition: 'first_edition',
  holo: 'holo',
  normal: 'normal',
  pokeball: 'poke_ball',
  poke_ball: 'poke_ball',
  reverse: 'reverse_holo',
  reverseholo: 'reverse_holo',
  standard: 'normal',
  unlimited: 'unlimited',
};
export const regional_prefixes: string[] = ['alolan ', 'galarian ', 'hisuian ', 'paldean '];
export const region_exclusive_species: Record<string, string> = {
  '862': 'galarian',
  '863': 'galarian',
  '864': 'galarian',
  '865': 'galarian',
  '866': 'galarian',
  '867': 'galarian',
  '902': 'hisuian',
  '903': 'hisuian',
  '904': 'hisuian',
  '980': 'paldean',
};
export const pokemon_overrides: Record<string, Record<string, string>> = {
  '390': {
    en: 'Chimchar',
    fr: 'Ouisticram',
    ja: 'ヒコザル',
    'zh-CN': '小火焰猴',
  },
  '391': {
    en: 'Monferno',
    fr: 'Chimpenfeu',
    ja: '猛火猴',
    'zh-CN': '猛火猴',
  },
  '862': {
    en: 'Obstagoon',
    fr: 'Ixon',
    ja: 'タチフサグマ',
    'zh-CN': '堵拦熊',
  },
  '863': {
    en: 'Perrserker',
    fr: 'Berserkatt',
    ja: 'ニャイキング',
    'zh-CN': '喵头目',
  },
  '864': {
    en: 'Cursola',
    fr: 'Corayôme',
    ja: 'サニゴーン',
    'zh-CN': '魔灵珊瑚',
  },
  '865': {
    en: "Sirfetch'd",
    fr: 'Palarticho',
    ja: 'ネギガナイト',
    'zh-CN': '葱游兵',
  },
  '866': {
    en: 'Mr. Rime',
    fr: 'M. Glaquette',
    ja: 'バリコオル',
    'zh-CN': '踏冰人偶',
  },
  '867': {
    en: 'Runerigus',
    fr: 'Tutétékri',
    ja: 'デスバーン',
    'zh-CN': '迭失板',
  },
  '902': {
    en: 'Basculegion',
    fr: 'Paragruel',
    ja: 'イダイトウ',
    'zh-CN': '幽尾玄鱼',
  },
  '903': {
    en: 'Sneasler',
    fr: 'Farfurex',
    ja: 'オオニューラ',
    'zh-CN': '大狃拉',
  },
  '904': {
    en: 'Overqwil',
    fr: 'Qwilpik',
    ja: 'ハリーマン',
    'zh-CN': '万针鱼',
  },
  '980': {
    en: 'Clodsire',
    fr: 'Terraiste',
    ja: 'ドオー',
    'zh-CN': '土王',
  },
};
export const form_markers: Record<string, string[]> = {
  mega: ['mega', 'メガ', '超級', '超级', '메가'],
  alolan: ['alolan', 'alola', 'アローラ', '阿羅拉', '阿罗拉', '알로라'],
  galarian: ['galarian', 'galar', 'ガラル', '伽勒爾', '伽勒尔', '가라르'],
  hisuian: ['hisuian', 'hisui', 'ヒスイ', '洗翠', '히스이'],
  paldean: ['paldean', 'paldea', 'パルデア', '帕底亞', '帕底亚', '팔데아'],
};
