'use strict';
const assert = require('assert');
const S = require('../solver.js');

const US = S.makeDeck(S.EDITIONS[0]);
const idx = (name) => US.CARDS.indexOf(name);
const mk = (n, me, myCards, events, extra) => {
  const faceUp = (extra && extra.faceUp) || [];
  const hands = S.defaultHands(n, US.N - 3 - faceUp.length);
  return Object.assign({
    players: hands.map((h, i) => ({ name: 'P' + i, hand: h })),
    me, myCards, events: events || [], faceUp,
  }, extra || {});
};

// 1. Only my hand known: nothing certain, my own cards can't be in the envelope.
{
  const r = S.analyse(mk(4, 0, [0, 1, 6, 7, 12]), { chains: 2, steps: 2000 });
  assert(r.ok && !r.solved);
  assert(!r.possible[0][r.nP], 'my own card cannot be in the envelope');
  assert(r.possible[2][r.nP]);
}

// 2. I suggest a triple where I hold two cards and all others answer none -> third is in the envelope.
{
  const [a, b, c] = [idx('Scarlett'), idx('Rope'), idx('Library')];
  const st = mk(4, 0, [a, b, 1, 7, 13], [{
    type: 'suggest', by: 0, cards: [a, b, c],
    responses: [{ p: 1, r: 'none' }, { p: 2, r: 'none' }, { p: 3, r: 'none' }],
  }]);
  const r = S.analyse(st, { chains: 2, steps: 2000 });
  assert(r.ok);
  assert.strictEqual(r.certain[c], r.nP, 'Library must be in the envelope');
}

// 2b. Legacy event shape (shownBy/shownCard) still works.
{
  const [a, b, c] = [idx('Scarlett'), idx('Rope'), idx('Library')];
  const st = mk(4, 0, [a, b, 1, 7, 13], [{ type: 'suggest', by: 0, cards: [a, b, c], shownBy: null, shownCard: null }]);
  const r = S.analyse(st, { chains: 0 });
  assert.strictEqual(r.certain[c], r.nP);
}

// 3. Contradiction is reported, not thrown.
{
  const st = mk(4, 0, [0, 1, 7, 13, 14], [{ type: 'suggest', by: 1, cards: [0, 6, 12], responses: [{ p: 0, r: 'none' }] }]);
  const r = S.analyse(st, { chains: 0 });
  assert(!r.ok && r.inconsistent);
}

// 4. Hand sizes must add up.
{
  const st = mk(4, 0, []);
  st.players[0].hand = 9;
  assert(!S.analyse(st, { chains: 0 }).ok);
}

// 5. A shown card the suggester saw is pinned to the shower; the player before them passed.
{
  const st = mk(3, 0, [0, 1, 6, 7, 12, 13], [{
    type: 'suggest', by: 0, cards: [2, 8, 14],
    responses: [{ p: 1, r: 'none' }, { p: 2, r: 'showed', card: 8 }],
  }]);
  const r = S.analyse(st, { chains: 0 });
  assert(r.ok);
  assert.strictEqual(r.certain[8], 2);
  assert(!r.possible[2][1] && !r.possible[8][1] && !r.possible[14][1]);
}

// 6. Wrong accusation removes a combination, not each card.
{
  const st = mk(3, 0, [0, 1, 6, 7, 12, 13], [{ type: 'accuse', by: 1, cards: [2, 8, 14], correct: false }]);
  const r = S.analyse(st, { chains: 0 });
  assert(r.ok && r.possible[2][r.nP] && r.possible[8][r.nP] && r.possible[14][r.nP]);
}

// 7. "Refused" carries no information; "showed" keeps going when asked everyone.
{
  const base = mk(4, 0, [0, 1, 6, 7, 12]);
  const withRefusal = mk(4, 0, [0, 1, 6, 7, 12], [{
    type: 'suggest', by: 0, cards: [2, 8, 14], responses: [{ p: 1, r: 'refused' }, { p: 2, r: 'refused' }, { p: 3, r: 'refused' }],
  }]);
  const a = S.analyse(base, { chains: 0 }), b = S.analyse(withRefusal, { chains: 0 });
  assert.deepStrictEqual(a.possible, b.possible);
}

