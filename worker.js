// Автокейс: сервер на Cloudflare Workers + D1.
// Нужны: привязка D1 с именем DB, секреты BOT_TOKEN, WEBHOOK_SECRET, ADMIN_ID.

const ADMIN_IDS = [7638194816]; // администраторы (кроме секрета ADMIN_ID)
const FEE = 0.05, LOT_MAX = 10, PMIN = 0.5, PMAX = 5; // рынок: комиссия, лимит лотов, цена от 50% до 500% ценности
// Апгрейдер: множитель и шанс успеха в %. Меняй здесь — фронт подхватит те же числа.
const UPG = [{ m: 2, c: 70 }, { m: 5, c: 50 }, { m: 10, c: 25 }];
const GAME_URL = 'https://ahmedovalimagomed1-a11y.github.io/Cars/';
const HELP = `📖 <b>Как играть</b>

1. Открой игру кнопкой ниже
2. Покупай кейсы — от 1 000 ₽
3. Выбитые машины лежат в «Гараже»
4. Продай машину или выставь на «Рынке»

🎁 Бесплатно: «Ещё» → Ежедневный бонус и Подработка
🍀 Удача повышает шанс на редкие тачки
🎟 Промокоды вводятся в «Ещё»
👥 За друзей — процент с их продаж`;
const START = 100000, WORK_CD = 60000, DAILY_CD = 86400000, DAILY_BONUS = 20000, GARAGE_CAP = 300;
// Ежедневные задания
const QLIST = [
  { id:'open3', need:3, type:'open', rub:15000, txt:'Открой 3 кейса' },
  { id:'open5', need:5, type:'open', rub:25000, txt:'Открой 5 кейсов' },
  { id:'sell2', need:2, type:'sell', rub:12000, txt:'Продай 2 машины' },
  { id:'sell4', need:4, type:'sell', rub:20000, txt:'Продай 4 машины' },
  { id:'up1',   need:1, type:'upg', rub:15000, txt:'Сделай 1 апгрейд' },
  { id:'up2',   need:2, type:'upg', rub:30000, txt:'Сделай 2 апгрейда' },
];
// Друзья: % с продаж друга, бонус новичку по ссылке, награды за активных друзей
const REF_PCT = 0.05, REF_MIN_OPENS = 5, REF_FRIEND_BONUS = 10000;
const REF_MS = [
  { need: 1, kind: 'rub', amount: 25000, label: '25 000 ₽' },
  { need: 3, kind: 'rub', amount: 100000, label: '100 000 ₽' },
  { need: 5, kind: 'luck', mult: 5, hours: 24, label: 'Удача ×5 на 24 ч' },
  { need: 10, kind: 'rub', amount: 500000, label: '500 000 ₽' },
];

const CARS = [[["ВАЗ-2105", 150, 30],["ВАЗ-2107", 200, 25],["Daewoo Matiz", 180, 20],["ЗАЗ Sens", 170, 20],["Lada Kalina", 250, 15],["ВАЗ-2114", 240, 15],["Lada Priora", 300, 7],["Lada Granta", 350, 3]],
[["Renault Logan", 700, 30],["Kia Rio", 800, 25],["Hyundai Solaris", 900, 22],["Lada Vesta", 1000, 18],["Volkswagen Polo", 1200, 15],["Ford Focus", 1100, 15],["Mazda 3", 1600, 8],["Skoda Octavia", 1400, 7],["Toyota Corolla", 1800, 3]],
[["Toyota Camry", 3000, 30],["BMW 3 Series", 3800, 25],["Audi A4", 4500, 20],["Mercedes C-Class", 5500, 15],["Honda Civic Type R", 8000, 8],["Lexus IS", 7000, 7],["Nissan 370Z", 9000, 5],["Subaru WRX STI", 10000, 3]],
[["BMW M5", 15000, 30],["Audi RS7", 20000, 25],["Mercedes G63 AMG", 28000, 20],["Nissan GT-R", 40000, 14],["Porsche 911", 45000, 12],["Lamborghini Huracán", 80000, 6],["Ferrari F8", 150000, 2]],
[["McLaren 720S", 250000, 30],["Lamborghini Aventador SVJ", 400000, 25],["Ferrari SF90", 600000, 20],["Porsche 918 Spyder", 900000, 12],["Rolls-Royce Phantom", 1200000, 8]],
[["Bugatti Chiron", 3000000, 30],["Koenigsegg Jesko", 6000000, 20],["Pagani Huayra", 10000000, 12],["Bugatti La Voiture Noire", 25000000, 3]]];
const CASES = [
  { p: 1000, o: [72, 20, 7, 1, 0, 0] },
  { p: 3000, o: [36, 40, 19, 5, 0, 0] },
  { p: 9000, o: [8, 30, 44, 17.8, 0.2, 0] },
  { p: 25000, o: [0, 10, 30, 59, 1, 0] },
  { p: 150000, o: [0, 0, 15, 65, 19.5, 0.5] },
  { p: 450000, o: [0, 0, 0, 30, 69, 1] },
];
// Магазин за звёзды Telegram (⭐). Цены и награды меняй здесь.
const ITEMS = {
  rub1:   { stars: 25,  rub: 50000,   title: '50 000 ₽',   desc: 'Пачка рублей на баланс' },
  rub2:   { stars: 100, rub: 300000,  title: '300 000 ₽',  desc: 'Пачка рублей на баланс' },
  rub3:   { stars: 500, rub: 2000000, title: '2 000 000 ₽', desc: 'Большая пачка рублей' },
  luck10: { stars: 50,  luck: 10, hours: 2, title: 'Удача ×10 на 2 часа', desc: 'Больше шанс на редкие машины' },
};

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type,x-init', 'Access-Control-Allow-Methods': 'POST,GET,OPTIONS' };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'content-type': 'application/json' } });
const err = (e, m) => json({ ok: false, e, m: m || e });

