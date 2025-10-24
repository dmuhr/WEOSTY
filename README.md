# WEOSTY - OSC Parser for Lightkey & Ableton Live

diegomuhr.com

A Max for Live OSC parser that integrates **Ableton Live** with **Lightkey**, allowing MIDI and automation signals from Live to control Lightkey cues with precise mappings and modifier functions.

---

## Included Max for Live Objects

- `WEOSTY_Multi` – Main Max for Live object for mapping MIDI/automation to Lightkey cues.  
- `WEOSTY_Server` – Server object for monitoring and aggregating OSC messages from multiple `Multi` objects.  

> **Note:** All files (including instances and JS parser) should be stored in the same folder, preferably in Max's `externals` folder.

---

## Setup

1. Place all files in the same folder (e.g., `Max/Packages/WEOSTY/externals`).  
2. In Ableton Live, create a MIDI track and drag the `Multi` object (`WEOSTY_Multi V.1.amxd`) onto the track.  
3. Add **one** `Server` object (`WEOSTY_Server V.1.amxd`) per session to monitor and collect data from all `Multi` objects.  

---

## Usage

Each `Multi` object allows you to configure mappings between MIDI/automation input and Lightkey cues.

### Note/CC Input Options

- **Hear MIDI Notes:** Use MIDI note input. Velocity > 0 is the value sent.  
- **Hear CC:** Select a CC channel. The incoming CC value is sent.  
- **Automation:** Use the automation slider corresponding to the track.  

### Columns and Settings

| Column         | Description |
|----------------|-------------|
| **Toggle**     | Enables the line. Only active lines send OSC commands. |
| **Note/CC**    | Select input type: MIDI Note, CC, or Automation. |
| **Cue Name**   | Exact cue name in Lightkey (case sensitive). Must match Lightkey cue name exactly. |
| **Function**   | The OSC function sent to Lightkey. Options: <br> - **On/Off**: Activate on Note On, deactivate on Note Off (can set `Hold` to ignore Note Off). <br> - **Intensity**: Requires Lightkey Control Type “Fader”; maps velocity/CC/automation to intensity (0–1). <br> - **Toggle**: Toggles state each time the input is received, independent of Note On/Off. <br> - **Modifiers**: Requires Lightkey modifier enabled; available functions: `speed`, `beatMultiplier`, `timeOffset`, `fadeTime`, `dimmer`, `hue`, `colorTemperature`, `greenSaturation`, `xfadeToColor`, `panAngle`, `tiltAngle`, `focus`, `zoomAngle`, `irisSize`, `frostAmount`, `fogAmount`. |
| **Hold**       | Ignores Note Off messages when enabled (useful for sustaining On/Off or Toggle). |
| **Fade in/out**| Overrides cue fade time (only affects On/Off or Toggle). |
| **Page Name**  | Target a specific Lightkey page. Defaults to `selected`. |
| **Frame Name** | Target a specific frame within a page (optional). |
| **Monitor**    | Observe the incoming value from MIDI/CC/automation. Uses RAM!|
| **Destination**| Sends OSC messages either to the `Server` (default) or `Direct` to a specified IP/port. |

---

### Recommended Workflow

1. Use multiple `Multi` objects on different tracks for independent cue mappings.  
2. Keep a single `Server` object in the session to centralize monitoring.  
3. Ensure cue names and function modifiers match exactly in Lightkey for correct OSC control.  

---

## Features

- Supports **MIDI notes**, **CC**, and **automation** input.  
- Automatic normalization and scaling of values for Lightkey functions.  
- Complete mapping of Lightkey functions and modifiers.  
- Option to ignore Note Offs (`Hold`) or override cue fade.  
- Centralized monitoring via a single `Server` object.  
- Direct OSC output option for advanced routing.  

---

## License

MIT License – Free to use and modify for personal and educational projects :)
