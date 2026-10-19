// Mămăligă Tycoon — idle clicker, vanilla JS, salvare în localStorage

const SAVE_KEY = "mamaliga-tycoon-save";

const UPGRADES = [
  { id: "facalet",  name: "Făcăleț de lemn",   desc: "+1 mămăligă / click",   baseCost: 15,     click: 1,  mps: 0 },
  { id: "bunica",   name: "Bunica",            desc: "+1 mămăligă / sec",     baseCost: 50,     click: 0,  mps: 1 },
  { id: "ceaun",    name: "Ceaun mai mare",    desc: "+5 / click",            baseCost: 250,    click: 5,  mps: 0 },
  { id: "branza",   name: "Brânză de oi",      desc: "+8 / sec",              baseCost: 600,    click: 0,  mps: 8 },
  { id: "mujdei",   name: "Fabrică de mujdei", desc: "+40 / sec",             baseCost: 3000,   click: 0,  mps: 40 },
  { id: "nunta",    name: "Nuntă la Orhei",    desc: "+200 / sec",            baseCost: 20000,  click: 0,  mps: 200 },
  { id: "export",   name: "Export în UE",      desc: "+1000 / sec",           baseCost: 150000, click: 0,  mps: 1000 },
];

const ACHIEVEMENTS = [
  { id: "first",   name: "Prima mămăligă",           test: s => s.total >= 1 },
  { id: "hundred", name: "O sută de porții",         test: s => s.total >= 100 },
  { id: "bunici",  name: "Consiliul bunicilor (5)",  test: s => (s.owned.bunica || 0) >= 5 },
  { id: "k10",     name: "10.000 — ești faimos în sat", test: s => s.total >= 10000 },
  { id: "export",  name: "Brand european",           test: s => (s.owned.export || 0) >= 1 },
  { id: "million", name: "Milionar de mămăligă",     test: s => s.total >= 1_000_000 },
];

const EVENTS = [
  { text: "🧓 A venit vecinul „doar la o gustare”. Ai pierdut 10%.", apply: s => { s.count *= 0.9; } },
  { text: "🎉 Hram în sat! Primești 30 de secunde de producție bonus.", apply: s => { s.count += getMps(s) * 30; } },
  { text: "🐄 Vaca a dat lapte extra — +50 mămăligi.", apply: s => { s.count += 50; } },
  { text: "🔥 S-a stins focul... nimic nu se întâmplă, dar ți-a fost frică.", apply: () => {} },
];

let state = load();

function freshState() {
  return { count: 0, total: 0, owned: {}, achieved: [] };
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { ...freshState(), ...JSON.parse(raw) };
  } catch (e) { /* storage indisponibil — pornim de la zero */ }
  return freshState();
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* ignorăm */ }
}

function cost(upg, s = state) {
  const n = s.owned[upg.id] || 0;
  return Math.floor(upg.baseCost * Math.pow(1.15, n));
}

function getMpc(s = state) {
  return 1 + UPGRADES.reduce((sum, u) => sum + u.click * (s.owned[u.id] || 0), 0);
}

function getMps(s = state) {
  return UPGRADES.reduce((sum, u) => sum + u.mps * (s.owned[u.id] || 0), 0);
}

function fmt(n) {
  n = Math.floor(n);
  if (n >= 1e6) return (n / 1e6).toFixed(2) + " mil";
  if (n >= 1e4) return (n / 1e3).toFixed(1) + "k";
  return n.toLocaleString("ro-RO");
}

function gain(amount) {
  state.count += amount;
  state.total += amount;
}

function buy(id) {
  const upg = UPGRADES.find(u => u.id === id);
  const price = cost(upg);
  if (state.count < price) return;
  state.count -= price;
  state.owned[id] = (state.owned[id] || 0) + 1;
  renderShop();
  save();
}

function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (!state.achieved.includes(a.id) && a.test(state)) {
      state.achieved.push(a.id);
      toast(`🏆 Realizare: ${a.name}`);
      renderAchievements();
    }
  }
}

function randomEvent() {
  if (state.total < 50) return;
  const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  ev.apply(state);
  const box = document.getElementById("event");
  box.textContent = ev.text;
  box.classList.remove("hidden");
  setTimeout(() => box.classList.add("hidden"), 6000);
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.add("hidden"), 2500);
}

function floater(x, y, text) {
  const el = document.createElement("div");
  el.className = "floater";
  el.textContent = text;
  el.style.left = x + "px";
  el.style.top = y + "px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

// ---------- randare ----------

function renderStats() {
  document.getElementById("count").textContent = fmt(state.count);
  document.getElementById("mps").textContent = fmt(getMps());
  document.getElementById("mpc").textContent = fmt(getMpc());
}

function renderShop() {
  const ul = document.getElementById("shop");
  ul.innerHTML = "";
  for (const u of UPGRADES) {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div>
        <div class="name">${u.name} <small>(${state.owned[u.id] || 0})</small></div>
        <div class="desc">${u.desc}</div>
      </div>
      <button data-id="${u.id}">${fmt(cost(u))} 🌽</button>`;
    ul.appendChild(li);
  }
  updateShopButtons();
}

function updateShopButtons() {
  document.querySelectorAll("#shop button").forEach(btn => {
    const upg = UPGRADES.find(u => u.id === btn.dataset.id);
    btn.disabled = state.count < cost(upg);
  });
}

function renderAchievements() {
  const ul = document.getElementById("achievements");
  ul.innerHTML = "";
  for (const a of ACHIEVEMENTS) {
    const done = state.achieved.includes(a.id);
    const li = document.createElement("li");
    li.className = "ach" + (done ? " done" : "");
    li.textContent = (done ? "🏆 " : "🔒 ") + a.name;
    ul.appendChild(li);
  }
}

// ---------- evenimente UI ----------

document.getElementById("ceaun").addEventListener("click", e => {
  const amount = getMpc();
  gain(amount);
  floater(e.clientX, e.clientY, "+" + fmt(amount));
  renderStats();
  updateShopButtons();
  checkAchievements();
});

document.getElementById("shop").addEventListener("click", e => {
  if (e.target.matches("button[data-id]")) buy(e.target.dataset.id);
});

document.getElementById("reset").addEventListener("click", () => {
  if (!confirm("Sigur vrei să arunci toată mămăliga?")) return;
  state = freshState();
  save();
  renderShop();
  renderAchievements();
  renderStats();
});

// ---------- bucla de joc ----------

const TICK_MS = 100;
setInterval(() => {
  gain(getMps() * TICK_MS / 1000);
  renderStats();
  updateShopButtons();
  checkAchievements();
}, TICK_MS);

setInterval(save, 5000);
setInterval(() => { if (Math.random() < 0.5) randomEvent(); }, 45000);

renderShop();
renderAchievements();
renderStats();