let ready = false;
async function schema(DB) {
  if (ready) return;
  await DB.batch([
    DB.prepare('CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT,bal INTEGER DEFAULT 100000,opened INTEGER DEFAULT 0,best INTEGER DEFAULT 0,lw INTEGER DEFAULT 0,ld INTEGER DEFAULT 0,luck REAL DEFAULT 1,luck_until INTEGER DEFAULT 0,banned INTEGER DEFAULT 0,created INTEGER)'),
    DB.prepare('CREATE TABLE IF NOT EXISTS cars(id INTEGER PRIMARY KEY AUTOINCREMENT,uid INTEGER,name TEXT,tier INTEGER,value INTEGER)'),
    DB.prepare('CREATE TABLE IF NOT EXISTS promos(code TEXT PRIMARY KEY,amount INTEGER,uses INTEGER)'),
    DB.prepare('CREATE TABLE IF NOT EXISTS promo_used(code TEXT,uid INTEGER,PRIMARY KEY(code,uid))'),
    DB.prepare('CREATE TABLE IF NOT EXISTS pays(id TEXT PRIMARY KEY)'),
    DB.prepare('CREATE TABLE IF NOT EXISTS news(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT,body TEXT,ts INTEGER)'),
    DB.prepare('CREATE TABLE IF NOT EXISTS lots(id INTEGER PRIMARY KEY AUTOINCREMENT,seller INTEGER,seller_name TEXT,car_name TEXT,tier INTEGER,value INTEGER,price INTEGER,ts INTEGER)'),
    DB.prepare('CREATE TABLE IF NOT EXISTS deals(id INTEGER PRIMARY KEY AUTOINCREMENT,buyer INTEGER,seller INTEGER,car_name TEXT,tier INTEGER,price INTEGER,fee INTEGER,ts INTEGER)'),
    DB.prepare('CREATE INDEX IF NOT EXISTS idx_lots_seller ON lots(seller)'),
    DB.prepare('CREATE INDEX IF NOT EXISTS idx_cars_uid ON cars(uid)'),
    DB.prepare('CREATE INDEX IF NOT EXISTS idx_users_bal ON users(bal)'),
    DB.prepare('CREATE TABLE IF NOT EXISTS refs(uid INTEGER PRIMARY KEY,ref INTEGER,earned INTEGER DEFAULT 0,ts INTEGER)'),
    DB.prepare('CREATE INDEX IF NOT EXISTS idx_refs_ref ON refs(ref)'),
    DB.prepare('CREATE TABLE IF NOT EXISTS quests(uid INTEGER,key TEXT,done INTEGER DEFAULT 0,claimed INTEGER DEFAULT 0,day INTEGER,PRIMARY KEY(uid,key,day))'),
  ]);
  // добавляем колонки удачи к промокодам (если уже есть — ошибка игнорируется)
  for (const q of ['ALTER TABLE promos ADD COLUMN luck REAL DEFAULT 1', 'ALTER TABLE promos ADD COLUMN hours REAL DEFAULT 0', 'ALTER TABLE users ADD COLUMN refearned INTEGER DEFAULT 0', 'ALTER TABLE users ADD COLUMN refbonus INTEGER DEFAULT 0', 'ALTER TABLE users ADD COLUMN dstr INTEGER DEFAULT 0', 'ALTER TABLE users ADD COLUMN dlast INTEGER DEFAULT 0']) {
    try { await DB.prepare(q).run(); } catch (e) { /* колонка уже есть */ }
  }
  ready = true;
}

// ---------- проверка подписи Telegram ----------
const enc = new TextEncoder();
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
async function auth(initData, token) {
  const p = new URLSearchParams(initData || '');
  const h = p.get('hash');
  if (!h) return null;
  p.delete('hash');
  const dcs = [...p.entries()].map(([k, v]) => k + '=' + v).sort().join('\n');
  const secret = await hmac('WebAppData', token);
  if (hex(await hmac(secret, dcs)) !== h) return null;
  if (Date.now() / 1000 - Number(p.get('auth_date') || 0) > 86400 * 3) return null;
  try { return { u: JSON.parse(p.get('user')), sp: p.get('start_param') || '' }; } catch { return null; }
}
const tg = (env, method, body) =>
  fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());

// @username бота — нужен для реферальных ссылок (кэшируем на изолят)
let BOT_USERNAME = '';
async function botName(env) {
  if (!BOT_USERNAME) {
    try { const r = await tg(env, 'getMe'); if (r && r.ok) BOT_USERNAME = r.result.username || ''; } catch (e) { /* ignore */ }
  }
  return BOT_USERNAME;
}
const refLink = (bot, uid) => (bot ? `https://t.me/${bot}?startapp=ref_${uid}` : '');

