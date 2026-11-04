# HamZa Replica test plan — first quote slice

## Quote calculation

- Q-H1: one line, quantity 1, price 10000 centimes → total 10000.
- Q-H2: two lines, 2 × 1250 and 3 × 2000 centimes → subtotal 8500.
- Q-H3: line discount reduces only its line total.
- Q-H4: document discount reduces subtotal after line calculations.
- Q-N1: empty line list is rejected.
- Q-N2: zero or negative quantity is rejected.
- Q-N3: negative unit price or discount is rejected.
- Q-N4: line discount greater than line gross is rejected.
- Q-N5: document discount greater than subtotal is rejected.
- Q-E1: quantity with more than three decimal places is rejected.
- Q-E2: very large totals that exceed safe integer range are rejected.

## Persistence and PDF — pending implementation

- Preserve existing AsyncStorage records during schema migration.
- Close and reopen app; quote and all lines remain present.
- Arabic PDF renders right-to-left; French PDF renders left-to-right.
- Long product descriptions wrap and totals remain visible.

## Status

Only the pure calculation module exists at this stage. No test cases are marked passed until executed in the project environment.
