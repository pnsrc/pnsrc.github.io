// Footprints are game metres, independent of the different source-model scales.
export const ROUTE_LENGTH = 560;
export const ROUTE_FRONT = 48;
export const OMSK_MODELS = [
  { id: 'svyatouspenskijsobor', name: 'Успенский собор', x: 22, z: -42, width: 25, depth: 25, height: 25, turn: .5 },
  { id: 'firetower', name: 'Пожарная каланча', x: -13, z: -28, width: 7, depth: 8, height: 18, turn: .15 },
  { id: 'watertram', name: 'Речной трамвай', x: -44, z: -62, width: 7, depth: 29, height: 7, water: true },
  { id: 'russiaflagstep_a', name: 'Флаг на набережной', x: 10.5, z: -68, width: 8, depth: 6, height: 19 },
  { id: 'omskheartcafelod', name: 'Кофе на набережной', x: -13, z: -80, width: 11, depth: 8, height: 7 },
  { id: 'muzteatr', name: 'Музыкальный театр', x: 24, z: -126, width: 27, depth: 32, height: 22, turn: .5 },
  { id: 'academictheater', name: 'Театр драмы', x: -20, z: -146, width: 23, depth: 22, height: 12, turn: .5 },
  { id: 'filarmonic', name: 'Филармония', x: 22, z: -196, width: 25, depth: 25, height: 13, turn: -.15 },
  { id: 'omskblinovlod', name: 'Омск · Блинов', x: -13, z: -217, width: 5, depth: 7, height: 16, turn: .2 },
  { id: 'sportsconcertcomplexlod', name: 'Спортивно-концертный комплекс', x: 27, z: -266, width: 34, depth: 36, height: 16, turn: .5 },
  { id: 'omskheartstreetlod', name: 'Улица у набережной', x: -18, z: -289, width: 20, depth: 10, height: 8, turn: .5 },
  { id: 'omsk2gis', name: 'Омск · 2ГИС', x: 17, z: -330, width: 16, depth: 18, height: 20, turn: -.18 },
  { id: 'omskheartjogalod', name: 'Студия йоги', x: -18, z: -356, width: 22, depth: 10, height: 8, turn: .5 },
  { id: 'omskheartpadellod', name: 'Падел-клуб', x: 23, z: -402, width: 25, depth: 26, height: 12, turn: -.15 },
  { id: 'omskheartavgsportclublod', name: 'Спортклуб', x: -21, z: -444, width: 28, depth: 10, height: 8, turn: .5 },
  { id: 'amphitheaterlod', name: 'Амфитеатр', x: -17, z: -495, width: 17, depth: 18, height: 10, turn: .5 },
];

// Recycling happens behind the camera; even long runs retain exact spacing.
export function loopZ(origin, distance, length = ROUTE_LENGTH, front = ROUTE_FRONT) {
  const gap = front - origin - distance;
  return front - ((gap % length + length) % length);
}