// ---------- игра ----------
function wpick(w) {
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) if ((r -= w[i]) < 0) return i;
  return w.length - 1;
}
// Удача умножает шансы редкостей: чем выше редкость, тем сильнее усиление.
function luckOdds(ci, luck) {
  const m = luck > 1 ? [1, luck, luck * 1.3, luck * 1.6, luck * 2, luck * 2.5] : [1, 1, 1, 1, 1, 1];
  return CASES[ci].o.map((x, t) => x * m[t]);
}
// верхняя «базовая» ценность тира — по ней определяем редкость машины после апгрейда
const TOPV = [350, 1800, 10000, 150000, 1200000, 25000000];
function tierFor(v) { let t = 0; while (t < 5 && v > TOPV[t]) t++; return t; }
function roll(ci, luck) {
  const t = wpick(luckOdds(ci, luck)), cs = CARS[t], c = cs[wpick(cs.map((x) => x[2]))];
  return { t, n: c[0], v: c[1] };
}
async function state(DB, uid, isAdmin) {
  const u = await DB.prepare('SELECT * FROM users WHERE id=?').bind(uid).first();
  const cars = (await DB.prepare('SELECT id,name n,tier t,value v FROM cars WHERE uid=? ORDER BY id').bind(uid).all()).results;
  const now = Date.now();
  return { ok: true, id: uid, bal: u.bal, opened: u.opened, best: u.best, lw: u.lw, ld: u.ld, luck: u.luck_until > now ? u.luck : 1, luckUntil: u.luck_until, cars, admin: isAdmin, now, dstr: u.dstr || 0, dlast: u.dlast || 0 };
}
async function credit(DB, uid, item) {
  const now = Date.now();
  if (item.rub) await DB.prepare('UPDATE users SET bal=bal+? WHERE id=?').bind(item.rub, uid).run();
  if (item.luck) await DB.prepare('UPDATE users SET luck=?, luck_until=MAX(luck_until,?)+? WHERE id=?').bind(item.luck, now, item.hours * 3600000, uid).run();
}

// 5% с каждой продажи друга уходят пригласившему (друг должен открыть REF_MIN_OPENS кейсов)
async function payRef(DB, uid, sum) {
  if (!(sum > 0)) return;
  const r = await DB.prepare('SELECT u.opened, r.ref FROM users u LEFT JOIN refs r ON r.uid=u.id WHERE u.id=?').bind(uid).first();
  if (!r || !r.ref || r.opened < REF_MIN_OPENS) return;
  const cut = Math.floor(sum * REF_PCT);
  if (cut < 1) return;
  await DB.batch([
    DB.prepare('UPDATE users SET bal=bal+?,refearned=refearned+? WHERE id=?').bind(cut, cut, r.ref),
    DB.prepare('UPDATE refs SET earned=earned+? WHERE uid=?').bind(cut, uid),
  ]);
}

