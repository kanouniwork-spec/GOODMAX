/**
 * Seed for the editable `wilayas` table.
 *
 * Contains the 58 wilayas (codes 01–58) whose names were verified when this
 * seed was written. GOODMAX targets 69 wilayas: codes 59–69 are created as
 * inactive "pending" rows so the owner can enter the official names in
 * Admin › Locations & Maps › Wilaya dataset instead of the site silently
 * using an outdated list. Municipality lists start empty and can be pasted
 * per wilaya in the same screen; the distributor form accepts free text
 * until a list exists.
 *
 * Coordinates are approximate capital-city positions, used only to draw the
 * network visual.
 */
type Row = [code: number, en: string, fr: string, ar: string, lat: number, lng: number];

const ROWS: Row[] = [
  [1, "Adrar", "Adrar", "أدرار", 27.87, -0.29],
  [2, "Chlef", "Chlef", "الشلف", 36.16, 1.33],
  [3, "Laghouat", "Laghouat", "الأغواط", 33.8, 2.88],
  [4, "Oum El Bouaghi", "Oum El Bouaghi", "أم البواقي", 35.88, 7.11],
  [5, "Batna", "Batna", "باتنة", 35.56, 6.17],
  [6, "Béjaïa", "Béjaïa", "بجاية", 36.75, 5.06],
  [7, "Biskra", "Biskra", "بسكرة", 34.85, 5.73],
  [8, "Béchar", "Béchar", "بشار", 31.62, -2.22],
  [9, "Blida", "Blida", "البليدة", 36.47, 2.83],
  [10, "Bouira", "Bouira", "البويرة", 36.37, 3.9],
  [11, "Tamanrasset", "Tamanrasset", "تمنراست", 22.79, 5.52],
  [12, "Tébessa", "Tébessa", "تبسة", 35.4, 8.12],
  [13, "Tlemcen", "Tlemcen", "تلمسان", 34.88, -1.32],
  [14, "Tiaret", "Tiaret", "تيارت", 35.37, 1.32],
  [15, "Tizi Ouzou", "Tizi Ouzou", "تيزي وزو", 36.71, 4.05],
  [16, "Algiers", "Alger", "الجزائر", 36.75, 3.06],
  [17, "Djelfa", "Djelfa", "الجلفة", 34.67, 3.26],
  [18, "Jijel", "Jijel", "جيجل", 36.82, 5.77],
  [19, "Sétif", "Sétif", "سطيف", 36.19, 5.41],
  [20, "Saïda", "Saïda", "سعيدة", 34.83, 0.15],
  [21, "Skikda", "Skikda", "سكيكدة", 36.88, 6.91],
  [22, "Sidi Bel Abbès", "Sidi Bel Abbès", "سيدي بلعباس", 35.19, -0.63],
  [23, "Annaba", "Annaba", "عنابة", 36.9, 7.77],
  [24, "Guelma", "Guelma", "قالمة", 36.46, 7.43],
  [25, "Constantine", "Constantine", "قسنطينة", 36.37, 6.61],
  [26, "Médéa", "Médéa", "المدية", 36.26, 2.75],
  [27, "Mostaganem", "Mostaganem", "مستغانم", 35.93, 0.09],
  [28, "M'Sila", "M'Sila", "المسيلة", 35.7, 4.54],
  [29, "Mascara", "Mascara", "معسكر", 35.4, 0.14],
  [30, "Ouargla", "Ouargla", "ورقلة", 31.95, 5.33],
  [31, "Oran", "Oran", "وهران", 35.7, -0.63],
  [32, "El Bayadh", "El Bayadh", "البيض", 33.68, 1.02],
  [33, "Illizi", "Illizi", "إليزي", 26.48, 8.47],
  [34, "Bordj Bou Arréridj", "Bordj Bou Arréridj", "برج بوعريريج", 36.07, 4.76],
  [35, "Boumerdès", "Boumerdès", "بومرداس", 36.76, 3.48],
  [36, "El Tarf", "El Tarf", "الطارف", 36.77, 8.31],
  [37, "Tindouf", "Tindouf", "تندوف", 27.67, -8.15],
  [38, "Tissemsilt", "Tissemsilt", "تيسمسيلت", 35.61, 1.81],
  [39, "El Oued", "El Oued", "الوادي", 33.37, 6.86],
  [40, "Khenchela", "Khenchela", "خنشلة", 35.44, 7.14],
  [41, "Souk Ahras", "Souk Ahras", "سوق أهراس", 36.29, 7.95],
  [42, "Tipaza", "Tipaza", "تيبازة", 36.59, 2.45],
  [43, "Mila", "Mila", "ميلة", 36.45, 6.26],
  [44, "Aïn Defla", "Aïn Defla", "عين الدفلى", 36.26, 1.97],
  [45, "Naâma", "Naâma", "النعامة", 33.27, -0.31],
  [46, "Aïn Témouchent", "Aïn Témouchent", "عين تموشنت", 35.3, -1.14],
  [47, "Ghardaïa", "Ghardaïa", "غرداية", 32.49, 3.67],
  [48, "Relizane", "Relizane", "غليزان", 35.74, 0.56],
  [49, "Timimoun", "Timimoun", "تيميمون", 29.26, 0.24],
  [50, "Bordj Badji Mokhtar", "Bordj Badji Mokhtar", "برج باجي مختار", 21.33, 0.95],
  [51, "Ouled Djellal", "Ouled Djellal", "أولاد جلال", 34.42, 5.07],
  [52, "Béni Abbès", "Béni Abbès", "بني عباس", 30.13, -2.17],
  [53, "In Salah", "In Salah", "عين صالح", 27.2, 2.47],
  [54, "In Guezzam", "In Guezzam", "عين قزام", 19.57, 5.77],
  [55, "Touggourt", "Touggourt", "تقرت", 33.1, 6.06],
  [56, "Djanet", "Djanet", "جانت", 24.55, 9.48],
  [57, "El M'Ghair", "El M'Ghair", "المغير", 33.95, 5.92],
  [58, "El Meniaa", "El Meniaa", "المنيعة", 30.58, 2.88],
];

