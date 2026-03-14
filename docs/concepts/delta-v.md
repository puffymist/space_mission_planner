# Delta-V

Delta-v (written $\Delta v$) is the fundamental currency of space mission design. It measures how much you need to change your velocity to perform a maneuver, and directly determines how much fuel is required.

## What Is Delta-V?

In the simplest terms, delta-v is the magnitude of the velocity change applied during a burn. A spacecraft orbiting Earth at 7.8 km/s that needs to reach 11.2 km/s (escape velocity) requires a delta-v of 3.4 km/s.

The simulation treats all burns as **impulsive** — instantaneous velocity changes at a single point in time. Real rockets burn for minutes, but for mission planning, the impulsive approximation is accurate enough and much simpler to work with.

## Reference Frames

The same burn can be described differently depending on your reference frame. The app supports three:

### Inertial
Direction is specified relative to the fixed solar system axes (+X, +Y). This is the absolute frame — a burn in the +X direction always points the same way regardless of where the spacecraft is.

Best for: specifying precise interplanetary trajectory corrections.

### Velocity-Relative
Direction is specified relative to the spacecraft's current velocity:

| Direction | Angle | Effect |
|-----------|-------|--------|
| **Forward** | 0° | Speed up along the direction of travel — raises the opposite side of the orbit |
| **Left** | 90° | Perpendicular to velocity — precesses the orbital ellipse |
| **Backward** | 180° | Slow down — lowers the opposite side of the orbit |
| **Right** | 270° | Perpendicular to velocity — precesses the orbital plane |

Best for: orbit raising/lowering, escape burns, and capture burns.

### Body-Relative
Direction is specified relative to a chosen celestial body:

| Direction | Angle | Effect |
|-----------|-------|--------|
| **Prograde** | 0° | Along the body's orbital velocity |
| **Radial+** | 90° | Away from the body |
| **Retrograde** | 180° | Against the body's orbital velocity |
| **Radial-** | 270° | Toward the body |

Best for: orbit adjustments relative to a specific body, such as circularizing after arrival.

## Practical Guidance

- **Orbit raising**: Burn prograde at periapsis to raise apoapsis. Burn prograde at apoapsis to raise periapsis.
- **Orbit lowering**: Burn retrograde at the opposite point from where you want to lower.
- **Circularization**: The app has a dedicated **Circularize** button that computes the exact burn needed.
- **Escape**: To leave a body's gravity, you typically need to burn prograde until your velocity exceeds escape velocity relative to that body.
