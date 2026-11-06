// Demo dataset: ~110 charging stations across major Indian cities and highway corridors.
// Locations are real localities (approximate coordinates). Station names, power, price,
// reliability, queue and status are SAMPLE values so the app works out of the box.
// For real-world data use:  npm run import:ocm   (see README).

// Small deterministic random generator so every seed run gives the same data.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260607);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => Math.round(min + rand() * (max - min));

const BRANDS = ['GreenVolt', 'VoltHub', 'ChargeGrid', 'EcoCharge', 'ZapLane', 'AmpStation'];
const URBAN_AMENITIES = ['Cafe', 'Restroom', 'Parking', 'Mall', 'Wi-Fi', 'Fuel pump nearby'];
const HIGHWAY_AMENITIES = ['Restaurant', 'Restroom', 'Fuel pump', 'Dhaba', 'Wi-Fi', 'Rest area'];

// [area, latitude, longitude]
const CITIES = {
  Mumbai: [
    ['Bandra Kurla Complex', 19.069, 72.8697], ['Andheri East', 19.1136, 72.8697],
    ['Powai', 19.1176, 72.906], ['Lower Parel', 18.993, 72.83], ['Vashi', 19.0771, 72.9986],
    ['Ghodbunder Road, Thane', 19.25, 72.97], ['Borivali West', 19.2307, 72.8567],
    ['Colaba', 18.9067, 72.8147], ['CBD Belapur', 19.0213, 73.0397], ['Goregaon East', 19.1663, 72.8526],
    ['Mulund West', 19.1726, 72.9425], ['Chembur', 19.0522, 72.9005],
  ],
  Pune: [
    ['Hinjewadi Phase 1', 18.5912, 73.7389], ['Koregaon Park', 18.5362, 73.894],
    ['Kothrud', 18.5074, 73.8077], ['Viman Nagar', 18.5679, 73.9143],
    ['Pimpri-Chinchwad', 18.6298, 73.7997], ['Hadapsar', 18.5089, 73.926], ['Baner', 18.559, 73.7868],
  ],
  Delhi: [
    ['Connaught Place', 28.6315, 77.2167], ['Saket', 28.5245, 77.2066], ['Dwarka Sector 21', 28.5921, 77.046],
    ['Noida Sector 62', 28.627, 77.3649], ['Cyber Hub, Gurugram', 28.495, 77.089],
    ['Nehru Place', 28.5491, 77.2518], ['Rohini', 28.7495, 77.0565], ['Vasant Kunj', 28.52, 77.159],
    ['Greater Noida', 28.4744, 77.504], ['Faridabad', 28.4089, 77.3178],
  ],
  Bengaluru: [
    ['Whitefield', 12.9698, 77.75], ['Electronic City', 12.8452, 77.6602], ['Indiranagar', 12.9784, 77.6408],
    ['Hebbal', 13.0358, 77.597], ['Jayanagar', 12.925, 77.5938], ['Yelahanka', 13.1007, 77.5963],
    ['Kempegowda Airport', 13.1986, 77.7066], ['HSR Layout', 12.9116, 77.6474], ['Malleswaram', 13.0035, 77.5646],
  ],
  Hyderabad: [
    ['HITEC City', 17.4435, 78.3772], ['Banjara Hills', 17.4126, 78.4482], ['Gachibowli', 17.4401, 78.3489],
    ['Secunderabad', 17.4399, 78.4983], ['Madhapur', 17.4486, 78.3908], ['Kukatpally', 17.4948, 78.3996],
    ['Shamshabad Airport', 17.2403, 78.4294],
  ],
  Chennai: [
    ['T. Nagar', 13.0418, 80.2341], ['OMR, Sholinganallur', 12.901, 80.2279], ['Anna Nagar', 13.085, 80.2101],
    ['Guindy', 13.0067, 80.2206], ['Velachery', 12.9815, 80.218], ['Porur', 13.0382, 80.1565],
    ['Adyar', 13.0012, 80.2565],
  ],
  Kolkata: [
    ['Salt Lake Sector V', 22.5867, 88.417], ['Park Street', 22.5535, 88.352], ['New Town', 22.5958, 88.4797],
    ['Howrah', 22.5958, 88.2636], ['Garia', 22.465, 88.385],
  ],
  Ahmedabad: [
    ['SG Highway', 23.03, 72.507], ['Navrangpura', 23.0396, 72.56], ['GIFT City', 23.159, 72.683],
    ['Maninagar', 22.9962, 72.6013],
  ],
  Jaipur: [
    ['Malviya Nagar', 26.855, 75.81], ['Vaishali Nagar', 26.912, 75.727], ['C-Scheme', 26.9124, 75.7873],
  ],
  Kochi: [['MG Road', 9.9816, 76.2999], ['Kakkanad', 10.0159, 76.3419], ['Edappally', 10.0261, 76.3085]],
  Chandigarh: [['Sector 17', 30.7398, 76.7827], ['Zirakpur', 30.6425, 76.8173]],
};

