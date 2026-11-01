// Synthetic upstream data, including text that must not be interpreted as code.
const card = {
  name: { en: 'Pikachu', fr: 'Pikachu', ja: 'ピカチュウ' }, category: 'Pokemon', dexId: [25],
  hp: 60, types: ['Electric'], stage: 'Basic', rarity: 'Common', illustrator: 'Example', regulationMark: 'G',
  variants: [ { type: 'normal', subtype: 'unlimited', thirdParty: { cardmarket: 123 } }, { type: 'holo' }, { type: 'holo', foil: 'Masterball', stamp: ['1st edition'] }, { type: 'holo' } ],
  thirdParty: { cardmarket: 456 }, attacks: [{ name: { en: 'A "quoted" attack' }, cost: ['Electric', 'Colorless'], damage: '20+', effect: { en: 'First ' + 'second // still text.' } }],
  weaknesses: [{ type: 'Darkness', value: '×2' }], resistances: [{ type: 'Colorless', value: '-30' }],
  retreat: 0, legal: { standard: true }, description: { en: 'Text', fr: null }
};
export default card;
