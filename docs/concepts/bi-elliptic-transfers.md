# Bi-Elliptic Transfers

A bi-elliptic transfer uses three burns and two intermediate ellipses to move between orbits. It's less intuitive than a Hohmann transfer but can be more fuel-efficient for certain geometries.

## How It Works

1. **Burn 1**: At the departure orbit, fire prograde to enter a highly elliptical transfer orbit that reaches far beyond the destination.

2. **Coast to apoapsis**: Travel to the farthest point of the first transfer ellipse (the intermediate radius).

3. **Burn 2**: At the intermediate radius, fire to enter a second elliptical orbit whose periapsis touches the destination orbit.

4. **Coast to periapsis**: Travel back inward to the destination orbit radius.

5. **Burn 3**: Fire to circularize at the destination orbit.

## When It Beats Hohmann

The bi-elliptic transfer requires more burns and takes longer, but it can use less total delta-v when the ratio between the destination and departure orbit radii is large.

The crossover point depends on the intermediate radius:
- For $r_2 / r_1 > 11.94$, a bi-elliptic transfer is always more efficient than Hohmann, regardless of the intermediate radius.
- For ratios between roughly 11.94 and the lower limit (which depends on R), the comparison depends on how far out the intermediate orbit goes.

In practice, most interplanetary transfers in the inner solar system don't benefit from bi-elliptic transfers. They become useful for extreme cases like transfers to the outer solar system or between very different orbit sizes.

## The R Ratio

In the app, the bi-elliptic mode has an **R ratio** slider. This controls how far the intermediate orbit extends, as a multiple of the larger of the two orbit radii. A higher R ratio means:

- **More efficient** (less total delta-v)
- **Much longer transfer time** (the spacecraft has to travel out and back)

There's a trade-off between fuel savings and patience.

## In the App

Switch to **Bi-elliptic** mode in the transfer helper, adjust the R ratio, and compare the total delta-v with the Hohmann option to see which is cheaper for your particular transfer.