export const WILAYA_TARGET = 69;

export function seedWilayas() {
  const known = ROWS.map(([code, en, fr, ar, lat, lng]) => ({
    id: `wilaya-${String(code).padStart(2, "0")}`,
    code,
    name_json: { en, fr, ar },
    municipalities: [] as string[],
    latitude: lat,
    longitude: lng,
    active: true,
  }));
  const pending = Array.from({ length: WILAYA_TARGET - ROWS.length }, (_, i) => {
    const code = ROWS.length + i + 1;
    return {
      id: `wilaya-${code}`,
      code,
      name_json: {},
      municipalities: [] as string[],
      latitude: null,
      longitude: null,
      active: false,
    };
  });
  return [...known, ...pending];
}

/** Rough outline of Algeria (lng, lat) used to draw the dotted network map. */
export const ALGERIA_OUTLINE: [number, number][] = [
  [-1.75, 35.1], [-1.2, 35.72], [0.1, 35.95], [1.1, 36.5], [2.6, 36.6], [3.6, 36.9], [5.0, 36.85],
  [6.3, 37.05], [7.4, 37.08], [8.62, 36.94], [8.42, 36.2], [8.3, 35.2], [7.5, 34.4], [7.6, 33.45],
  [8.3, 32.9], [9.1, 32.1], [9.55, 30.25], [9.85, 29.0], [9.75, 27.4], [9.4, 26.2], [10.0, 25.35],
  [11.0, 24.5], [12.0, 23.5], [11.5, 22.8], [7.5, 20.85], [5.8, 19.45], [4.25, 19.15], [3.25, 19.0],
  [3.15, 19.85], [1.8, 20.3], [1.15, 20.75], [-4.85, 24.98], [-8.67, 27.3], [-8.67, 28.75],
  [-7.05, 29.6], [-5.3, 29.95], [-3.65, 30.9], [-3.6, 31.7], [-1.2, 32.1], [-1.25, 32.7],
  [-1.6, 33.0], [-1.65, 34.1], [-1.75, 35.1],
];