// 8. Face-up cards: owned by the table, never in the envelope, and column count grows.
{
  const faceUp = [2, 8, 14, 3];
  const st = mk(2, 0, [0, 1, 6, 7, 12, 13, 15], [], { faceUp });
  assert.strictEqual(st.players[0].hand + st.players[1].hand, 14);
  st.players[0].hand = 7; st.players[1].hand = 7;
  const r = S.analyse(st, { chains: 2, steps: 2000 });
  assert(r.ok, r.error);
  assert(r.hasTable && r.nP === 3);
  faceUp.forEach((c) => { assert.strictEqual(r.certain[c], 2); assert(!r.possible[c][r.nP]); });
}

// 9. Marked card ("has") pins ownership.
{
  const st = mk(3, 0, [0, 1, 6, 7, 12, 13], [{ type: 'has', p: 2, card: 4 }]);
  const r = S.analyse(st, { chains: 0 });
  assert.strictEqual(r.certain[4], 2);
}

// 10. Located card: shower's other two cards impossible -> the third is identified.
{
  const st = mk(3, 0, [0, 1, 6, 7, 12, 13], [{
    type: 'suggest', by: 1, cards: [2, 8, 14],
    responses: [{ p: 2, r: 'showed' }],
  }, { type: 'suggest', by: 0, cards: [2, 8, 14], responses: [{ p: 2, r: 'none' }, { p: 1, r: 'showed', card: 2 }] }]);
  // player 2 said none on [2,8,14] in event 1, so event 0 (P2 showed one of them) is a contradiction
  assert(!S.analyse(st, { chains: 0 }).ok);
  const st2 = mk(3, 0, [0, 1, 6, 7, 12, 13], [
    { type: 'suggest', by: 0, cards: [2, 8, 14], responses: [{ p: 1, r: 'none' }, { p: 2, r: 'showed' }] },
    { type: 'has', p: 2, card: 14 },
  ]);
  const r = S.analyse(st2, { chains: 0 });
  assert(r.ok);
  // P1 passed on all three and P2 holds 14; 2 and 8 could still be P2's, so not located yet
  assert.strictEqual(r.located.length, 0);
  const st3 = mk(3, 0, [0, 1, 6, 7, 12, 13], [
    { type: 'suggest', by: 0, cards: [2, 8, 14], responses: [{ p: 1, r: 'none' }, { p: 2, r: 'showed' }] },
    { type: 'suggest', by: 0, cards: [2, 9, 15], responses: [{ p: 2, r: 'none' }] },
    { type: 'suggest', by: 0, cards: [3, 8, 16], responses: [{ p: 2, r: 'none' }] },
  ]);
  const r3 = S.analyse(st3, { chains: 0 });
  assert(r3.ok);
  assert.strictEqual(r3.located.length, 1);
  assert.strictEqual(r3.located[0].card, 14, 'P2 must hold the room');
  assert.deepStrictEqual(r3.located[0].cards, [14]);
  // two candidates: P2 can't hold 8 (passed on a suggestion with 8), so it is 2 or 14
  const st4 = mk(3, 0, [0, 1, 6, 7, 12, 13], [
    { type: 'suggest', by: 0, cards: [2, 8, 14], responses: [{ p: 1, r: 'none' }, { p: 2, r: 'showed' }] },
    { type: 'suggest', by: 0, cards: [3, 8, 16], responses: [{ p: 2, r: 'none' }] },
  ]);
  const r4 = S.analyse(st4, { chains: 0 });
  assert(r4.ok);
  assert.strictEqual(r4.located.length, 1);
  assert.deepStrictEqual(r4.located[0].cards, [2, 14]);
}

// 11. Custom edition (smaller deck) works.
{
  const ed = { id: 'x', name: 'Mini', suspects: ['A', 'B', 'C'], weapons: ['d', 'e', 'f'], rooms: ['g', 'h', 'i', 'j'] };
  const D = S.makeDeck(ed);
  assert.strictEqual(D.N, 10);
  const st = { edition: ed, players: [{ name: 'me', hand: 4 }, { name: 'b', hand: 3 }], me: 0, myCards: [0, 3, 6, 7], faceUp: [], events: [] };
  const r = S.analyse(st, { chains: 2, steps: 2000 });
  assert(r.ok, r.error);
  assert.strictEqual(r.envelope.length, 3);
}

