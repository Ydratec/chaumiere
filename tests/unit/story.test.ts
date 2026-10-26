import assert from "node:assert/strict";
import { test } from "node:test";
import { BUILDINGS, ITEMS, type ItemId } from "../../src/modules/farm/catalog.ts";
import { maxOf, placeError, sellPrice, duration, recipeOf, type Tile } from "../../src/modules/farm/rules.ts";
import { catchUp, NEUTRAL } from "../../src/modules/farm/story/catchup.ts";
import { ch1, DAILY, NPCS } from "../../src/modules/farm/story/ch1.ts";
import { activeEvents, eventKeys, EVENTS } from "../../src/modules/farm/story/events.ts";
import { dailyOrders, producible } from "../../src/modules/farm/story/orders.ts";
import { SECRETS } from "../../src/modules/farm/story/secrets.ts";
import { activeProjects } from "../../src/modules/farm/projects.ts";
import { chapterDate, chapterDay, currentQuest, goalMet, goalProgress, nextAct, openAct, parisInstant, personalUnlocks, scaled, upcomingQuest } from "../../src/modules/farm/story/state.ts";

const tile = (kind: string): Tile => ({ x: 0, y: 0, kind, item: null, started_at: null, ready_at: null });

test("histoire : quêtes bien formées (identifiants uniques, actes connus, dialogues, objets valides)", () => {
  const ids = ch1.quests.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ch1.quests.every((q, i) => i === 0 || q.act >= ch1.quests[i - 1].act), "les actes se suivent dans l'ordre");
  for (const q of ch1.quests) {
    assert.ok(ch1.acts.some((a) => a.n === q.act), q.id);
    assert.ok(q.intro.length > 0 && q.outro.length > 0 && q.page.text.length > 20, q.id);
    if (q.goal.kind === "deliver") for (const k of Object.keys(q.goal.items)) assert.ok(k in ITEMS, `${q.id}: ${k}`);
    if (q.goal.kind === "own") assert.ok(q.goal.building in BUILDINGS, q.id);
    for (const u of q.reward.unlocks ?? []) assert.match(u, /^(b:(coop|oven)|cap:[a-z]+:\d+)$/, `${q.id}: ${u}`);
  }
  assert.ok(DAILY.length >= 4 && SECRETS.length > 0 && EVENTS.length > 0);
});

test("histoire : on peut toujours finir la quête suivante avec ce que les précédentes ont débloqué", () => {
  let done: string[] = [];
  for (const q of ch1.quests) {
    const unlocks = personalUnlocks(ch1, done);
    if (q.goal.kind === "own") {
      const b = BUILDINGS[q.goal.building];
      assert.ok(!b.requires || unlocks.includes(b.requires), `${q.id} : ${q.goal.building} pas encore débloqué`);
      assert.ok((maxOf(q.goal.building, unlocks) ?? 99) >= q.goal.n, `${q.id} : plafond trop bas`);
    }
    if (q.goal.kind === "deliver") {
      for (const k of Object.keys(q.goal.items)) {
        const producers = Object.values(BUILDINGS).filter((b) => b.recipes.some((r) => r.out === k) && (!b.requires || unlocks.includes(b.requires)));
        assert.ok(producers.length > 0 || k === "coins", `${q.id} : ${k} impossible à produire`);
      }
    }
    if (q.goal.kind === "harvest") {
      const out = q.goal.item;
      assert.ok(Object.entries(BUILDINGS).some(([, b]) => b.recipes.some((r) => r.out === out) && (!b.requires || unlocks.includes(b.requires))), `${q.id} : ${out} impossible à produire`);
    }
    done = [...done, q.id];
  }
});