const dayKey = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
function pickQs(){const a=[...QLIST];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a.slice(0,3)}
async function handle(a, uid, u, env) {
  const DB = env.DB, isAdmin = ADMIN_IDS.includes(uid) || uid === Number(env.ADMIN_ID);
  const st = () => state(DB, uid, isAdmin);
  switch (a.a) {
    case 'state': return json({ ...(await st()), bot: await botName(env) });

    case 'open': {
      const ci = a.ci | 0, n = a.n === 5 ? 5 : 1, c = CASES[ci];
      if (!c) return err('bad');
      const cnt = (await DB.prepare('SELECT COUNT(*) c FROM cars WHERE uid=?').bind(uid).first()).c;
      if (cnt + n > GARAGE_CAP) return err('full', `Гараж полон (${GARAGE_CAP}). Продай машины.`);
      const r = await DB.prepare('UPDATE users SET bal=bal-?1,opened=opened+?2 WHERE id=?3 AND bal>=?1').bind(c.p * n, n, uid).run();
      if (!r.meta.changes) return err('funds', 'Не хватает денег');
      const luck = u.luck_until > Date.now() ? u.luck : 1;
      const drops = Array.from({ length: n }, () => roll(ci, luck));
      const res = await DB.batch([
        ...drops.map((d) => DB.prepare('INSERT INTO cars(uid,name,tier,value) VALUES(?,?,?,?)').bind(uid, d.n, d.t, d.v)),
        DB.prepare('UPDATE users SET best=MAX(best,?) WHERE id=?').bind(Math.max(...drops.map((d) => d.v)), uid),
      ]);
      drops.forEach((d, i) => { d.id = res[i].meta.last_row_id; });
      // прогресс заданий на открытие
      try {
        const dk = dayKey();
        for (const key of ['open3','open5']) {
          const qr = await env.DB.prepare('SELECT done,claimed FROM quests WHERE uid=? AND key=? AND day=?').bind(uid, key, dk).first();
          if (qr && !qr.claimed) {
            const nd = Math.min(5, (qr.done || 0) + n);
            await env.DB.prepare('UPDATE quests SET done=? WHERE uid=? AND key=? AND day=?').bind(nd, uid, key, dk).run();
          }
        }
      } catch(e) {}
      return json({ ...(await st()), drops: drops.map((d) => ({ id: d.id, n: d.n, t: d.t, v: d.v })) });
    }

    case 'sell': {
      let sql, args;
      if (a.scope === 'all') { sql = 'DELETE FROM cars WHERE uid=? RETURNING value'; args = [uid]; }
      else if (/^t[0-5]$/.test(a.scope || '')) { sql = 'DELETE FROM cars WHERE uid=? AND tier=? RETURNING value'; args = [uid, +a.scope[1]]; }
      else {
        const ids = (a.ids || []).map(Number).filter(Number.isInteger).slice(0, 300);
        if (!ids.length) return err('bad');
        sql = `DELETE FROM cars WHERE uid=? AND id IN (${ids.map(() => '?').join(',')}) RETURNING value`;
        args = [uid, ...ids];
      }
      const r = await DB.prepare(sql).bind(...args).all();
      const sum = r.results.reduce((s, x) => s + x.value, 0);
      const soldn = r.results.length;
      if (sum) await DB.prepare('UPDATE users SET bal=bal+? WHERE id=?').bind(sum, uid).run();
      await payRef(DB, uid, sum);
      try {
        const dk = dayKey();
        for (const key of ['sell2','sell4']) {
          const qr = await env.DB.prepare('SELECT done,claimed FROM quests WHERE uid=? AND key=? AND day=?').bind(uid, key, dk).first();
          if (qr && !qr.claimed) {
            const nd = Math.min(4, (qr.done || 0) + soldn);
            await env.DB.prepare('UPDATE quests SET done=? WHERE uid=? AND key=? AND day=?').bind(nd, uid, key, dk).run();
          }
        }
      } catch(e) {}
      return json({ ...(await st()), sold: r.results.length, sum });
    }

    case 'work': {
      const now = Date.now(), lvl = 1 + Math.floor(u.opened / 10);
      // оплата растёт с уровнем: +30% за каждый уровень
      const p = Math.round((150 + Math.floor(Math.random() * 251)) * (1 + 0.3 * (lvl - 1)));
      const r = await DB.prepare('UPDATE users SET bal=bal+?,lw=? WHERE id=? AND lw<=?').bind(p, now, uid, now - WORK_CD).run();
      if (!r.meta.changes) return err('cd', 'Ты устал, подожди немного');
      return json({ ...(await st()), gain: p });
    }

    case 'daily': {
      const now = Date.now(), dk = dayKey();
      // вчера = сегодняшний ключ минус 1 день (через дату)
      const yd = new Date(); yd.setDate(yd.getDate() - 1);
      const yk = yd.getFullYear() * 10000 + (yd.getMonth() + 1) * 100 + yd.getDate();
      const upd = await DB.prepare('UPDATE users SET bal=bal+?1,ld=?2,dstr=CASE WHEN dlast=?4 THEN dstr+1 ELSE 1 END,dlast=?3 WHERE id=?5 AND ld<=?2').bind(DAILY_BONUS, now, dk, yk, uid, now - DAILY_CD).run();
      if (!upd.meta.changes) return err('cd', 'Бонус уже забран');
      const uu = await DB.prepare('SELECT dstr FROM users WHERE id=?').bind(uid).first();
      const str = Math.max(1, (uu && uu.dstr) || 1);
      const mult = 1 + Math.min(6, str - 1) * 0.1; // +10% за каждый день подряд, макс +60%
      if (mult > 1) await DB.prepare('UPDATE users SET bal=bal+? WHERE id=?').bind(DAILY_BONUS * (mult - 1), uid).run();
      return json({ ...(await st()), gain: Math.round(DAILY_BONUS * mult), str });
    }

    case 'top': {
      // Богатство = деньги + стоимость машин. При тысячах игроков лучше кэшировать.
      const rows = (await DB.prepare('SELECT u.id,u.name,u.bal+COALESCE((SELECT SUM(value) FROM cars WHERE uid=u.id),0) nw FROM users u WHERE u.banned=0 ORDER BY nw DESC LIMIT 20').all()).results;
      return json({ ok: true, top: rows.map((r) => ({ n: r.name, v: r.nw, me: r.id === uid, id: isAdmin ? r.id : undefined })) });
    }

    case 'promo': {
      const code = String(a.code || '').trim().toUpperCase().slice(0, 32);
      const p = await DB.prepare('SELECT * FROM promos WHERE code=?').bind(code).first();
      if (!p) return err('nopromo', 'Такого промокода нет');
      const dec = await DB.prepare('UPDATE promos SET uses=uses-1 WHERE code=? AND uses>0').bind(code).run();
      if (!dec.meta.changes) return err('promoend', 'Промокод закончился');
      const ins = await DB.prepare('INSERT OR IGNORE INTO promo_used(code,uid) VALUES(?,?)').bind(code, uid).run();
      if (!ins.meta.changes) {
        await DB.prepare('UPDATE promos SET uses=uses+1 WHERE code=?').bind(code).run();
        return err('used', 'Ты уже использовал этот промокод');
      }
      const luck = Number(p.luck) > 1 ? Number(p.luck) : 0, hours = Number(p.hours) || 0;
      await credit(DB, uid, { rub: p.amount, luck: hours > 0 ? luck : 0, hours });
      return json({ ...(await st()), gain: p.amount, luck: luck || 1, hours });
    }

    case 'invoice': {
      const it = ITEMS[a.item];
      if (!it) return err('bad');
      const r = await tg(env, 'createInvoiceLink', { title: it.title, description: it.desc, payload: a.item, provider_token: '', currency: 'XTR', prices: [{ label: it.title, amount: it.stars }] });
      return r.ok ? json({ ok: true, url: r.result }) : err('tg', 'Не удалось создать счёт');
    }

    case 'shop': return json({ ok: true, items: Object.entries(ITEMS).map(([id, i]) => ({ id, stars: i.stars, title: i.title, desc: i.desc })) });

    case 'lots': {
      const tier = Number.isInteger(a.tier) ? a.tier : -1;
      const q = '%' + String(a.q || '').trim().slice(0, 30).replace(/[%_]/g, '') + '%';
      const order = a.sort === 'cheap' ? 'price ASC' : a.sort === 'exp' ? 'price DESC' : 'id DESC';
      const rows = (await DB.prepare(`SELECT id,seller,seller_name n,car_name c,tier t,value v,price p FROM lots WHERE (?1<0 OR tier=?1) AND car_name LIKE ?2 ORDER BY ${order} LIMIT 40`).bind(tier, q).all()).results;
      return json({ ok: true, lots: rows.map((r) => ({ id: r.id, n: r.n, c: r.c, t: r.t, v: r.v, p: r.p, mine: r.seller === uid })) });
    }

    case 'mylots': {
      const rows = (await DB.prepare('SELECT id,car_name c,tier t,value v,price p FROM lots WHERE seller=? ORDER BY id DESC').bind(uid).all()).results;
      return json({ ok: true, lots: rows });
    }

    case 'deals': {
      const rows = (await DB.prepare('SELECT car_name c,tier t,price p,fee,buyer,ts FROM deals WHERE buyer=?1 OR seller=?1 ORDER BY id DESC LIMIT 30').bind(uid).all()).results;
      return json({ ok: true, deals: rows.map((r) => ({ c: r.c, t: r.t, p: r.p, fee: r.fee, ts: r.ts, role: r.buyer === uid ? 'buy' : 'sell' })) });
    }

    case 'list': {
      const carId = a.carId | 0, price = Math.trunc(Number(a.price));
      const cnt = (await DB.prepare('SELECT COUNT(*) c FROM lots WHERE seller=?').bind(uid).first()).c;
      if (cnt >= LOT_MAX) return err('lots', `Не больше ${LOT_MAX} лотов одновременно`);
      const car = await DB.prepare('SELECT id,name,tier,value FROM cars WHERE id=? AND uid=?').bind(carId, uid).first();
      if (!car) return err('nocar', 'Машина не найдена');
      const min = Math.ceil(car.value * PMIN), max = car.value * PMAX;
      if (!(price >= min && price <= max)) return err('price', `Цена должна быть от ${min} до ${max} ₽`);
      const del = await DB.prepare('DELETE FROM cars WHERE id=? AND uid=? RETURNING id').bind(carId, uid).all();
      if (!del.results.length) return err('nocar', 'Машина не найдена');
      await DB.prepare('INSERT INTO lots(seller,seller_name,car_name,tier,value,price,ts) VALUES(?,?,?,?,?,?,?)').bind(uid, u.name || 'Игрок', car.name, car.tier, car.value, price, Date.now()).run();
      return json(await st());
    }

    case 'buy': {
      const id = a.id | 0;
      const lot = await DB.prepare('SELECT * FROM lots WHERE id=?').bind(id).first();
      if (!lot) return err('gone', 'Лот уже продан');
      if (lot.seller === uid) return err('own', 'Это твой лот');
      const cnt = (await DB.prepare('SELECT COUNT(*) c FROM cars WHERE uid=?').bind(uid).first()).c;
      if (cnt >= GARAGE_CAP) return err('full', `Гараж полон (${GARAGE_CAP}). Продай машины.`);
      const pay = await DB.prepare('UPDATE users SET bal=bal-?1 WHERE id=?2 AND bal>=?1').bind(lot.price, uid).run();
      if (!pay.meta.changes) return err('funds', 'Не хватает денег');
      const claim = await DB.prepare('DELETE FROM lots WHERE id=? RETURNING seller,car_name,tier,value,price').bind(id).all();
      if (!claim.results.length) {
        await DB.prepare('UPDATE users SET bal=bal+? WHERE id=?').bind(lot.price, uid).run(); // кто-то успел раньше: возврат
        return err('gone', 'Лот уже продан');
      }
      const L = claim.results[0], fee = Math.floor(L.price * FEE);
      await DB.batch([
        DB.prepare('UPDATE users SET bal=bal+? WHERE id=?').bind(L.price - fee, L.seller),
        DB.prepare('INSERT INTO cars(uid,name,tier,value) VALUES(?,?,?,?)').bind(uid, L.car_name, L.tier, L.value),
        DB.prepare('INSERT INTO deals(buyer,seller,car_name,tier,price,fee,ts) VALUES(?,?,?,?,?,?,?)').bind(uid, L.seller, L.car_name, L.tier, L.price, fee, Date.now()),
      ]);
      await payRef(DB, L.seller, L.price - fee);
      return json({ ...(await st()), bought: L.car_name });
    }

    case 'cancel': {
      const r = await DB.prepare('DELETE FROM lots WHERE id=? AND seller=? RETURNING car_name,tier,value').bind(a.id | 0, uid).all();
      if (!r.results.length) return err('gone', 'Лот не найден');
      const L = r.results[0];
      await DB.prepare('INSERT INTO cars(uid,name,tier,value) VALUES(?,?,?,?)').bind(uid, L.car_name, L.tier, L.value).run();
      return json(await st());
    }

    // апгрейдер: ставка машины, множитель ×2/×5/×10; при победе машина дороже, при провале сгорает
    case 'upgrade': {
      const carId = a.carId | 0, mode = UPG.find((x) => x.m === Number(a.m));
      if (!mode) return err('bad');
      const car = await DB.prepare('SELECT id,name,tier,value FROM cars WHERE id=? AND uid=?').bind(carId, uid).first();
      if (!car) return err('nocar', 'Машина не найдена');
      const cnt = (await DB.prepare('SELECT COUNT(*) c FROM cars WHERE uid=?').bind(uid).first()).c;
      if (cnt >= GARAGE_CAP) return err('full', `Гараж полон (${GARAGE_CAP}). Продай машины.`);
      const del = await DB.prepare('DELETE FROM cars WHERE id=? AND uid=? RETURNING id').bind(carId, uid).all();
      if (!del.results.length) return err('nocar', 'Машина не найдена');
      const win = (crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296) * 100 < mode.c;
      try {
        const dk = dayKey();
        for (const key of ['up1','up2']) {
          const qr = await env.DB.prepare('SELECT done,claimed FROM quests WHERE uid=? AND key=? AND day=?').bind(uid, key, dk).first();
          if (qr && !qr.claimed) {
            const nd = Math.min(2, (qr.done || 0) + 1);
            await env.DB.prepare('UPDATE quests SET done=? WHERE uid=? AND key=? AND day=?').bind(nd, uid, key, dk).run();
          }
        }
      } catch(e) {}
      if (!win) return json({ ...(await st()), up: { win: false, v: car.value } });
      const nv = car.value * mode.m, nt = tierFor(nv), cs = CARS[nt], c = cs[wpick(cs.map((x) => x[2]))];
      const ins = await DB.prepare('INSERT INTO cars(uid,name,tier,value) VALUES(?,?,?,?)').bind(uid, c[0], nt, nv).run();
      await DB.prepare('UPDATE users SET best=MAX(best,?) WHERE id=?').bind(nv, uid).run();
      return json({ ...(await st()), up: { win: true, id: ins.meta.last_row_id, n: c[0], t: nt, v: nv } });
    }

    case 'friends': {
      const rows = (await DB.prepare('SELECT r.uid,r.earned,u.name,u.opened FROM refs r JOIN users u ON u.id=r.uid WHERE r.ref=? ORDER BY r.earned DESC, r.ts DESC LIMIT 100').bind(uid).all()).results;
      const uu = await DB.prepare('SELECT refearned,refbonus FROM users WHERE id=?').bind(uid).first();
      const bonus = uu.refbonus || 0;
      const active = rows.filter((r) => r.opened >= REF_MIN_OPENS).length;
      return json({
        ok: true, id: uid, bot: await botName(env),
        count: rows.length, active, earned: uu.refearned || 0,
        pct: Math.round(REF_PCT * 100), min: REF_MIN_OPENS,
        list: rows.map((r) => ({ n: r.name || 'Игрок', opened: r.opened, earned: r.earned, lvl: 1 + Math.floor(r.opened / 10) })),
        ms: REF_MS.map((m, i) => ({ i, need: m.need, label: m.label, ok: active >= m.need, claimed: !!(bonus & (1 << i)) })),
      });
    }

    case 'refclaim': {
      const i = a.i | 0, m = REF_MS[i];
      if (!m) return err('bad');
      const active = (await DB.prepare('SELECT COUNT(*) c FROM refs r JOIN users u ON u.id=r.uid WHERE r.ref=? AND u.opened>=?').bind(uid, REF_MIN_OPENS).first()).c;
      if (active < m.need) return err('need', `Нужно активных друзей: ${m.need}`);
      const upd = await DB.prepare('UPDATE users SET refbonus=COALESCE(refbonus,0)+? WHERE id=? AND (COALESCE(refbonus,0) & ?)=0').bind(1 << i, uid, 1 << i).run();
      if (!upd.meta.changes) return err('taken', 'Уже получено');
      if (m.kind === 'rub') await DB.prepare('UPDATE users SET bal=bal+? WHERE id=?').bind(m.amount, uid).run();
      else await DB.prepare('UPDATE users SET luck=?,luck_until=MAX(luck_until,?)+? WHERE id=?').bind(m.mult, Date.now(), m.hours * 3600000, uid).run();
      return json({ ...(await st()), gain: m.kind === 'rub' ? m.amount : 0, label: m.label });
    }

    case 'news': {
      const rows = (await DB.prepare('SELECT id,title,body,ts FROM news ORDER BY id DESC LIMIT 20').all()).results;
      return json({ ok: true, news: rows });
    }

    case 'quests': {
      const dk = dayKey();
      const qs = pickQs();
      const out = [];
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i];
        await env.DB.prepare('INSERT OR IGNORE INTO quests(uid,key,done,claimed,day) VALUES(?,?,?,?,?)').bind(uid, q.id, 0, 0, dk).run();
        const row = await env.DB.prepare('SELECT done,claimed FROM quests WHERE uid=? AND key=? AND day=?').bind(uid, q.id, dk).first();
        out.push({ id: q.id, txt: q.txt, need: q.need, done: Math.min(q.need, (row && row.done) || 0), claimed: (row && row.claimed) ? 1 : 0, rub: q.rub });
      }
      return json({ ok: true, quests: out });
    }
    case 'qclaim': {
      const dk = dayKey();
      const q = QLIST.find((x) => x.id === a.q);
      if (!q) return err('bad');
      const row = await env.DB.prepare('SELECT done,claimed FROM quests WHERE uid=? AND key=? AND day=?').bind(uid, q.id, dk).first();
      if (!row || (row.done || 0) < q.need) return err('no', 'Не выполнено');
      if (row.claimed) return err('done', 'Уже получено');
      await env.DB.batch([
        env.DB.prepare('UPDATE quests SET claimed=1 WHERE uid=? AND key=? AND day=?').bind(uid, q.id, dk),
        env.DB.prepare('UPDATE users SET bal=bal+? WHERE id=?').bind(q.rub, uid),
      ]);
      return json({ ...(await st()), gain: q.rub });
    }

    case 'adm': {
      if (!isAdmin) return err('no', 'Нет доступа');
      const t = Number(a.target);
      switch (a.op) {
        case 'bal': await DB.prepare('UPDATE users SET bal=MAX(0,bal+?) WHERE id=?').bind(Math.trunc(Number(a.amount)) || 0, t).run(); break;
        case 'luck': await DB.prepare('UPDATE users SET luck=?,luck_until=? WHERE id=?').bind(Number(a.mult) || 1, Date.now() + (Number(a.hours) || 1) * 3600000, t).run(); break;
        case 'news_add': {
          const title = String(a.title || '').trim().slice(0, 80), body = String(a.body || '').trim().slice(0, 1000);
          if (!title) return err('bad', 'Введи заголовок');
          await DB.prepare('INSERT INTO news(title,body,ts) VALUES(?,?,?)').bind(title, body, Date.now()).run();
          break;
        }
        case 'news_del': await DB.prepare('DELETE FROM news WHERE id=?').bind(Number(a.id) || 0).run(); break;
        case 'ban': await DB.prepare('UPDATE users SET banned=? WHERE id=?').bind(a.on ? 1 : 0, t).run(); break;
        case 'promo': {
          const code = String(a.code || '').trim().toUpperCase().slice(0, 32);
          if (!code) return err('bad', 'Введи код');
          const num = (x) => Number(String(x ?? '').replace(',', '.')) || 0;
          await DB.prepare('INSERT OR REPLACE INTO promos(code,amount,uses,luck,hours) VALUES(?,?,?,?,?)')
            .bind(code, Math.trunc(num(a.amount)), Math.trunc(num(a.uses)) || 1, Math.max(1, num(a.luck)), Math.max(0, num(a.hours))).run();
          break;
        }
        case 'stats': {
          const s = await DB.prepare('SELECT COUNT(*) n,COALESCE(SUM(bal),0) money,COALESCE(SUM(opened),0) opened FROM users').first();
          return json({ ok: true, stats: s });
        }
        default: return err('bad');
      }
      return json({ ok: true, m: 'Готово' });
    }
  }
  return err('bad');
}