// [corridor, place, latitude, longitude]
const HIGHWAYS = [
  ['Mumbai–Pune Expressway', 'Khalapur', 18.827, 73.283], ['Mumbai–Pune Expressway', 'Lonavala', 18.7481, 73.4072],
  ['Mumbai–Pune Expressway', 'Urse', 18.7298, 73.6092],
  ['Bengaluru–Mysuru Expressway', 'Ramanagara', 12.7157, 77.281], ['Bengaluru–Mysuru Expressway', 'Maddur', 12.5846, 77.044],
  ['Bengaluru–Mysuru Expressway', 'Mandya', 12.5218, 76.8951], ['Bengaluru–Mysuru Expressway', 'Srirangapatna', 12.422, 76.694],
  ['Delhi–Jaipur Highway', 'Manesar', 28.354, 76.936], ['Delhi–Jaipur Highway', 'Behror', 27.889, 76.281],
  ['Delhi–Jaipur Highway', 'Shahpura', 27.388, 75.961],
  ['Yamuna Expressway', 'Jewar', 28.121, 77.556], ['Yamuna Expressway', 'Mathura', 27.4924, 77.6737],
  ['Yamuna Expressway', 'Agra', 27.1767, 78.0081],
  ['Chennai–Bengaluru Highway', 'Sriperumbudur', 12.965, 79.942], ['Chennai–Bengaluru Highway', 'Vellore', 12.9165, 79.1325],
  ['Chennai–Bengaluru Highway', 'Krishnagiri', 12.5186, 78.2137],
  ['Hyderabad–Bengaluru Highway', 'Kurnool', 15.8281, 78.0373], ['Hyderabad–Bengaluru Highway', 'Anantapur', 14.6819, 77.6006],
  ['Ahmedabad–Vadodara Expressway', 'Nadiad', 22.6916, 72.8634], ['Ahmedabad–Vadodara Expressway', 'Vadodara', 22.3072, 73.1812],
  ['Delhi–Chandigarh Highway', 'Panipat', 29.3909, 76.9635], ['Delhi–Chandigarh Highway', 'Karnal', 29.6857, 76.9905],
  ['Delhi–Chandigarh Highway', 'Ambala', 30.3782, 76.7767],
];

function make({ name, city, address, type, lat, lng }) {
  const urban = type === 'Urban';
  const power = urban ? pick([22, 30, 30, 60, 60, 120]) : pick([60, 120, 120, 180]);
  const price = Math.round(10 + (urban ? 0 : 4) + power / 20 + rand() * 6);
  const r = rand();
  const status = r < 0.7 ? 'Available' : r < 0.93 ? 'Busy' : 'Offline';
  const connectors = power <= 22 ? ['Type 2'] : power <= 30 ? ['CCS2', 'Type 2'] : rand() < 0.3 ? ['CCS2', 'CHAdeMO'] : ['CCS2'];
  const amenities = [...new Set(Array.from({ length: between(1, 3) }, () => pick(urban ? URBAN_AMENITIES : HIGHWAY_AMENITIES)))];
  return {
    name, city, address, type, operator: name.split(' ')[0],
    power, price,
    reliability: status === 'Offline' ? between(60, 78) : between(78, 99),
    queue: status === 'Busy' ? between(4, 14) : between(0, 4),
    status, connectors, amenities,
    latitude: lat, longitude: lng,
    location: { type: 'Point', coordinates: [lng, lat] },
    source: 'seed',
  };
}

// Your original 4 stations, kept exactly as they were.
const ORIGINALS = [
  { name: 'GreenVolt Central', city: 'Bengaluru', address: 'MG Road area', power: 120, price: 18, reliability: 97, queue: 6, status: 'Available', connectors: ['CCS2'], latitude: 12.9716, longitude: 77.5946 },
  { name: 'ChargePoint Metro', city: 'Bengaluru', address: 'Koramangala', power: 60, price: 15, reliability: 92, queue: 9, status: 'Available', connectors: ['CCS2'], latitude: 12.9352, longitude: 77.6245 },
  { name: 'Highway FastCharge', city: 'Bengaluru', address: 'Hebbal–Airport road', power: 180, price: 24, reliability: 88, queue: 14, status: 'Busy', connectors: ['CCS2'], latitude: 13.0174, longitude: 77.5962, type: 'Highway' },
  { name: 'EcoCharge Mall', city: 'Bengaluru', address: 'Bannerghatta Road', power: 30, price: 12, reliability: 79, queue: 3, status: 'Available', connectors: ['Type 2'], latitude: 12.9141, longitude: 77.6101 },
].map((s) => ({
  type: 'Urban', operator: s.name.split(' ')[0], amenities: ['Parking'], source: 'seed',
  ...s, location: { type: 'Point', coordinates: [s.longitude, s.latitude] },
}));

const generated = [];
for (const [city, areas] of Object.entries(CITIES)) {
  for (const [area, lat, lng] of areas) {
    generated.push(make({ name: `${pick(BRANDS)} ${area.split(',')[0]}`, city, address: area, type: 'Urban', lat, lng }));
  }
}
for (const [corridor, place, lat, lng] of HIGHWAYS) {
  generated.push(make({ name: `${pick(BRANDS)} ${place} Highway Hub`, city: place, address: corridor, type: 'Highway', lat, lng }));
}

export const stations = [...ORIGINALS, ...generated];
