# Orbital Mechanics

This page covers the physics foundations behind the Space Mission Planner.

## Gravity

Every object with mass attracts every other object. The gravitational acceleration on a spacecraft due to a body is:

$$\vec{a} = -\frac{GM}{r^2} \hat{r}$$

where $G$ is the gravitational constant, $M$ is the body's mass, $r$ is the distance, and $\hat{r}$ is the unit vector pointing from the body to the spacecraft.

The simulation computes gravitational acceleration from **all 16 bodies simultaneously** (n-body gravity), not just the nearest one. This means your spacecraft feels the pull of Jupiter even while orbiting Earth — which matters for precise interplanetary trajectories.

## Keplerian Orbits

In the simplest case (one massive body, one spacecraft), orbits are conic sections:

- **Circle**: Constant distance from the body. Requires exactly the right velocity.
- **Ellipse**: The general bound orbit. Planets follow near-circular ellipses around the Sun.
- **Parabola**: The boundary between bound and unbound — escape velocity.
- **Hyperbola**: Unbound trajectory. The spacecraft flies past and never returns.

The simulation uses circular orbits for all planets and moons (a reasonable approximation for mission planning). Only the spacecraft follows a numerically integrated trajectory.

## Numerical Integration

The spacecraft's trajectory is computed using the **Velocity Verlet** method with adaptive time stepping. At each step:

1. Compute gravitational acceleration from all bodies
2. Update velocity by half a step
3. Update position by a full step
4. Recompute acceleration at the new position
5. Update velocity by the remaining half step

The time step shrinks automatically when the spacecraft is near a massive body (where gravity changes rapidly) and grows when it's in open space, balancing accuracy and performance.

## Coordinate System

The simulation uses a heliocentric (inertial) coordinate system:

- **Origin**: The Sun
- **Epoch**: J2000.0 (January 1, 2000 at 12:00 TT)
- **Units**: Meters for distance, seconds for time
- **1 AU** (Astronomical Unit) = 1.496 × 10¹¹ meters — roughly the Earth-Sun distance

All positions, velocities, and maneuvers are defined in this coordinate system unless a different reference frame is selected.

## Sphere of Influence

Although the simulation computes full n-body gravity, conceptually each body has a region where its gravity dominates over the Sun's. This is roughly its **Hill sphere** or sphere of influence. When your spacecraft enters a body's sphere of influence, that body becomes the primary gravitational influence, and the concept of "orbiting" that body becomes meaningful.
