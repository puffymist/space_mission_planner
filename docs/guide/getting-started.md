# Getting Started

Space Mission Planner is a 2D orbital mechanics simulator that runs entirely in your browser. You can launch spacecraft from any planet or moon, plan delta-v maneuvers, compute transfer orbits, and watch trajectories unfold under realistic n-body gravity.

## The Solar System

The simulation models 16 celestial bodies:

- **Sun** and all 8 planets (Mercury through Neptune)
- **Moon** (orbiting Earth)
- **Galilean moons**: Io, Europa, Ganymede, Callisto (orbiting Jupiter)
- **Titan** (orbiting Saturn)

All bodies follow circular coplanar orbits with accurate masses and orbital parameters. The reference epoch is J2000.0 (January 1, 2000 at 12:00 TT).

## UI Overview

The interface is organized around a central canvas showing the solar system:

| Area | What's there |
|------|-------------|
| **Top bar** | Play/pause, simulation speed, current epoch, rotating frame toggle |
| **Upper right** | Spacecraft panel (launch & manage) and delta-v panel (maneuvers) |
| **Bottom left** | Transfer orbit calculator (Hohmann & bi-elliptic) |
| **Top left** | Camera controls (go to body, preset views) |
| **Top center** | Import/export buttons |
| **Bottom** | Epoch slider for scrubbing through time |

## Quick Start

1. **Launch a spacecraft**: In the Spacecraft panel (upper right), select a departure body and click **Launch**.
2. **Advance time**: Use the play button or drag the epoch slider to see your spacecraft move.
3. **Add a maneuver**: Select your spacecraft, then click **Add maneuver** in the delta-v panel. Adjust the burn direction and magnitude to shape your trajectory.
4. **Try a transfer**: Use the transfer helper (bottom left) to compute a Hohmann transfer between two planets, then click **Apply** to create a spacecraft with the correct burns.

## Canvas Controls

- **Scroll wheel**: Zoom in/out (centered on cursor)
- **Click and drag**: Pan the view
- **Click a body**: Track that body (camera follows it)
- **Double-click**: Clear tracking, return to inertial view
- **Click on a trajectory**: Jump to that epoch

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `R` | Toggle rotating reference frame (when tracking a body) |
| `0`-`8` | Track Sun (0), Mercury (1), Venus (2), Earth (3), Mars (4), Jupiter (5), Saturn (6), Uranus (7), Neptune (8) |
