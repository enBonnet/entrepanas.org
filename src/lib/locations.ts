// Venezuelan states + cities as a compile-time constant. The 24 political
// divisions don't change, so a DB table would be speculative (YAGNI). Stored
// values are the human-readable names (matches existing seed data); the server
// validates region/city against these lists with a zod enum + a pair check,
// giving the same data-quality guarantee as a FK for a fixed list.
//
// Order is intentional: Caracas + its metro area and the central region come
// first so recipients there (the densest donor/recipient base) see them at the
// top of the dropdown, then the rest of the country alphabetically.

export const VENEZUELA_STATES = [
  // Caracas y alrededores (área metropolitana)
  'Distrito Capital',
  'Miranda',
  'La Guaira',
  // Región central
  'Aragua',
  'Carabobo',
  // Resto del país (alfabético)
  'Amazonas',
  'Anzoátegui',
  'Apure',
  'Barinas',
  'Bolívar',
  'Cojedes',
  'Delta Amacuro',
  'Falcón',
  'Guárico',
  'Lara',
  'Mérida',
  'Monagas',
  'Nueva Esparta',
  'Portuguesa',
  'Sucre',
  'Táchira',
  'Trujillo',
  'Yaracuy',
  'Zulia',
] as const

export type VenezuelaState = (typeof VENEZUELA_STATES)[number]

// Grouping for the <Select> optgroups. Order = display order.
export const STATE_GROUPS: { label: string; states: VenezuelaState[] }[] = [
  {
    label: 'Caracas y alrededores',
    states: ['Distrito Capital', 'Miranda', 'La Guaira'],
  },
  {
    label: 'Región central',
    states: ['Aragua', 'Carabobo'],
  },
  {
    label: 'Resto del país',
    states: [
      'Amazonas',
      'Anzoátegui',
      'Apure',
      'Barinas',
      'Bolívar',
      'Cojedes',
      'Delta Amacuro',
      'Falcón',
      'Guárico',
      'Lara',
      'Mérida',
      'Monagas',
      'Nueva Esparta',
      'Portuguesa',
      'Sucre',
      'Táchira',
      'Trujillo',
      'Yaracuy',
      'Zulia',
    ],
  },
]

// Major cities / municipality seats per state. Not exhaustive to the aldea
// level (YAGNI) — covers the capitals and main population centers a recipient
// would identify with. Metro-Caracas municipalities that sit administratively
// in Miranda (Petare, Baruta, Chacao, El Hatillo) are listed under Miranda.
export const VENEZUELA_CITIES_BY_STATE: Record<VenezuelaState, readonly string[]> = {
  'Distrito Capital': ['Caracas'],
  Miranda: [
    'Los Teques',
    'San Antonio de Los Altos',
    'Guarenas',
    'Guatire',
    'Charallave',
    'Santa Teresa del Tuy',
    'Ocumare del Tuy',
    'Cúa',
    'Petare',
    'Baruta',
    'Chacao',
    'El Hatillo',
    'Higuerote',
    'Río Chico',
  ],
  'La Guaira': ['La Guaira', 'Maiquetía', 'Catia La Mar', 'Caraballeda', 'Macuto', 'Naiguatá'],
  Aragua: [
    'Maracay',
    'La Victoria',
    'Turmero',
    'Cagua',
    'El Limón',
    'Palo Negro',
    'San Mateo',
    'Villa de Cura',
  ],
  Carabobo: [
    'Valencia',
    'Puerto Cabello',
    'Morón',
    'Guacara',
    'Mariara',
    'San Joaquín',
    'Los Guayos',
    'Naguanagua',
  ],
  Amazonas: ['Puerto Ayacucho', 'San Fernando de Atabapo', 'San Carlos de Río Negro'],
  Anzoátegui: [
    'Barcelona',
    'Puerto La Cruz',
    'Lechería',
    'Guanta',
    'Anaco',
    'El Tigre',
    'Clarines',
    'Pariaguán',
  ],
  Apure: ['San Fernando de Apure', 'Guasdualito', 'Biruaca', 'Elorza'],
  Barinas: ['Barinas', 'Socopó', 'Barinitas', 'Santa Bárbara', 'Calderas'],
  Bolívar: [
    'Ciudad Bolívar',
    'Ciudad Guayana',
    'Upata',
    'El Callao',
    'Tumeremo',
    'Guasipati',
    'Santa Elena de Uairén',
  ],
  Cojedes: ['San Carlos', 'Tinaquillo', 'Tinaco', 'El Pao'],
  'Delta Amacuro': ['Tucupita', 'Pedernales'],
  Falcón: [
    'Coro',
    'Punto Fijo',
    'Tucacas',
    'Chichiriviche',
    'La Vela de Coro',
    'Puerto Cumarebo',
    'Adícora',
    'Dabajuro',
  ],
  Guárico: [
    'San Juan de Los Morros',
    'Calabozo',
    'Zaraza',
    'Valle de La Pascua',
    'Altagracia de Orituco',
  ],
  Lara: ['Barquisimeto', 'Carora', 'El Tocuyo', 'Cabudare', 'Quíbor', 'Sanare', 'Siquisique', 'Duaca'],
  Mérida: ['Mérida', 'El Vigía', 'Tovar', 'Ejido', 'Lagunillas', 'Zea', 'Tabay'],
  Monagas: ['Maturín', 'Punta de Mata', 'Temblador', 'Caripe', 'Caicara', 'Barrancas del Orinoco'],
  'Nueva Esparta': [
    'Porlamar',
    'La Asunción',
    'Pampatar',
    'Juan Griego',
    'El Valle del Espíritu Santo',
    'Santa Ana',
  ],
  Portuguesa: ['Guanare', 'Acarigua', 'Araure', 'Guanarito', 'Ospino', 'Biscucuy'],
  Sucre: ['Cumaná', 'Carúpano', 'Cumanacoa', 'Güiria', 'Casanay', 'Cariaco'],
  Táchira: [
    'San Cristóbal',
    'Táriba',
    'Rubio',
    'La Fría',
    'San Antonio del Táchira',
    'Colón',
    'Capacho',
  ],
  Trujillo: ['Trujillo', 'Valera', 'Boconó', 'Carache', 'La Quebrada', 'Pampan', 'Sabana de Mendoza'],
  Yaracuy: ['San Felipe', 'Yaritagua', 'Chivacoa', 'Nirgua', 'Aroa', 'Cocorote'],
  Zulia: [
    'Maracaibo',
    'San Francisco',
    'Cabimas',
    'Ciudad Ojeda',
    'Lagunillas',
    'Machiques',
    'Santa Bárbara del Zulia',
    'La Concepción',
  ],
}

// Tuple alias so zod.enum can consume it directly (typed as the literal union).
export const STATE_NAMES = VENEZUELA_STATES

export function citiesForState(state: string): readonly string[] | undefined {
  return VENEZUELA_CITIES_BY_STATE[state as VenezuelaState]
}

export function isValidState(state: string): boolean {
  return (VENEZUELA_STATES as readonly string[]).includes(state)
}

// ponytail: app-level city->state check. For a constant list this is exactly as
// strong as a FK; upgrade to a join table only if cities become admin-editable.
export function isValidStateCity(state: string, city: string): boolean {
  return citiesForState(state)?.includes(city) ?? false
}
