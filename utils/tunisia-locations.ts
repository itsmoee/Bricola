
export const tunisianCities: Record<string, string[]> = {
  'Tataouine': ['Tataouine City', 'Ghomrassen', 'Bir Lahmar', 'Dehiba', 'Remada', 'Smâr'],
  'Tunis': ['Tunis Centre', 'La Marsa', 'Sidi Bou Said', 'Carthage', 'Goulette', 'Lac 1 & 2', 'Bardo', 'Menzah', 'Ennasr'],
  'Ariana': ['Ariana City', 'Raoued', 'Soukra', 'Mnihla', 'Kalâat el-Andalous'],
  'Ben Arous': ['Ben Arous', 'Ezzahra', 'Hammam Lif', 'Bou Mhel', 'Mégrine', 'Rades', 'Mornag'],
  'Manouba': ['Manouba City', 'Douar Hicher', 'Oued Ellil', 'Tebourba', 'Mornaguia'],
  'Sousse': ['Sousse City', 'Hammam Sousse', 'Akouda', 'Kalaa Sghira', 'Kalaa Kebira', 'Sousse Riadh', 'Sahloul'],
  'Monastir': ['Monastir City', 'Sahline', 'Téboulba', 'Sayada', 'Ksar Hellal', 'Moknine'],
  'Mahdia': ['Mahdia City', 'Ksour Essef', 'Chebba', 'El Jem', 'Bou Merdes'],
  'Sfax': ['Sfax City', 'Sakiet Ezzit', 'Sakiet Eddaier', 'Thyna', 'Agareb'],
  'Nabeul': ['Nabeul City', 'Hammamet', 'Kelibia', 'Korba', 'Dar Chaabane', 'Menzel Temime'],
  'Bizerte': ['Bizerte City', 'Menzel Bourguiba', 'Mateur', 'Ras Jebel', 'Ghar el Melh'],
  'Beja': ['Beja City', 'Medjez el Bab', 'Testour', 'Téboursouk'],
  'Jendouba': ['Jendouba City', 'Tabarka', 'Aïn Draham', 'Bou Salem'],
  'Kef': ['Kef City', 'Dahmani', 'Sers', 'Tajerouine'],
  'Siliana': ['Siliana City', 'Makthar', 'Bou Arada', 'Gaâfour'],
  'Kairouan': ['Kairouan City', 'Bou Hajla', 'Haffouz', 'Nasrallah'],
  'Kasserine': ['Kasserine City', 'Sbeïtla', 'Thala', 'Fériana'],
  'Sidi Bouzid': ['Sidi Bouzid City', 'Regueb', 'Meknassi', 'Jilma'],
  'Gabes': ['Gabes City', 'Mareth', 'Matmata', 'El Hamma'],
  'Medenine': ['Medenine City', 'Djerba Houmt Souk', 'Djerba Midoun', 'Zarzis', 'Ben Guerdane'],
  'Gafsa': ['Gafsa City', 'Metlaoui', 'Redeyef', 'Mdhilla'],
  'Tozeur': ['Tozeur City', 'Nefta', 'Degache'],
  'Kebili': ['Kebili City', 'Douz', 'Souk Lahad'],
  'Zaghouan': ['Zaghouan City', 'El Fahs', 'Bir Mcherga']
};

export const getTunisianCityAr = (cityEn: string): string => {
  const ar: Record<string, string> = {
    'Tataouine': 'تطاوين',
    'Tunis': 'تونس',
    'Ariana': 'أريانة',
    'Ben Arous': 'بن عروس',
    'Manouba': 'منوبة',
    'Sousse': 'سوسة',
    'Monastir': 'المنستير',
    'Mahdia': 'المهدية',
    'Sfax': 'صفاقس',
    'Nabeul': 'نابل',
    'Bizerte': 'بنزرت',
    'Beja': 'باجة',
    'Jendouba': 'جندوبة',
    'Kef': 'الكاف',
    'Siliana': 'سليانة',
    'Kairouan': 'القيروان',
    'Kasserine': 'القصرين',
    'Sidi Bouzid': 'سيدي بوزيد',
    'Gabes': 'قابس',
    'Medenine': 'مدنين',
    'Gafsa': 'قفصة',
    'Tozeur': 'توزر',
    'Kebili': 'قبلي',
    'Zaghouan': 'زغوان'
  };
  return ar[cityEn] || cityEn;
};
