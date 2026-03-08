# Reference Frames

A reference frame is the coordinate system in which you view the simulation. Different frames reveal different aspects of orbital mechanics.

## Inertial (Heliocentric) Frame

The default view. The Sun sits at the origin and the coordinate axes are fixed — they don't rotate. Planets trace out their circular orbits, and spacecraft trajectories appear as the complex curves you'd see from a "god's eye" view of the solar system.

**Good for:**
- Seeing the overall shape of interplanetary transfers
- Understanding absolute positions and velocities
- Visualizing launch windows (when departure and arrival bodies align)

## Rotating Frame

When you track a body that orbits another body (e.g., Earth orbiting the Sun, or Europa orbiting Jupiter), you can switch to a **rotating reference frame**. In this frame, the camera co-rotates with the tracked body's orbital motion, so the tracked body stays fixed on screen.

Toggle with the `R` key or the button in the top bar.

**Good for:**
- Seeing how a spacecraft moves relative to a specific body
- Visualizing capture orbits and escape trajectories
- Understanding resonant orbits (patterns that repeat)
- Seeing Lagrange point dynamics (though these aren't explicitly modeled, the geometry is visible)

### What Changes

In a rotating frame:
- The tracked body appears stationary
- Other bodies drift across the view at rates determined by their orbital period relative to the tracked body
- Spacecraft trajectories look very different — a simple ellipse in the inertial frame can become a complex loop in the rotating frame
- The physics haven't changed, only the perspective

### Example

Track Earth and switch to the rotating frame. The Moon orbits Earth in a circle (as expected), but Mars and other planets slowly drift by. A spacecraft on a Hohmann transfer to Mars appears to loop around before heading off — this is the same trajectory, just viewed from Earth's perspective.

## Choosing a Frame

There's no "correct" frame — different frames are useful for different tasks:

| Task | Best Frame |
|------|-----------|
| Planning an interplanetary transfer | Inertial |
| Fine-tuning a capture orbit | Rotating (around destination body) |
| Checking if a spacecraft is bound to a body | Rotating (around that body) |
| Visualizing the overall mission | Inertial |
| Understanding moon-to-moon transfers | Rotating (around parent planet) |
