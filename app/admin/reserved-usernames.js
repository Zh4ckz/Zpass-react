// Admin → Usernames: the remote list of usernames nobody can claim (Firestore config/usernames).
// The editor keeps the text exactly as typed (`json`); on save a flat `names` map is derived from it,
// which the Firestore rules, the apps and the bot server check. Only an admin can give these names out.

export const NAME = /^[a-z0-9_]{1,32}$/

const countries = [
  'afghanistan', 'albania', 'algeria', 'andorra', 'angola', 'antigua_and_barbuda', 'argentina', 'armenia', 'australia', 'austria',
  'azerbaijan', 'bahamas', 'bahrain', 'bangladesh', 'barbados', 'belarus', 'belgium', 'belize', 'benin', 'bhutan', 'bolivia',
  'bosnia_and_herzegovina', 'botswana', 'brazil', 'brunei', 'bulgaria', 'burkina_faso', 'burundi', 'cabo_verde', 'cape_verde',
  'cambodia', 'cameroon', 'canada', 'central_african_republic', 'chad', 'chile', 'china', 'colombia', 'comoros', 'congo',
  'dr_congo', 'costa_rica', 'cote_divoire', 'ivory_coast', 'croatia', 'cuba', 'cyprus', 'czechia', 'czech_republic', 'denmark',
  'djibouti', 'dominica', 'dominican_republic', 'ecuador', 'egypt', 'el_salvador', 'equatorial_guinea', 'eritrea', 'estonia',
  'eswatini', 'ethiopia', 'fiji', 'finland', 'france', 'gabon', 'gambia', 'georgia', 'germany', 'deutschland', 'ghana', 'greece',
  'grenada', 'guatemala', 'guinea', 'guinea_bissau', 'guyana', 'haiti', 'honduras', 'hungary', 'iceland', 'india', 'indonesia',
  'iran', 'iraq', 'ireland', 'israel', 'italy', 'jamaica', 'japan', 'jordan', 'kazakhstan', 'kenya', 'kiribati', 'kosovo',
  'kuwait', 'kyrgyzstan', 'laos', 'latvia', 'lebanon', 'lesotho', 'liberia', 'libya', 'liechtenstein', 'lithuania', 'luxembourg',
  'madagascar', 'malawi', 'malaysia', 'maldives', 'mali', 'malta', 'marshall_islands', 'mauritania', 'mauritius', 'mexico',
  'micronesia', 'moldova', 'monaco', 'mongolia', 'montenegro', 'morocco', 'mozambique', 'myanmar', 'namibia', 'nauru', 'nepal',
  'netherlands', 'holland', 'new_zealand', 'nicaragua', 'niger', 'nigeria', 'north_korea', 'north_macedonia', 'norway', 'oman',
  'pakistan', 'palau', 'palestine', 'panama', 'papua_new_guinea', 'paraguay', 'peru', 'philippines', 'poland', 'portugal', 'qatar',
  'romania', 'russia', 'rwanda', 'saint_kitts_and_nevis', 'saint_lucia', 'saint_vincent_and_the_grenadines', 'samoa', 'san_marino',
  'sao_tome_and_principe', 'saudi_arabia', 'senegal', 'serbia', 'seychelles', 'sierra_leone', 'singapore', 'slovakia', 'slovenia',
  'solomon_islands', 'somalia', 'south_africa', 'south_korea', 'korea', 'south_sudan', 'spain', 'espana', 'sri_lanka', 'sudan',
  'suriname', 'sweden', 'switzerland', 'syria', 'taiwan', 'tajikistan', 'tanzania', 'thailand', 'timor_leste', 'east_timor', 'togo',
  'tonga', 'trinidad_and_tobago', 'tunisia', 'turkey', 'turkiye', 'turkmenistan', 'tuvalu', 'uganda', 'ukraine',
  'united_arab_emirates', 'uae', 'united_kingdom', 'uk', 'great_britain', 'britain', 'england', 'scotland', 'wales',
  'northern_ireland', 'united_states', 'usa', 'america', 'uruguay', 'uzbekistan', 'vanuatu', 'vatican', 'vatican_city',
  'venezuela', 'vietnam', 'yemen', 'zambia', 'zimbabwe',
]

const regions = [
  'kurdistan', 'krg', 'greenland', 'hong_kong', 'macau', 'puerto_rico', 'western_sahara', 'somaliland', 'northern_cyprus',
  'europe', 'european_union', 'eu', 'africa', 'african_union', 'asia', 'arab_league', 'united_nations', 'un', 'unicef', 'unesco',
  'who', 'nato', 'interpol', 'red_cross', 'red_crescent',
]

const government = [
  'government', 'gov', 'president', 'presidency', 'prime_minister', 'primeminister', 'pm', 'ministry', 'minister', 'parliament',
  'senate', 'congress', 'embassy', 'consulate', 'police', 'army', 'military', 'navy', 'air_force', 'intelligence', 'customs',
  'border', 'court', 'supreme_court', 'whitehouse', 'white_house', 'kremlin', 'downing_street', 'king', 'queen', 'royal',
]

const system = ['zbot', 'verifybot', 'verify', 'verified', 'passgram', 'zpass', 'official', 'support', 'admin']

export const DEFAULT_TEXT = JSON.stringify({
  about: 'Usernames nobody can take. Countries and government names are given only to the real government, after talking with them. Give one out in Admin → Usernames → Give a username.',
  countries, regions, government, system,
}, null, 2)

/** Checks the text and returns { ok, error, line, lists, names } — `names` is the flat map saved for the rules. */
export function parseReserved(text) {
  let data
  try { data = JSON.parse(text) } catch (e) {
    const at = Number(/position (\d+)/.exec(e.message)?.[1])
    const line = Number.isFinite(at) ? text.slice(0, at).split('\n').length : (Number(/line (\d+)/.exec(e.message)?.[1]) || 0)
    return { ok: false, error: e.message.replace(/^JSON\.parse: /, ''), line }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'The text must be one { … } object with lists inside.' }
  const names = {}, lists = []
  for (const [list, value] of Object.entries(data)) {
    if (typeof value === 'string') continue // notes like "about"
    if (!Array.isArray(value)) return { ok: false, error: `"${list}" must be a list: "${list}": ["name", …]` }
    if (!/^[A-Za-z0-9_]{1,40}$/.test(list)) return { ok: false, error: `List name "${list}" may only use letters, numbers and _` }
    let count = 0
    for (const raw of value) {
      const name = String(raw).trim().toLowerCase().replace(/^@/, '')
      if (!NAME.test(name)) return { ok: false, error: `"${raw}" in "${list}" is not a valid username (a–z, 0–9, _ and at most 32 characters).` }
      names[name] = list
      const compact = name.replace(/_/g, '') // "united_states" also blocks "unitedstates"
      if (compact && !names[compact]) names[compact] = list
      count++
    }
    lists.push({ list, count })
  }
  if (Object.keys(names).length > 20000) return { ok: false, error: 'Too many names (max 20,000).' }
  return { ok: true, lists, names, total: lists.reduce((n, l) => n + l.count, 0) }
}
