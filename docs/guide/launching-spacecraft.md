# Launching Spacecraft

## Launch from a Body

The Spacecraft panel (upper right) lets you launch spacecraft into orbit around any celestial body except the Sun.

1. **Select a body** from the dropdown (e.g., Earth, Mars, Jupiter).
2. **Set altitude** (optional): Enter an altitude in km above the body's surface. Leave blank for a default low orbit.
3. Click **Launch** to create the spacecraft in a prograde circular orbit around that body.

The spacecraft appears in the list below with a color swatch and name. It inherits the orbital velocity of the body it launched from, plus the circular orbit velocity at the specified altitude.

## Place Mode

For more control over initial position:

1. Click the **Place** button — the cursor changes to a crosshair.
2. Click anywhere on the canvas to place a spacecraft at that world position.
3. The spacecraft is created with zero velocity relative to the nearest body's orbit.

Place mode deactivates automatically after you click.

## Managing Spacecraft

The spacecraft list shows all active spacecraft. Click one to **select** it (highlighted in blue), which enables the delta-v panel for editing its maneuvers.

Each entry shows:
- Color swatch and auto-generated name
- Origin body
- **x** button to delete

When no spacecraft are selected, the delta-v panel shows a prompt to select one.
