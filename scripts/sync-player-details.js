'use strict';
const https = require('https');
const { DataSource } = require('typeorm');
require('dotenv').config();

const API_KEY = process.env.API_FOOTBALL_KEY || '9ee469c18a9351b82a980d00047be7c2';
const BASE = 'https://v3.football.api-sports.io';
const DELAY = 7000; // free plan: 10 req/min safe
const SEASON = 2024;
const MAX_REQS = parseInt(process.env.SYNC_LIMIT || '100', 10);

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

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    synchronize: false,
  });
  await ds.initialize();
  console.log('DB connected\n');

  // ── Step 1: Republic of Ireland squad ──────────────────────────────────────
  console.log('== Step 1: Republic of Ireland ==');
  const irlTeam = await ds.query(`SELECT id FROM teams WHERE code = 'IRL'`);
  if (irlTeam.length > 0) {
    const irlCount = await ds.query(`SELECT COUNT(*) as cnt FROM players WHERE "teamId" = $1`, [irlTeam[0].id]);
    if (Number(irlCount[0].cnt) === 0) {
      console.log('  Fetching IRL squad...');
      const searchRes = await apiGet('/teams?search=Ireland');
      await sleep(DELAY);
      const irlNat = (searchRes.response || []).find(r =>
        r.team.national === true && /^(Ireland|Republic of Ireland|Rep\. Of Ireland)$/i.test(r.team.name)
      );
      if (irlNat) {
        console.log(`  Found: ${irlNat.team.name} (API ID: ${irlNat.team.id})`);
        const squadRes = await apiGet(`/players/squads?team=${irlNat.team.id}`);
        await sleep(DELAY);
        if (squadRes.response && squadRes.response.length > 0) {
          const tiers = await ds.query('SELECT id, name FROM tiers');
          const tierMap = {};
          tiers.forEach(t => tierMap[t.name] = t.id);
          const avgTierId = tierMap['Average'];
          const posMap = { Goalkeeper: 'GK', Defender: 'DEF', Midfielder: 'MID', Attacker: 'FWD' };
          let created = 0;
          for (const p of squadRes.response[0].players) {
            if (!p.id) continue;
            const exists = await ds.query('SELECT id FROM players WHERE "apiFootballId" = $1', [p.id]);
            if (exists.length > 0) continue;
            const pos = posMap[p.position] || 'MID';
            await ds.query(
              `INSERT INTO players(name, position, photo, "apiFootballId", "teamId", "tierId", "number", "age", "createdAt")
               VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
              [p.name, pos, p.photo || null, p.id, irlTeam[0].id, avgTierId, p.number || null, p.age || null]
            );
            created++;
          }
          console.log(`  IRL: +${created} players added`);
        } else {
          console.log('  IRL: empty squad response');
        }
      } else {
        console.log('  IRL: national team not found in search results');
        const allTeams = (searchRes.response || []).map(r => r.team.name);
        console.log('  Found:', allTeams.join(', '));
      }
    } else {
      console.log(`  IRL: already has ${irlCount[0].cnt} players`);
    }
  }

  // ── Step 2: Player detail sync ─────────────────────────────────────────────
  console.log('\n== Step 2: Player detail sync ==');
  const allPlayers = await ds.query(
    `SELECT id, "apiFootballId" FROM players WHERE "apiFootballId" IS NOT NULL AND "lastSyncAt" IS NULL ORDER BY id`
  );

  const budget = MAX_REQS - reqCount;
  const batch = allPlayers.slice(0, budget);
  console.log(`  Total unsync: ${allPlayers.length}, this run: ${batch.length} (${budget} reqs left)`);

  let synced = 0, errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < batch.length; i++) {
    const p = batch[i];
    if (reqCount >= MAX_REQS) {
      console.log(`  Daily limit reached (${reqCount} reqs), stopping.`);
      break;
    }
    try {
      const res = await apiGet(`/players?id=${p.apiFootballId}&season=${SEASON}`);
      await sleep(DELAY);

      if (res.errors && (res.errors.token || res.errors.rateLimit)) {
        console.log(`  API error: ${JSON.stringify(res.errors)}, stopping.`);
        break;
      }

      const data = (res.response && res.response.length > 0) ? res.response[0] : null;

      if (!data) {
        await ds.query(`UPDATE players SET "lastSyncAt" = NOW() WHERE id = $1`, [p.id]);
        errors++;
        continue;
      }

      const player = data.player;
      const stats = data.statistics && data.statistics.length > 0 ? data.statistics[0] : null;

      await ds.query(
        `UPDATE players SET
          "birthDate" = $1, "birthPlace" = $2, "nationality" = $3,
          "height" = $4, "weight" = $5, "injured" = $6, "rating" = $7,
          "age" = COALESCE($8, "age"), "number" = COALESCE($9, "number"),
          "lastSyncAt" = NOW()
        WHERE id = $10`,
        [
          player.birth?.date || null,
          player.birth?.place || null,
          player.nationality || null,
          player.height || null,
          player.weight || null,
          player.injured || false,
          stats?.games?.rating ? parseFloat(stats.games.rating) : null,
          player.age || null,
          stats?.games?.number || null,
          p.id,
        ]
      );
      synced++;

      if ((i + 1) % 10 === 0) {
        const eta = ((batch.length - i - 1) * DELAY / 1000 / 60).toFixed(1);
        console.log(`  ${i + 1}/${batch.length} | synced: ${synced} | errors: ${errors} | reqs: ${reqCount} | ~${eta}min left`);
      }
    } catch (err) {
      console.log(`  Error #${p.id} (api:${p.apiFootballId}): ${err.message}`);
      errors++;
    }
  }

  const totalMin = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const stillLeft = await ds.query(`SELECT COUNT(*) as cnt FROM players WHERE "lastSyncAt" IS NULL`);
  console.log(`\n== Done! ==`);
  console.log(`  Synced: ${synced}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  API requests: ${reqCount}`);
  console.log(`  Time: ${totalMin} min`);
  console.log(`  Still unsync: ${stillLeft[0].cnt}`);
  console.log(`  Run again tomorrow for next batch!`);

  await ds.destroy();
}

main().catch(e => { console.error(e.message); process.exit(1); });
