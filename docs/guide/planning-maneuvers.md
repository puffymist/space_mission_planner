# Planning Maneuvers

The delta-v panel (upper right, below the spacecraft panel) is where you design your mission's burns. Select a spacecraft first to see its event list.

## Event List

Every spacecraft has a chronological list of events:

- **Event #0 (Launch)**: The initial conditions — when and where the spacecraft starts.
- **Events #1, #2, ...**: Delta-v maneuvers (instantaneous burns) at specific epochs.

Click any event to expand its editor.

## Adding a Maneuver

Click **Add maneuver** to create a new burn at the current simulation epoch. It defaults to a 1000 m/s prograde burn, which you can then adjust.

## Editing a Maneuver

Each maneuver has three main parameters:

### Epoch
When the burn occurs. Enter a date/time or use the epoch picker. The trajectory is recomputed live as you change the epoch.

### Reference Frame & Angle

Choose how to specify the burn direction:

| Frame | Directions | Best for |
|-------|-----------|----------|
| **Inertial** | Fixed +X, +Y, -X, -Y axes | Interplanetary transfers |
| **Velocity** | Prograde, Normal, Retrograde, Anti-Normal | Orbit raising/lowering |
| **Body** | Prograde, Radial+, Retrograde, Radial- relative to a chosen body | Local orbit adjustments |

Each frame has preset buttons for the cardinal directions. You can also set any angle from 0-360 degrees for intermediate directions.

For the **Body** frame, you also select which body to use as the reference (e.g., burn prograde relative to Earth vs. relative to Mars).

### Magnitude

The burn size in m/s. Use the slider for fine adjustment or type a value directly. Step presets (1, 10, 100, 1000 m/s) let you switch between coarse and fine control.

## Live Preview

As you edit a maneuver, the canvas shows a preview trajectory in real time. This lets you see exactly how each adjustment affects the flight path before committing.

Click **Update** to save your changes, or **Cancel** to discard them.

## Circularization

Click **Circularize** to automatically compute and add a burn that achieves a circular orbit around the nearest body. This is useful after arriving at a destination — one click to settle into a stable orbit.

## Epoch Linking

You can link maneuver epochs together so they move in lockstep. This is useful when you want to shift an entire mission plan forward or backward in time without changing the relative timing between burns.

Linked events show a blue dot and a "Group" indicator. Use the link/unlink controls in each event's editor.

## Editing the Launch

Expand event #0 to edit the launch conditions:

- Change the **epoch** (when the spacecraft starts)
- Adjust the **phase angle** (where on the orbit it appears, 0-360 degrees)
- Switch to **manual mode** to directly set position (X, Y) and velocity (Vx, Vy) in heliocentric coordinates
