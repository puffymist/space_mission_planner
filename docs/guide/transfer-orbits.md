# Transfer Orbits

The transfer helper (bottom left) calculates Hohmann and bi-elliptic transfers between bodies sharing a common parent.

## Setting Up a Transfer

1. **Select a system**: Choose the central body (Sun for interplanetary, Jupiter for Jovian moons, etc.). This determines which bodies appear in the departure/arrival dropdowns.
2. **Select departure and arrival bodies**: Pick where you're leaving from and where you're going.
3. **Choose mode**: Hohmann (2-burn) or Bi-elliptic (3-burn).

## Reading the Results

Once you've selected valid departure and arrival bodies, the panel shows:

- **Total delta-v**: The combined cost of all burns in m/s.
- **Individual burns**: Delta-v for each burn (2 for Hohmann, 3 for bi-elliptic).
- **Transfer time**: How long the coast phase takes.
- **Phase angle**: The angular separation needed between the two bodies at launch for the spacecraft to arrive when the destination body is in position.

## Finding a Launch Window

Click **Find Window** to search forward from the current epoch for the next time the departure and arrival bodies are at the correct phase angle. The simulation epoch jumps to that window.

## Applying the Transfer

Click **Apply** to automatically:
1. Create a new spacecraft at the departure body
2. Add the calculated burns at the correct epochs
3. Compute and display the full transfer trajectory

The spacecraft appears in your spacecraft list and you can further edit its maneuvers.

## Bi-Elliptic Mode

In bi-elliptic mode, an **R ratio** slider controls how far out the intermediate orbit goes, as a multiple of the larger body's orbital radius. Higher ratios are more fuel-efficient for transfers between bodies with very different orbital radii (roughly when the destination is more than 12 times farther than the departure). See [Bi-Elliptic Transfers](/concepts/bi-elliptic-transfers) for the theory.

## Tips

- **Phase angle matters**: A transfer only works when the bodies are correctly aligned. Use Find Window to jump to the right moment.
- **Hohmann is usually sufficient**: For most planet-to-planet transfers in the solar system, Hohmann transfers are near-optimal.
- **Edit after applying**: The auto-generated burns are a starting point. Select the spacecraft and fine-tune individual maneuvers in the delta-v panel.
