//-------------------------------------------------------------
// WEOSTY PARRSER, for Lightkey and Ableton Live
// by Diego Muhr
//-------------------------------------------------------------
inlets = 5;   
outlets = 3;  // Now we have 2 outlets: #1 for OSC, #2 for UI config
autowatch = 1;

//-------------------------------------------------------------
// GLOBALS (from the dict):
//-------------------------------------------------------------
var pageName         = null;
var cueName          = null;
var frameName        = null;
var fadeIn           = 0.0;    
var fadeOut          = 0.0;    
var inputFilterMode  = 0;      
var inputFilterMidi  = 0;      
var inputFilterCC    = 0;      
var selectedFunction = 0;      // 0..18
var hold             = false;  


//-------------------------------------------------------------
// INTERNAL STATE
//-------------------------------------------------------------
var notePresent = false; // For CC/automation gating

//-------------------------------------------------------------
// SCALING: [1..127] -> [0..127]
//-------------------------------------------------------------
function scaleInput(raw) {
    var c = Math.max(0, Math.min(127, raw));
    if (c === 0 || c === 127) {
        return c;
    }
    // linearly map [1..126] to [0..~126]
    var scaled = (c - 1) * 127 / 126.0;
    return Math.round(scaled);
}

//-------------------------------------------------------------
// FUNCTION NAME + UTIL
//-------------------------------------------------------------
function getBaseFunctionName(fnId) {
    switch(fnId) {
        // 0 => special activate/deactivate logic (handled below)
        case 1:  return "intensity";
        case 2:  return "toggle";
        case 3:  return "speed";
        case 4:  return "beatMultiplier";
        case 5:  return "timeOffset";
        case 6:  return "fadeTime";
        case 7:  return "dimmer";
        case 8:  return "hue";
        case 9:  return "colorTemperature";
        case 10: return "greenSaturation";
        case 11: return "xfadeToColor";
        case 12: return "panAngle";
        case 13: return "tiltAngle";
        case 14: return "focus";
        case 15: return "zoomAngle";
        case 16: return "irisSize";
        case 17: return "frostAmount";
        case 18: return "fogAmount";
        default: return "unknown";
    }
}

function usesNormalizedValue(fnId) {
    // 0 => activate/deactivate
    // 1 => intensity => yes
    // 2 => toggle => no
    // 3..18 => yes
    if (fnId === 0 || fnId === 2) {
        return false;
    }
    return true;
}

function usesFadeInIfNonZero(fnId) {
    // 2 => toggle => fadeIn
    // 0 => special fadeIn/fadeOut logic, so skip here
    return (fnId === 2);
}

//-------------------------------------------------------------
// NORMALIZATION for 1..18
//-------------------------------------------------------------
function normalizeValue(fnId, mainValue) {
    var mv = Math.max(0, Math.min(127, mainValue));
    switch(fnId) {
        case 1: // intensity: float 0..1
            return (mv / 127).toFixed(3);
        case 3: // speed: int -74..10
            return Math.round(-74 + 84 * (mv / 127));
        case 4: // beatMultiplier: int -4..10
            return Math.round(-4 + 14 * (mv / 127));
        case 5: // timeOffset: int -3..12
            return Math.round(-3 + 15 * (mv / 127));
        case 6: // fadeTime: int 0..113
            return Math.round(113 * (mv / 127));
        case 7: // dimmer: int 0..14
            return Math.round(14 * (mv / 127));
        case 8: // hue: int 0..15
            return Math.round(15 * (mv / 127));
        case 9: // colorTemperature: int 0..18
            return Math.round(18 * (mv / 127));
        case 10: // greenSaturation: int 0..19
            return Math.round(19 * (mv / 127));
        case 11: // xfadeToColor: int 0..20
            return Math.round(20 * (mv / 127));
        case 12: // panAngle: int 0..22
            return Math.round(22 * (mv / 127));
        case 13: // tiltAngle: int 0..90
            return Math.round(90 * (mv / 127));
        case 14: // focus: int 0..109
            return Math.round(109 * (mv / 127));
        case 15: // zoomAngle: int 0..18
            return Math.round(18 * (mv / 127));
        case 16: // irisSize: int 0..109
            return Math.round(109 * (mv / 127));
        case 17: // frostAmount: int 0..1009
            return Math.round(1009 * (mv / 127));
        case 18: // fogAmount: int 0..1088
            return Math.round(1088 * (mv / 127));
        default:
            return 0;
    }
}

//-------------------------------------------------------------
// BUILD OSC COMMAND
//-------------------------------------------------------------
function sanitizeName(str) {
    if (!str) return null;
    if (str === "...") return null;
    var trimmed = str.trim();
    if (trimmed.length === 0) return null;
    return trimmed.replace(/\s+/g, "_");
}

function buildOscCommand(mainValue) {
    var snPage = sanitizeName(pageName);
    if (!snPage) {
        outlet(0, "ERROR: no page name");
        return;
    }
    var snCue = sanitizeName(cueName);
    if (!snCue) {
        outlet(0, "ERROR: no cue name");
        return;
    }
    var snFrame = sanitizeName(frameName);

    var path = "/live/" + snPage + "/";
    if (snFrame) {
        path += "frame/" + snFrame + "/";
    }
    path += "cue/" + snCue + "/";

    // If function=0 => "activate" or "deactivate"
    if (selectedFunction === 0) {
        if (mainValue > 0) {
            path += "activate";
            var fi = Math.max(0, Math.min(90, fadeIn));
            if (fi > 0) {
                path += " " + fi;
            }
        } else {
            path += "deactivate";
            var fo = Math.max(0, Math.min(9999, fadeOut)); 
            if (fo > 0) {
                path += " " + fo;
            }
        }
        outlet(0, path);
        return;
    }

    // Otherwise, function=1..18
    var fnName = getBaseFunctionName(selectedFunction);
    path += fnName; 

    var addValue = "";
    if (usesFadeInIfNonZero(selectedFunction)) {
        var safeFadeIn = Math.max(0, Math.min(90, fadeIn));
        if (safeFadeIn !== 0) {
            addValue = " " + safeFadeIn;
        }
    } 
    else if (usesNormalizedValue(selectedFunction)) {
        var normVal = normalizeValue(selectedFunction, mainValue);
        addValue = " " + normVal;
    }

    outlet(0, path + addValue);
}

