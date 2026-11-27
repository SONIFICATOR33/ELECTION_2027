export const PORTRAITS = {
  bouc: 'img/portraits/vieux-bouc-echarpe-v2.jpg',
  chatte: 'img/portraits/chatoune-tricolore.jpg'
};
export const PHOTO_PREFIX = 'data:image/jpeg;base64,';
export function validPortrait(value) {
  return typeof value === 'string' && (Object.hasOwn(PORTRAITS, value)
    || (value.length <= 120000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)));
}
export function portraitSource(value) {
  return Object.hasOwn(PORTRAITS, value) ? PORTRAITS[value] : validPortrait(value) ? value : PORTRAITS.bouc;
}