test("calendrier : jour du chapitre, actes qui sortent, quête en cours, prochain épisode", () => {
  const start = Date.parse("2026-01-01T10:00:00Z");
  const day = (n: number) => chapterDay(new Date(start).toISOString(), start + (n - 1) * 86_400_000 + 3_600_000);
  assert.equal(chapterDay(new Date(start + 86_400_000).toISOString(), start), 0, "avant le début : jour 0");
  assert.equal(currentQuest(ch1, [], 0), null);
  assert.equal(nextAct(ch1, 0)?.n, 1, "on annonce le premier épisode");
  assert.equal(day(1), 1);
  assert.equal(day(8), 8);
  assert.equal(openAct(ch1, 1), 1);
  assert.equal(openAct(ch1, 7), 1);
  assert.equal(openAct(ch1, 8), 2);
  assert.equal(currentQuest(ch1, [], 1)?.id, "semis");
  // toutes les quêtes de l'acte 1 faites, l'acte 2 pas encore sorti : rien en cours, et on annonce la suite
  const act1 = ch1.quests.filter((q) => q.act === 1).map((q) => q.id);
  assert.equal(currentQuest(ch1, act1, 3), null);
  assert.equal(nextAct(ch1, 3)?.n, 2);
  assert.equal(currentQuest(ch1, act1, 8)?.act, 2);
  const all = ch1.quests.map((q) => q.id);
  assert.equal(currentQuest(ch1, all, 30), null);
});

test("déblocages personnels : joueurs d'avant l'histoire, plafonds qui montent", () => {
  assert.deepEqual(personalUnlocks(ch1, ["legacy"]).sort(), ["b:coop", "b:oven"]);
  const u = personalUnlocks(ch1, ["pain", "four"]);
  assert.ok(u.includes("b:oven") && u.includes("cap:planter:7") && !u.includes("b:coop"));
  assert.equal(maxOf("planter", []), 5);
  assert.equal(maxOf("planter", ["cap:planter:4", "cap:planter:8"]), 8);
  const cinq = [0, 1, 2, 3, 4].map((i) => ({ ...tile("planter"), x: i * 2 }));
  assert.match(placeError(cinq, { coins: 100 }, "planter", 0, 4)!, /Tu en as déjà 5/);
  assert.equal(placeError(cinq, { coins: 100 }, "planter", 0, 4, ["cap:planter:7"]), null);
  // un joueur qui avait déjà plus que le plafond garde ses objets (seul le fait d'en construire est bloqué)
  const six = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ ...tile("pot"), x: i, y: 5 }));
  assert.match(placeError(six, { coins: 100 }, "pot", 0, 8)!, /Tu en as déjà/);
  assert.equal(placeError(six, { coins: 100 }, "pot", 0, 5, [], six[0]), null);
});

test("buts de quête : livrer, construire, récolter", () => {
  const deliver = ch1.quests.find((q) => q.id === "soupe")!;
  assert.ok(!goalMet(goalProgress(deliver.goal, { carrot: 6, flower: 3 }, [], {})));
  assert.ok(goalMet(goalProgress(deliver.goal, { carrot: 6, flower: 4 }, [], {})));
  // rattrapage : moins à livrer pour ceux en retard, plus pour ceux en avance
  assert.deepEqual(scaled({ carrot: 6, flower: 4 }, 0.75), { carrot: 5, flower: 3 });
  assert.deepEqual(scaled({ carrot: 6, flower: 4 }, 1.5), { carrot: 9, flower: 6 });
  assert.equal(scaled({ egg: 1 }, 0.5).egg, 1, "jamais moins de 1");
  assert.ok(goalMet(goalProgress({ kind: "own", building: "oven", n: 1 }, {}, [tile("oven")], {})));
  assert.ok(!goalMet(goalProgress({ kind: "own", building: "oven", n: 1 }, {}, [], {})));
  assert.ok(goalMet(goalProgress({ kind: "harvest", item: "wheat", n: 6 }, {}, [], { "harvest:wheat": 8 })));
});

