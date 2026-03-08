# Import & Export

The import/export buttons (top center) let you save and reload mission plans.

## Exporting

Click **Export** to download a JSON file containing:

- All spacecraft and their initial conditions
- All maneuvers (epoch, frame, angle, magnitude)
- The current simulation epoch

The file is named `mission-YYYY-MM-DD.json` based on the current date.

## Importing

Click **Import** to load a previously saved mission file:

1. A file picker opens — select a `.json` mission file.
2. All spacecraft and maneuvers are restored.
3. Trajectories are recomputed automatically.
4. The simulation epoch is set to the saved value.

If the file is invalid, an error alert is shown.

## Use Cases

- **Save progress**: Export before trying risky maneuvers so you can revert.
- **Share missions**: Send the JSON file to someone else to show your trajectory design.
- **Iterate**: Export a baseline mission, then import it multiple times to try different approaches.
