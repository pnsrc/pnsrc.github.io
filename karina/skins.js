export const SKINS = [
  {
    id: 'karina', name: 'Карина', speaker: 'КАРИНА',
    texture: 'karina-face.png', outfit: 'puffer',
    description: 'Классика. Пуховик, латяо и никаких созвонов.',
    colors: { jacket: '#171e29', seam: '#303d47', zip: '#a7a69e', skin: '#e8b59a', hair: '#54372f', jeans: '#829ab2', shoes: '#f0e9d9' },
    face: {
      offsetX: .17,
      eyes: [[-.15, .044, .1], [.117, -.005, -.1]],
      mouth: [-.05, -.32, -.045], jaw: [-.05, -.49], jawUv: [.355, .17],
      cheeks: [-.30, .28], cheekY: -.20
    }
  },
  {
    id: 'karina-2', name: 'Карина II', speaker: 'КАРИНА II',
    texture: 'karina-2-face.png', outfit: 'hoodie', glasses: true,
    description: 'Вторая Карина. Очки есть. Планов работать нет.',
    colors: { jacket: '#171c25', seam: '#292e39', zip: '#797e88', skin: '#e8b6a0', hair: '#302723', jeans: '#22242b', shoes: '#d9d9d0' },
    face: {
      offsetX: -.08,
      eyes: [[-.15, .045, .015], [.17, .055, -.015]],
      mouth: [0, -.32, 0], jaw: [0, -.49], jawUv: [.55, .17],
      cheeks: [-.28, .29], cheekY: -.22
    }
  },
  {
    id: 'maria', name: 'Мария', speaker: 'МАРИЯ',
    texture: 'maria-face.png', outfit: 'blazer', special: '67',
    description: 'Любит 67. Дедлайн? Я тебя могну.',
    eyebrow: 'SIX. SEVEN. НИКАКИХ ВОЗРАЖЕНИЙ.',
    headline: ['Я ТЕБЯ', 'МОГНУ.'],
    colors: { jacket: '#a19587', seam: '#6a625b', zip: '#d3c2a3', skin: '#edb59a', hair: '#594034', jeans: '#333039', shoes: '#ddd9d0' },
    face: {
      offsetX: .045,
      eyes: [[-.205, .04, .025], [.16, .04, -.025]],
      mouth: [-.02, -.36, 0], jaw: [-.02, -.53], jawUv: [.46, .13],
      cheeks: [-.28, .28], cheekY: -.23
    }

  }
];
export function findSkin(id) { return SKINS.find(skin => skin.id === id) || SKINS[0]; }