test("rattrapage : neutre sans comparaison, progressif, plafonné, et personne n'est jamais bloqué", () => {
  assert.deepEqual(catchUp(5, []), NEUTRAL); // seul, ou les autres sont inactifs
  assert.deepEqual({ ...catchUp(5, [5, 6, 4]), gap: 0 }, { ...NEUTRAL, gap: 0 });
  const retard = catchUp(0, [4, 5, 6]);
  assert.ok(retard.speed < 1 && retard.reward > 1 && retard.cost < 1);
  const beaucoup = catchUp(0, [20, 20]);
  assert.ok(beaucoup.speed >= 0.75 && beaucoup.reward <= 1.3 && beaucoup.cost >= 0.75, "aide plafonnée");
  assert.ok(catchUp(0, [4]).speed > beaucoup.speed, "l'aide grandit avec l'écart");
  const avance = catchUp(20, [0, 0, 1]);
  assert.ok(avance.speed === 1 && avance.cost > 1 && avance.cost <= 1.5 && avance.reward >= 0.8, "freinage doux, plafonné");
  // le plus avancé finit toujours : quantités à livrer au plus ×1,5
  assert.ok((scaled({ cake: 2 }, avance.cost).cake ?? 99) <= 3);
});

test("événements : seulement pendant leur durée, coefficients appliqués aux prix et aux durées", () => {
  assert.deepEqual(activeEvents(1).map((e) => e.id), []);
  assert.deepEqual(activeEvents(3).map((e) => e.id), ["marche"]);
  assert.deepEqual(activeEvents(5).map((e) => e.id), ["visite"]);
  assert.deepEqual(eventKeys(3), ["sell:1.25"]);
  assert.equal(sellPrice("carrot", []), 3);
  assert.equal(sellPrice("strawberry", ["sell:1.25"]), 15);
  const r = recipeOf("planter", "wheat")!;
  assert.equal(duration(r, ["speed:0.8"]), 96_000);
  assert.equal(duration(r, ["upgrade:speed", "speed:0.8"]), 72_000);
});

test("commandes : trois par jour, stables, limitées à ce qu'on peut produire", () => {
  const debut = producible([]);
  assert.ok(!debut.includes("egg") && !debut.includes("bread"));
  assert.ok(producible(["b:coop", "b:oven"]).includes("cake"));
  const a = dailyOrders("u1", "2026-03-04", debut);
  assert.deepEqual(a, dailyOrders("u1", "2026-03-04", debut));
  assert.notDeepEqual(a, dailyOrders("u1", "2026-03-05", debut));
  assert.equal(a.length, 3);
  assert.deepEqual(a.map((o) => o.slot), [0, 1, 2]);
  for (const o of a) {
    const ks = Object.keys(o.wants) as ItemId[];
    assert.ok(ks.length >= 1 && ks.every((k) => debut.includes(k)));
    assert.ok(o.reward >= 5);
  }
  // une commande paie mieux que de vendre en vrac
  for (let d = 1; d < 30; d++)
    for (const o of dailyOrders("u2", `2026-04-${String(d).padStart(2, "0")}`, producible(["b:coop", "b:oven"]))) {
      const vente = Object.entries(o.wants).reduce((n, [k, v]) => n + ITEMS[k as ItemId].price * (v ?? 0), 0);
      assert.ok(o.reward >= vente, `${JSON.stringify(o)} paie moins que la vente (${vente})`);
    }
});

test("quêtes datées : sortie à l'heure de Paris (été comme hiver), une à la fois", () => {
  assert.equal(new Date(parisInstant("2026-10-24", 10)).toISOString(), "2026-10-24T08:00:00.000Z", "heure d'été");
  assert.equal(new Date(parisInstant("2026-10-27", 10)).toISOString(), "2026-10-27T09:00:00.000Z", "heure d'hiver");
  const start = "2026-10-08T22:00:00+00:00"; // minuit à Paris, le 9 octobre
  assert.equal(chapterDate(start, 1), "2026-10-09");
  assert.equal(chapterDate(start, 19), "2026-10-27");
  const before3 = ch1.quests.filter((q) => q.act < 3).map((q) => q.id);
  const at = (iso: string) => ({ startedAt: start, now: Date.parse(iso) });
  const dayOf = (iso: string) => chapterDay(start, Date.parse(iso));
  assert.equal(currentQuest(ch1, before3, dayOf("2026-10-27T08:59:00Z"), at("2026-10-27T08:59:00Z")), null, "pas avant 10 h");
  assert.equal(upcomingQuest(ch1, before3, dayOf("2026-10-27T08:59:00Z"), at("2026-10-27T08:59:00Z"))?.quest.id, "facteur");
  assert.equal(currentQuest(ch1, before3, dayOf("2026-10-27T09:00:00Z"), at("2026-10-27T09:00:00Z"))?.id, "facteur");
  assert.equal(currentQuest(ch1, [...before3, "facteur"], dayOf("2026-10-27T20:00:00Z"), at("2026-10-27T20:00:00Z")), null, "la suivante attend demain");
  assert.equal(currentQuest(ch1, [...before3, "facteur"], dayOf("2026-10-28T09:30:00Z"), at("2026-10-28T09:30:00Z"))?.id, "cave");
});