// 12. Soundness: simulate random truthful games; the real envelope is never ruled out.
function simulate(seed, nP, k, withProbs, askAll) {
  const rng = S.mulberry32(seed);
  const pick = (s, n) => s + Math.floor(rng() * n);
  const env = [pick(0, 6), pick(6, 6), pick(12, 9)];
  const rest = [...Array(21).keys()].filter((c) => !env.includes(c));
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  const owner = new Array(21).fill(nP + 1); // envelope = nP+1 placeholder, fixed below
  const faceUp = rest.slice(0, k);
  faceUp.forEach((c) => { owner[c] = 'T'; });
  const dealt = rest.slice(k);
  const hands = S.defaultHands(nP, 18 - k);
  let at = 0;
  hands.forEach((h, p) => { for (let i = 0; i < h; i++) owner[dealt[at++]] = p; });
  env.forEach((c) => { owner[c] = 'E'; });
  const me = 0;
  const myCards = owner.map((o, c) => (o === me ? c : -1)).filter((c) => c >= 0);
  const state = { players: hands.map((h, i) => ({ name: 'P' + i, hand: h })), me, myCards, faceUp, events: [] };
  const toIdx = (o) => (o === 'E' ? (k > 0 ? nP + 1 : nP) : o === 'T' ? nP : o);
  let solvedAt = -1;
  for (let turn = 0; turn < 40; turn++) {
    const by = turn % nP;
    const cards = [pick(0, 6), pick(6, 6), pick(12, 9)];
    const responses = [];
    for (let i = 1; i < nP; i++) {
      const p = (by + i) % nP;
      const match = cards.filter((c) => owner[c] === p);
      if (match.length) {
        if (rng() < 0.1) { responses.push({ p, r: 'refused' }); continue; }
        const card = by === me ? match[Math.floor(rng() * match.length)] : null;
        responses.push({ p, r: 'showed', card });
        if (!askAll) break;
      } else responses.push({ p, r: 'none' });
    }
    state.events.push({ type: 'suggest', by, cards, responses });
    const r = S.analyse(state, withProbs ? { chains: 3, steps: 3000 } : { chains: 0 });
    assert(r.ok, 'consistent game must stay consistent (seed ' + seed + ' turn ' + turn + '): ' + r.error);
    for (let c = 0; c < 21; c++) assert(r.possible[c][toIdx(owner[c])], 'true owner ruled out for card ' + c + ' seed ' + seed + ' turn ' + turn);
    if (r.solved && solvedAt < 0) { solvedAt = turn; for (const l of r.envelope) assert(env.includes(l[0].card)); }
  }
  return solvedAt;
}

let solvedCount = 0;
const games = 60;
for (let g = 0; g < games; g++) {
  const nP = 3 + (g % 4);
  const k = g % 5 === 0 ? 3 : 0;
  if (simulate(1000 + g, nP, k, false, g % 3 === 0) >= 0) solvedCount++;
}
for (let g = 0; g < 4; g++) simulate(5000 + g, 4, g % 2 ? 2 : 0, true, g > 1);
// 2-player with 4 face-up cards
simulate(9000, 2, 4, false, false);
console.log('all tests passed; envelope fully deduced in ' + solvedCount + '/' + games + ' random 40-turn games (you as a silent observer)');

// bestSuggestions: positive expected gain, valid triple, none when solved
{
  const st = mk(4, 0, [0, 1, 6, 7, 12]);
  const r = S.analyse(st, { chains: 3, steps: 3000 });
  const b = S.bestSuggestions(r, st, 3);
  assert(b.length === 3 && b[0].gain > 0 && b[0].gain >= b[1].gain);
  b[0].cards.forEach((c, k) => assert(US.catOf(c) === k));
  console.log('best suggestion test ok');
}

// bestSuggestions restricted to the room I'm standing in
{
  const st = mk(4, 0, [0, 1, 6, 7, 12]);
  const r = S.analyse(st, { chains: 3, steps: 3000 });
  const room = idx('Kitchen');
  const b = S.bestSuggestions(r, st, 5, room);
  assert(b.length === 5 && b.every(x => x.cards[2] === room));
  const any = S.bestSuggestions(r, st, 1)[0];
  assert(b[0].gain <= any.gain + 1e-9, 'restricting cannot beat the unrestricted best');
  console.log('room-restricted suggestion test ok');
}
