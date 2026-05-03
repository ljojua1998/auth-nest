'use strict';
const https = require('https');
const { DataSource } = require('typeorm');
require('dotenv').config();

const API_KEY = '25e9f758850770b9b69883a873b86c85';
const BASE = 'https://v3.football.api-sports.io';

let reqCount = 0;
async function apiGet(path) {
  reqCount++;
  return new Promise((resolve, reject) => {
    const req = https.request(`${BASE}${path}`, { headers: { 'x-apisports-key': API_KEY } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const DELAY = 7000; // 7s between requests — safe under 10/min limit

// ─── Tier logic ──────────────────────────────────────────────────────────────
const SUPERSTAR_IDS = new Set([
  133609,44,386828,1323,762,10009,1496,129718,1460,631,184,154,217,6009,2472,6716,203224,502,978,
  278,    // Mbappé
  627,    // De Bruyne
  164,    // Modrić
  2931,   // Donnarumma
  874,    // C. Ronaldo
  521,    // Bruno Fernandes
  3128,   // R. Leão
  1028,   // Van Dijk
  25887,  // Theo Hernández
  49366,  // Barella
  342366, // Tchouaméni
]);

const STRONG_CODES = new Set(['FRA','POR','NED','ITA','BEL','CRO','SUI','DEN','POL','SRB','WAL','TUR','AUT','SCO','NOR','SWE','UKR','CZE','HUN','GRE','SVK','SVN']);
const RESERVE_CODES = new Set(['SMR','LIE','GIB','FRO','AND','MLT','CYP','LUX','NIR']);

function getTierName(apiId, teamCode) {
  if (SUPERSTAR_IDS.has(apiId)) return 'Superstar';
  if (RESERVE_CODES.has(teamCode)) return 'Reserve';
  if (STRONG_CODES.has(teamCode)) return 'Strong';
  return 'Average';
}

const POS_MAP = { Goalkeeper: 'GK', Defender: 'DEF', Midfielder: 'MID', Attacker: 'FWD' };

// ─── Teams: IDs already resolved from last run ───────────────────────────────
const UEFA_TEAMS = [
  { code: 'SVK', name: 'Slovakia',         apiId: 773 },
  { code: 'NIR', name: 'Northern Ireland', apiId: 771 },
  { code: 'LUX', name: 'Luxembourg',       apiId: 1102 },
  { code: 'SUI', name: 'Switzerland',      apiId: 15 },
  { code: 'KVX', name: 'Kosovo',           apiId: 1111 },
  { code: 'SVN', name: 'Slovenia',         apiId: 1091 },
  { code: 'SWE', name: 'Sweden',           apiId: 5 },
  { code: 'DEN', name: 'Denmark',          apiId: 21 },
  { code: 'SCO', name: 'Scotland',         apiId: 1108 },
  { code: 'GRE', name: 'Greece',           apiId: 1117 },
  { code: 'BLR', name: 'Belarus',          apiId: 1100 },
  { code: 'FRA', name: 'France',           apiId: 2 },
  { code: 'UKR', name: 'Ukraine',          apiId: 772 },
  { code: 'ISL', name: 'Iceland',          apiId: 18 },
  { code: 'AZE', name: 'Azerbaijan',       apiId: 1096 },
  { code: 'TUR', name: 'Turkey',           apiId: 777 },
  { code: 'GEO', name: 'Georgia',          apiId: 1104 },
  { code: 'BUL', name: 'Bulgaria',         apiId: 1103 },
  { code: 'POR', name: 'Portugal',         apiId: 27 },
  { code: 'IRL', name: 'Rep of Ireland',   search: 'Ireland' }, // re-search
  { code: 'HUN', name: 'Hungary',          apiId: 769 },
  { code: 'ARM', name: 'Armenia',          apiId: 1094 },
  { code: 'NED', name: 'Netherlands',      apiId: 1118 },
  { code: 'POL', name: 'Poland',           apiId: 24 },
  { code: 'FIN', name: 'Finland',          apiId: 1099 },
  { code: 'MLT', name: 'Malta',            apiId: 1112 },
  { code: 'LTU', name: 'Lithuania',        search: 'Lithuania' },
  { code: 'AUT', name: 'Austria',          search: 'Austria' },
  { code: 'BIH', name: 'Bosnia',           search: 'Bosnia' },
  { code: 'ROU', name: 'Romania',          search: 'Romania' },
  { code: 'CYP', name: 'Cyprus',           search: 'Cyprus' },
  { code: 'SMR', name: 'San Marino',       search: 'San Marino' },
  { code: 'NOR', name: 'Norway',           search: 'Norway' },
  { code: 'ITA', name: 'Italy',            search: 'Italy' },
  { code: 'ISR', name: 'Israel',           search: 'Israel' },
  { code: 'EST', name: 'Estonia',          search: 'Estonia' },
  { code: 'MDA', name: 'Moldova',          search: 'Moldova' },
  { code: 'MKD', name: 'N Macedonia',      search: 'North Macedonia' },
  { code: 'KAZ', name: 'Kazakhstan',       search: 'Kazakhstan' },
  { code: 'LIE', name: 'Liechtenstein',    search: 'Liechtenstein' },
  { code: 'BEL', name: 'Belgium',          apiId: 1 },
  { code: 'WAL', name: 'Wales',            apiId: 767 },
  { code: 'ALB', name: 'Albania',          search: 'Albania' },
  { code: 'SRB', name: 'Serbia',           apiId: 14 },
  { code: 'LVA', name: 'Latvia',           search: 'Latvia' },
  { code: 'AND', name: 'Andorra',          search: 'Andorra' },
  { code: 'CRO', name: 'Croatia',          apiId: 3 },
  { code: 'CZE', name: 'Czechia',          search: 'Czech Republic' },
  { code: 'FRO', name: 'Faroes',           search: 'Faroe Islands' },
  { code: 'MNE', name: 'Montenegro',       search: 'Montenegro' },
  { code: 'GIB', name: 'Gibraltar',        search: 'Gibraltar' },
];

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    synchronize: false,
  });
  await ds.initialize();
  console.log('DB connected\n');

  const tiers = await ds.query('SELECT id, name FROM tiers');
  const tierMap = {};
  tiers.forEach(t => tierMap[t.name] = t.id);

  // ─── Step 1: Resolve missing IDs (sequential, 7s delay) ─────────────────────
  console.log('── Step 1: Resolving missing team IDs (7s/req) ──');
  const toSearch = UEFA_TEAMS.filter(t => !t.apiId && t.search);
  for (const t of toSearch) {
    const res = await apiGet(`/teams?search=${encodeURIComponent(t.search)}`);
    await sleep(DELAY);
    const matches = (res.response || []).filter(r => r.team.national === true);
    // prefer exact match / exclude U21/U20 etc
    const nat = matches.find(r => !/U\d\d|Youth|Olympic/i.test(r.team.name)) || matches[0];
    if (nat) {
      t.apiId = nat.team.id;
      console.log(`  ${t.code}: ${nat.team.id} (${nat.team.name})`);
    } else {
      console.log(`  ${t.code}: NOT FOUND for "${t.search}"`);
    }
  }

  const resolved = UEFA_TEAMS.filter(t => t.apiId);
  console.log(`\nResolved: ${resolved.length}/${UEFA_TEAMS.length}`);
  console.log(`API requests so far: ${reqCount}`);

  // ─── Step 2: Ensure teams exist in DB ────────────────────────────────────────
  console.log('\n── Step 2: Teams in DB ──');
  const dbTeamMap = {};
  for (const t of UEFA_TEAMS) {
    const existing = await ds.query('SELECT id FROM teams WHERE code = $1', [t.code]);
    if (existing.length > 0) {
      dbTeamMap[t.code] = existing[0].id;
    } else {
      const ins = await ds.query(
        'INSERT INTO teams(name, code, "group", eliminated, "createdAt") VALUES($1,$2,$3,false,NOW()) RETURNING id',
        [t.name, t.code, 'Q']
      );
      dbTeamMap[t.code] = ins[0].id;
      console.log(`  Added: ${t.name} (${t.code})`);
    }
  }
  console.log(`Teams ready: ${Object.keys(dbTeamMap).length}`);

  // ─── Step 3: Fetch squads + insert players (sequential, 7s delay) ────────────
  console.log('\n── Step 3: Fetching squads + inserting players ──');
  let totalCreated = 0, totalSkipped = 0;

  for (const t of resolved) {
    const res = await apiGet(`/players/squads?team=${t.apiId}`);
    await sleep(DELAY);

    if (!res.response || res.response.length === 0) {
      console.log(`  ${t.code}: empty squad`);
      continue;
    }

    const players = res.response[0].players;
    const dbTeamId = dbTeamMap[t.code];
    if (!dbTeamId) { console.log(`  ${t.code}: no dbTeamId`); continue; }

    let created = 0, skipped = 0;
    for (const p of players) {
      if (!p.id) continue;
      const exists = await ds.query('SELECT id FROM players WHERE "apiFootballId" = $1', [p.id]);
      if (exists.length > 0) { skipped++; continue; }

      const tierName = getTierName(p.id, t.code);
      const tierId = tierMap[tierName] ?? tierMap['Average'];
      const pos = POS_MAP[p.position] ?? 'MID';

      await ds.query(
        `INSERT INTO players(name, position, photo, "apiFootballId", "teamId", "tierId", "createdAt")
         VALUES($1,$2,$3,$4,$5,$6,NOW())`,
        [p.name, pos, p.photo ?? null, p.id, dbTeamId, tierId]
      );
      created++;
    }
    totalCreated += created;
    totalSkipped += skipped;
    console.log(`  ${t.code} (${t.apiId}): +${created} players (${skipped} skipped)`);
  }

  console.log(`\n✅ Done!`);
  console.log(`   Players created: ${totalCreated}`);
  console.log(`   Players skipped: ${totalSkipped}`);
  console.log(`   API requests this run: ${reqCount}`);

  await ds.destroy();
}

main().catch(e => { console.error(e.message); process.exit(1); });
