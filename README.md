# Clues

A Clue (Cluedo) deduction tracker for the table. Record each suggestion, who answered "none", who showed a card and who refused. The app narrows down what can still be in the confidential envelope and shows the odds per card.

## Features

- **New game setup:** you first, then players in seat order (reorder, add, remove). Pick an edition and tap the cards you were dealt.
- **Editions:** Clue (US), Cluedo (UK), plus your own card sets (saved on the device).
- **Card list:** every card with its chance of being in the envelope, a column per other player (✓ has it, ✕ can't, ? might), who suggested it, and your own cards highlighted. Tap a card for the full picture.
- **Recording a turn:** choose the three cards, then answer for each player in order. On your own suggestion, tap the card you were shown. Your own answers on others' suggestions are filled in from your hand. A refusal gives no information and moves on.
- **Locate cards for me:** the turns list shows 👁️ when it knows which card someone showed. When it is down to two cards, a moon shows how likely each one is in their hand: 🌕 almost certain, 🌖 more than half, 🌗 about even, 🌘 less likely.
- **Mark who has a card:** for things you learned some other way.
- **Wrong accusations**, **undo**, and delete any turn.
- **Rules:** face-up cards (a table column), "ask everyone even after a card is shown", and editable hand sizes.
- **Solved popup** when a category is certain; **continue game** prompt on reopen; in-app help.

## Suspect art

The six suspect cards use portrait art (`img/*.jpg`, also embedded in `portraits.js`). `python3 build.py` inlines `portraits.js` and `solver.js` into a single self-contained `dist/index.html`; GitHub Pages can also serve the repo root as is.

## How it works

Every card has exactly one owner: a seated player, the table (face-up cards) or the envelope. The envelope holds one suspect, one weapon and one room. Each log entry becomes a rule:

| Event | Rule |
|---|---|
| Your hand / a card you marked | those cards belong to that player |
| Face-up card | owned by the table |
| Player says "none" | they hold none of the 3 cards |
| Player shows a card | they hold at least 1 of the 3 (exactly that card, if you saw it) |
| Player refuses | no information |
| Nobody shows | every other player holds none of the 3 (the suggester may hold one) |
| Wrong accusation | the 3 cards are not all in the envelope |

Two layers answer the question:

1. **Exact logic.** For every (card, owner) pair, a backtracking search checks whether any consistent deal exists. This produces the certain results: ✓ and ✕, and "definitely in the envelope".
2. **Probabilities.** An MCMC sampler (random card swaps between hands) estimates how likely each card is to be in each hand or in the envelope. Sampled percentages carry about ±1% noise.

Hand sizes: your own count is exact. When the cards don't divide evenly between the others, the extras go to players in seat order by default; change this under Rules → Cards per player if you know better.

## Run it

No build step.

```
npm start        # or: open index.html directly
npm test         # solver tests + random-game simulations
```

Deploy for free: push to GitHub, then Settings → Pages → Deploy from branch → `main` / root. Open the URL on your phone at the table.

## Files

- `solver.js`: decks/editions, constraint builder, search, sampler
- `index.html`: mobile-first UI. State is saved in `localStorage`
- `test/solver.test.js`: hand-made cases plus simulated games (including face-up cards, refusals and ask-everyone) that check the real envelope is never ruled out

## Ideas for next

- Suggest the best next question (the one that splits the remaining possibilities most evenly)
- "Why" explanations that show which entries forced each ✓
- Check sampled percentages against exact counts on small decks
