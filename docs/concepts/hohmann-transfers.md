# Hohmann Transfers

A Hohmann transfer is the most fuel-efficient way to move between two circular, coplanar orbits using exactly two engine burns.

## How It Works

The transfer uses an elliptical orbit that is tangent to both the departure and arrival orbits:

1. **Burn 1 (Departure)**: At the departure orbit, fire prograde to enter an elliptical transfer orbit. The periapsis (closest point) touches the inner orbit, and the apoapsis (farthest point) touches the outer orbit.

2. **Coast**: Travel along the transfer ellipse for exactly half an orbital period.

3. **Burn 2 (Arrival)**: At the arrival orbit, fire prograde again to circularize — matching the velocity of the destination orbit.

## The Math

For two circular orbits with radii $r_1$ (departure) and $r_2$ (arrival) around a body with gravitational parameter $\mu = GM$:

**Transfer orbit semi-major axis:**
$$a_t = \frac{r_1 + r_2}{2}$$

**Transfer time** (half the orbital period of the transfer ellipse):
$$T = \pi \sqrt{\frac{a_t^3}{\mu}}$$

**Departure burn** (delta-v at $r_1$):
$$\Delta v_1 = \sqrt{\frac{\mu}{r_1}} \left(\sqrt{\frac{2 r_2}{r_1 + r_2}} - 1\right)$$

**Arrival burn** (delta-v at $r_2$):
$$\Delta v_2 = \sqrt{\frac{\mu}{r_2}} \left(1 - \sqrt{\frac{2 r_1}{r_1 + r_2}}\right)$$

## Phase Angle

A Hohmann transfer only works when the departure and arrival bodies are at a specific angular separation — the **phase angle**. If the bodies aren't aligned correctly, the spacecraft arrives at the right distance but the destination body isn't there.

The required phase angle is:
$$\phi = \pi \left(1 - \frac{1}{2\sqrt{2}} \sqrt{\left(\frac{r_1}{r_2} + 1\right)^3}\right)$$

Use the **Find Window** button in the transfer helper to search for the next time the bodies reach the correct alignment.

## When to Use Hohmann

Hohmann transfers are optimal (minimum total delta-v) when:
- Both orbits are circular and coplanar
- The radius ratio $r_2 / r_1$ is modest (less than about 11.94)

For very large radius ratios, a [bi-elliptic transfer](/concepts/bi-elliptic-transfers) can be more efficient despite requiring three burns.

## In the App

The transfer helper (bottom left) computes Hohmann transfers automatically. Select a parent system (e.g., Sun), choose departure and arrival bodies, and the panel shows the delta-v cost, transfer time, and phase angle. Click **Apply** to create a spacecraft with the correct burns already set up.