// ---------- вебхук Telegram (оплата звёздами и /start) ----------
async function webhook(req, env) {
  if (req.headers.get('x-telegram-bot-api-secret-token') !== env.WEBHOOK_SECRET) return new Response('no', { status: 403 });
  const up = await req.json();
  if (up.pre_checkout_query) {
    const q = up.pre_checkout_query, it = ITEMS[q.invoice_payload];
    await tg(env, 'answerPreCheckoutQuery', it ? { pre_checkout_query_id: q.id, ok: true } : { pre_checkout_query_id: q.id, ok: false, error_message: 'Товар недоступен' });
    return new Response('ok');
  }
  const m = up.message;
  if (!m) return new Response('ok');
  if (m.successful_payment) {
    const sp = m.successful_payment, it = ITEMS[sp.invoice_payload], uid = m.from.id;
    if (it && sp.total_amount === it.stars) {
      await ensure(env.DB, m.from, '');
      const dup = await env.DB.prepare('INSERT OR IGNORE INTO pays(id) VALUES(?)').bind(sp.telegram_payment_charge_id).run();
      if (dup.meta.changes) {
        await credit(env.DB, uid, it);
        await tg(env, 'sendMessage', { chat_id: uid, text: `✅ Покупка получена: ${it.title}` });
      }
    }
  } else if (m.text && m.text.startsWith('/') && m.from) {
    const [cmd, payload = ''] = m.text.trim().split(/\s+/);
    await ensure(env.DB, m.from, cmd === '/start' ? payload : '');
    const bot = await botName(env), link = refLink(bot, m.from.id);
    const share = link
      ? `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Залетай в Автокейс — крутим кейсы с тачками!')}`
      : GAME_URL;
    const kb = { inline_keyboard: [[{ text: '🎮 Играть', web_app: { url: GAME_URL } }], [{ text: '👥 Позвать друга', url: share }]] };
    if (cmd === '/invite') {
      await tg(env, 'sendMessage', {
        chat_id: m.chat.id, parse_mode: 'HTML', disable_web_page_preview: true,
        text: `👥 <b>Твоя ссылка</b>\n\n<code>${link || GAME_URL}</code>\n\nЗа друга: <b>+${REF_FRIEND_BONUS.toLocaleString('ru-RU')} ₽</b> ему и <b>${Math.round(REF_PCT * 100)}%</b> с его продаж — тебе. Награды за 1, 3, 5 и 10 активных друзей.`,
        reply_markup: { inline_keyboard: [[{ text: '📤 Поделиться ссылкой', url: share }], [{ text: '🎮 Играть', web_app: { url: GAME_URL } }]] },
      });
    } else if (cmd === '/help') {
      await tg(env, 'sendMessage', { chat_id: m.chat.id, parse_mode: 'HTML', text: HELP, reply_markup: kb });
    } else if (cmd === '/start') {
      await tg(env, 'sendMessage', {
        chat_id: m.chat.id, parse_mode: 'HTML',
        text: `🎮 <b>Автокейс</b>\n\nОткрывай кейсы, выбивай тачки — от ВАЗ-2105 до Bugatti Chiron — и продавай их за ₽.\n\n• 6 редкостей, 41 машина\n• Рынок между игроками\n• Удача, промокоды, ежедневный бонус\n• ${Math.round(REF_PCT * 100)}% с продаж друзей\n\nЖми «Играть» 👇`,
        reply_markup: kb,
      });
    }
  }
  return new Response('ok');
}

