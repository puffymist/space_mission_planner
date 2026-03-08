# Camera & Navigation

## Mouse Controls

| Action | Effect |
|--------|--------|
| **Scroll wheel** | Zoom in/out (centered on cursor) |
| **Click and drag** | Pan the view |
| **Click a body** | Track that body |
| **Click a spacecraft** | Track that spacecraft |
| **Double-click** | Clear tracking, reset to inertial frame |

When you manually pan, camera tracking is automatically released.

## Camera Panel

The camera helper (top left) provides quick navigation:

- **Target dropdown**: Select any body or spacecraft to track.
- **Go To**: Jump to and center on the selected target, with automatic zoom to show the interesting region (e.g., a planet's moons, or a spacecraft's trajectory).
- **Solar System**: Zoom out to show the full solar system (~35 AU).
- **Inner System**: Zoom to show the inner planets (~2.5 AU).

## Body Tracking

When tracking a body, the camera follows it as the simulation advances. The body stays centered on screen while everything else moves around it.

Keyboard shortcuts for quick tracking:

| Key | Body |
|-----|------|
| `0` | Sun |
| `1` | Mercury |
| `2` | Venus |
| `3` | Earth |
| `4` | Mars |
| `5` | Jupiter |
| `6` | Saturn |
| `7` | Uranus |
| `8` | Neptune |

## Rotating Reference Frame

When tracking a body that orbits another body (anything except the Sun), a toggle appears in the top bar to switch between **Inertial** and **Rotating** frames.

- **Inertial**: The standard heliocentric view. Good for seeing absolute positions and trajectories.
- **Rotating**: The camera co-rotates with the tracked body's orbit around its parent. The tracked body stays fixed on screen, and you can see how other objects move relative to it.

Toggle with the `R` key or the button in the top bar.

Rotating frames are especially useful for:
- Viewing a spacecraft's orbit around a planet
- Seeing how moons move relative to their parent planet
- Understanding gravitational capture and escape trajectories

## Spacecraft Dragging

When you have a spacecraft selected, hover near it on the canvas (cursor changes to a grab hand). Click and drag to reposition the spacecraft — it gets placed at the new location with velocity matching the nearest body's orbit.