test("acte 4 : la Fête des Brumes, du 30 octobre au 2 novembre à 10 h, et la fin du chapitre", () => {
  const start = "2026-10-08T22:00:00+00:00";
  const at = (iso: string) => ({ startedAt: start, now: Date.parse(iso) });
  const dayOf = (iso: string) => chapterDay(start, Date.parse(iso));
  const act4 = ch1.quests.filter((q) => q.act === 4);
  assert.deepEqual(act4.map((q) => q.id), ["citrouilles", "fete", "armand", "apres"]);
  assert.deepEqual(act4.map((q) => chapterDate(start, q.day!)), ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  const before4 = ch1.quests.filter((q) => q.act < 4).map((q) => q.id);
  assert.equal(currentQuest(ch1, before4, dayOf("2026-10-30T08:59:00Z"), at("2026-10-30T08:59:00Z")), null);
  assert.equal(currentQuest(ch1, before4, dayOf("2026-10-30T09:00:00Z"), at("2026-10-30T09:00:00Z"))?.id, "citrouilles");
  const all = ch1.quests.map((q) => q.id);
  assert.equal(currentQuest(ch1, all, dayOf("2026-11-03T12:00:00Z"), at("2026-11-03T12:00:00Z")), null, "chapitre fini");
  // les lanternes et les tartes se fabriquent
  const made = new Set(Object.values(BUILDINGS).flatMap((b) => b.recipes.map((r) => r.out)));
  for (const q of act4) if (q.goal.kind === "deliver") for (const k of Object.keys(q.goal.items)) assert.ok(made.has(k as ItemId) || k === "flower", `${q.id} : ${k}`);
});

test("projet « Toutes les fenêtres » : visible du 29 octobre 10 h à minuit le 31", () => {
  const ids = (iso: string) => activeProjects([], Date.parse(iso)).map((p) => p.key);
  assert.ok(!ids("2026-10-29T08:59:00Z").includes("event:lanterns"));
  assert.ok(ids("2026-10-29T09:00:00Z").includes("event:lanterns"));
  assert.ok(!ids("2026-10-31T23:00:00Z").includes("event:lanterns"));
});

test("scènes : personnages connus, répliques non vides, choix possibles", () => {
  for (const q of ch1.quests.filter((x) => x.scenes)) {
    for (const s of [...q.scenes!.intro, ...q.scenes!.outro]) {
      if ("who" in s && s.who !== "player") assert.ok(s.who in NPCS, `${q.id} : ${s.who}`);
      if (s.do === "say" || s.do === "narrate") assert.ok(s.text.trim().length > 0, q.id);
      if (s.do === "choice") assert.ok(s.options.length >= 2, `${q.id} : choix`);
    }
    // on ne fait parler que quelqu'un qui est entré en scène
    for (const part of [q.scenes!.intro, q.scenes!.outro]) {
      const here = new Set<string>();
      for (const s of part) {
        if (s.do === "enter") here.add(s.who);
        if (s.do === "leave") here.delete(s.who);
        if (s.do === "say" || s.do === "walk") assert.ok(here.has(s.who), `${q.id} : ${s.who} parle sans être entré`);
      }
    }
    assert.ok(q.intro.length > 0 && q.outro.length > 0, `${q.id} : texte tiré des scènes`);
  }
});