// создать игрока + привязать пригласившего (?startapp=ref_ID или /start ref_ID)
async function ensure(DB, u, startParam) {
  const created = await DB.prepare('INSERT OR IGNORE INTO users(id,name,bal,created) VALUES(?,?,?,?)').bind(u.id, u.first_name || 'Игрок', START, Date.now()).run();
  const ref = Number((/^ref_(\d+)$/.exec(String(startParam || '')) || [])[1] || 0);
  if (!(ref && ref !== u.id)) return;
  const hasRef = await DB.prepare('SELECT uid FROM refs WHERE uid=?').bind(u.id).first();
  if (hasRef) return;
  const inv = await DB.prepare('SELECT id FROM users WHERE id=?').bind(ref).first();
  if (!inv) return;
  await DB.prepare('INSERT OR IGNORE INTO refs(uid,ref,ts) VALUES(?,?,?)').bind(u.id, ref, Date.now()).run();
  // бонус за друга по ссылке — только новому игроку
  if (created.meta.changes) {
    await DB.prepare('UPDATE users SET bal=bal+? WHERE id=?').bind(REF_FRIEND_BONUS, u.id).run();
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    try {
      await schema(env.DB);
      if (url.pathname === '/tg' && req.method === 'POST') return await webhook(req, env);
      if (url.pathname === '/setup') {
        if (url.searchParams.get('k') !== env.WEBHOOK_SECRET) return new Response('no', { status: 403 });
        const r = await tg(env, 'setWebhook', { url: url.origin + '/tg', secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message', 'pre_checkout_query'], drop_pending_updates: true });
        // оформление бота: кнопка «Играть» у поля ввода, описание, команды
        await tg(env, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'Играть', web_app: { url: GAME_URL } } });
        await tg(env, 'setMyCommands', { commands: [
          { command: 'start', description: 'Играть в Автокейс' },
          { command: 'invite', description: 'Пригласить друга' },
          { command: 'help', description: 'Как играть' },
        ] });
        await tg(env, 'setMyShortDescription', { short_description: 'Кейсы с тачками: открывай, выбивай, продавай.' });
        await tg(env, 'setMyDescription', { description: 'Автокейс — мини-игра с кейсами. Открывай кейсы, выбивай машины от ВАЗ-2105 до Bugatti Chiron, собирай гараж, торгуй на рынке и приглашай друзей за процент с их продаж.' });
        return json(r);
      }
      if (url.pathname === '/api' && req.method === 'POST') {
        const sess = await auth(req.headers.get('x-init'), env.BOT_TOKEN);
        if (!sess) return json({ ok: false, e: 'auth', m: 'Открой игру через бота в Telegram' }, 401);
        const user = sess.u;
        await ensure(env.DB, user, sess.sp);
        const u = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(user.id).first();
        if (u.banned) return err('banned', 'Аккаунт заблокирован');
        return await handle(await req.json(), user.id, u, env);
      }
      return json({ ok: true, name: 'autocase', features: ['news', 'market', 'luck', 'promo', 'friends', 'admin', 'upgrade'], cases: CASES.length, upg: UPG });
    } catch (e) {
      return json({ ok: false, e: 'server', m: String((e && e.message) || e) }, 500);
    }
  },
};