//-------------------------------------------------------------
// UI VISIBILITY & DEFAULTS
//   - Called each time we update 'selectedFunction' from dict
//-------------------------------------------------------------
function updateUI() {
    // Existing fade visibility logic
    var hideFadeIn  = 1;
    var hideFadeOut = 1;

    switch (selectedFunction) {
        case 0: // activate/deactivate
            hideFadeIn  = 0;
            hideFadeOut = 0;
            break;
        case 2: // toggle
            hideFadeIn  = 0;
            hideFadeOut = 1;
            break;
        default:
            hideFadeIn  = 1;
            hideFadeOut = 1;
            break;
    }

    // Send fade visibility
    outlet(1, "hide fadeIn hidden " + hideFadeIn);
    outlet(1, "hide fadeOut hidden " + hideFadeOut);

    // -------------------------------
    // NEW: input filter mode logic
    // 0 = Note → show inputFilterMidi, hide CC
    // 1 = CC → show inputFilterCC, hide Midi
    // 2 = Auto → hide both
    // -------------------------------
    var hideMidi = 1;
    var hideCC   = 1;

    if (inputFilterMode === 0) {
        hideMidi = 0;
    } else if (inputFilterMode === 1) {
        hideCC = 0;
    }

    outlet(1, "hide inputFilterMidi hidden " + hideMidi);
    outlet(1, "hide inputFilterCC hidden " + hideCC);
}


//-------------------------------------------------------------
// DICT HANDLER (inlet 3)
//-------------------------------------------------------------
function pattrInfo(dictName) {
    var d = new Dict(dictName);

    pageName         = d.get("pageName");
    cueName          = d.get("cueName");
    frameName        = d.get("frameName");
    fadeIn           = d.get("fadeIn");
    fadeOut          = d.get("fadeOut");
    inputFilterMode  = d.get("inputFilterMode");
    inputFilterMidi  = d.get("inputFilterMidi");
    inputFilterCC    = d.get("inputFilterCC");
    selectedFunction = d.get("selectedFunction");
    hold             = !!d.get("hold"); 

    // Now update UI elements on 2nd outlet
    updateUI();
}

//-------------------------------------------------------------
// NOTE INPUT (inlet 0)
//-------------------------------------------------------------
function inputNote(noteNum, velocityRaw) {
    if (velocityRaw > 0) {
        notePresent = true;
    } else {
        notePresent = false;
    }

    if (inputFilterMode !== 0) return;
    if (noteNum !== inputFilterMidi) return;

    if (velocityRaw > 0) {
        var scaledVel = scaleInput(velocityRaw);
        buildOscCommand(scaledVel);
        outputMonitor(scaledVel);

    } else {
        if (hold) {
            return;
        }
        buildOscCommand(0);
        outputMonitor(0);

    }
}

//-------------------------------------------------------------
// CC INPUT (inlet 1)
//-------------------------------------------------------------
function inputCC(ccNum, ccValRaw) {
    if (inputFilterMode !== 1) return;
    if (ccNum !== inputFilterCC) return;
    if (!notePresent) return;

    if (ccValRaw > 0) {
        var scaledVel = scaleInput(ccValRaw);
        buildOscCommand(scaledVel);
        outputMonitor(scaledVel);

    } else {
        if (hold) {
            return;
        }
        buildOscCommand(0);
        outputMonitor(0);

    }
}

//-------------------------------------------------------------
// AUTOMATION INPUT (inlet 2)
//-------------------------------------------------------------
function inputAutomation(valRaw) {
    if (inputFilterMode !== 2) return;
    if (!notePresent) return;

    if (valRaw > 0) {
        var scaledVel = scaleInput(valRaw);
        buildOscCommand(scaledVel);
        outputMonitor(scaledVel);
    } else {
        if (hold) {
            return;
        }
        buildOscCommand(0);
        outputMonitor(0);

    }
}

//-------------------------------------------------------------
// MONITOR INPUT/OUTPUT (inlet/outlet 4)
//-------------------------------------------------------------
function inputMonitor(monValRaw) {
    
        var scaledVel = monValRaw;
        buildOscCommand(scaledVel); 
        outputMonitor(scaledVel);
    
}

function outputMonitor(val) {
    
    // var scaledVel = monValRaw;
   // buildOscCommand(scaledVel); 
   outlet(2, val);
}

//-------------------------------------------------------------
// MESSAGE ROUTING
//-------------------------------------------------------------
function list() {
    var args = arrayfromargs(arguments);
    if (inlet === 0 && args.length >= 2) {
        inputNote(args[0], args[1]);
    } else if (inlet === 1 && args.length >= 2) {
        inputCC(args[0], args[1]);
    }
}

function msg_int(val) {
    if (inlet === 2) {
        inputAutomation(val);
    }
}

function msg_int(val) {
    if (inlet === 4) {
        inputMonitor(val);
    }
}

function anything() {
    if (inlet === 3) {
        pattrInfo(messagename);
    }
}
