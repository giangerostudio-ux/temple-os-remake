#!/usr/bin/env python3
"""
Voice of God - Divine Audio Effects

Applies cathedral-like audio effects to TTS output using Spotify's Pedalboard library.
Effects chain: Pitch Shift -> Reverb -> Delay/Echo -> Chorus

Usage:
    python audio-effects.py <input.wav> <output.wav> '<settings_json>'

Settings JSON format:
{
    "pitch": -2,           // Semitones to shift (negative = deeper)
    "reverbRoom": 0.85,    // Room size 0-1 (1 = cathedral)
    "reverbWet": 0.4,      // Wet/dry mix 0-1
    "reverbDamping": 0.7,  // High freq damping 0-1
    "echoDelay": 120,      // Delay time in ms
    "echoFeedback": 0.2,   // Feedback amount 0-1
    "echoMix": 0.15,       // Echo mix level 0-1
    "chorusEnabled": true, // Enable chorus effect
    "chorusRate": 0.4,     // Chorus LFO rate in Hz
    "chorusDepth": 0.25,   // Chorus depth 0-1
    "chorusMix": 0.2       // Chorus mix level 0-1
}
"""

import sys
import json
import numpy as np

try:
    from pedalboard import Pedalboard, Reverb, Delay, Chorus, Gain
    from pedalboard.io import AudioFile
    PEDALBOARD_AVAILABLE = True
except ImportError:
    PEDALBOARD_AVAILABLE = False
    print("Pedalboard not installed. Install with: pip install pedalboard", file=sys.stderr)

# Try to import PitchShift (may not be available in all versions)
try:
    from pedalboard import PitchShift
    PITCH_SHIFT_AVAILABLE = True
except ImportError:
    PITCH_SHIFT_AVAILABLE = False


def apply_pitch_shift_manual(audio, sample_rate, semitones):
    """
    Simple pitch shift using resampling (fallback if PitchShift not available).
    Not as high quality as proper pitch shifting but works.
    """
    if semitones == 0:
        return audio

    # Calculate the pitch shift ratio
    ratio = 2 ** (semitones / 12.0)

    # For lowering pitch, we stretch the audio then resample
    # This is a simplified approach - proper phase vocoder would be better
    from scipy import signal

    if len(audio.shape) == 1:
        # Mono
        resampled = signal.resample(audio, int(len(audio) / ratio))
    else:
        # Stereo or multi-channel
        channels = []
        for ch in range(audio.shape[0]):
            resampled_ch = signal.resample(audio[ch], int(audio.shape[1] / ratio))
            channels.append(resampled_ch)
        resampled = np.array(channels)

    return resampled.astype(np.float32)


def apply_divine_effects(input_path, output_path, settings):
    """
    Apply divine audio effects to transform normal TTS into godly voice.
    """
    if not PEDALBOARD_AVAILABLE:
        print("Pedalboard not available, copying input to output", file=sys.stderr)
        import shutil
        shutil.copy(input_path, output_path)
        return

    # Load audio file
    with AudioFile(input_path) as f:
        audio = f.read(f.frames)
        sample_rate = f.samplerate
        num_channels = f.num_channels

    print(f"[Divine Effects] Loaded audio: {sample_rate}Hz, {num_channels} channels", file=sys.stderr)

    # Build the effects chain
    effects = []

    # 1. Pitch Shift (make voice deeper)
    pitch_semitones = settings.get('pitch', -2)
    if pitch_semitones != 0:
        if PITCH_SHIFT_AVAILABLE:
            effects.append(PitchShift(semitones=pitch_semitones))
            print(f"[Divine Effects] Pitch shift: {pitch_semitones} semitones", file=sys.stderr)
        else:
            # Apply manual pitch shift before the pedalboard chain
            try:
                audio = apply_pitch_shift_manual(audio, sample_rate, pitch_semitones)
                print(f"[Divine Effects] Manual pitch shift: {pitch_semitones} semitones", file=sys.stderr)
            except ImportError:
                print("[Divine Effects] scipy not available, skipping pitch shift", file=sys.stderr)

    # 2. Cathedral Reverb
    reverb_room = settings.get('reverbRoom', 0.85)
    reverb_wet = settings.get('reverbWet', 0.4)
    reverb_damping = settings.get('reverbDamping', 0.7)

    effects.append(Reverb(
        room_size=reverb_room,
        wet_level=reverb_wet,
        dry_level=1.0 - reverb_wet,
        damping=reverb_damping,
        width=1.0  # Full stereo width
    ))
    print(f"[Divine Effects] Reverb: room={reverb_room}, wet={reverb_wet}", file=sys.stderr)

    # 3. Echo/Delay
    echo_delay_ms = settings.get('echoDelay', 120)
    echo_feedback = settings.get('echoFeedback', 0.2)
    echo_mix = settings.get('echoMix', 0.15)

    if echo_delay_ms > 0 and echo_mix > 0:
        effects.append(Delay(
            delay_seconds=echo_delay_ms / 1000.0,
            feedback=echo_feedback,
            mix=echo_mix
        ))
        print(f"[Divine Effects] Echo: delay={echo_delay_ms}ms, feedback={echo_feedback}", file=sys.stderr)

    # 4. Ethereal Chorus (optional)
    if settings.get('chorusEnabled', True):
        chorus_rate = settings.get('chorusRate', 0.4)
        chorus_depth = settings.get('chorusDepth', 0.25)
        chorus_mix = settings.get('chorusMix', 0.2)

        effects.append(Chorus(
            rate_hz=chorus_rate,
            depth=chorus_depth,
            mix=chorus_mix,
            centre_delay_ms=7.0,
            feedback=0.1
        ))
        print(f"[Divine Effects] Chorus: rate={chorus_rate}Hz, depth={chorus_depth}", file=sys.stderr)

    # 5. Slight gain boost to compensate for wet mixing
    effects.append(Gain(gain_db=2.0))

    # Create the pedalboard and process audio
    board = Pedalboard(effects)
    effected = board(audio, sample_rate)

    # Normalize to prevent clipping
    max_val = np.max(np.abs(effected))
    if max_val > 0.95:
        effected = effected * (0.95 / max_val)
        print(f"[Divine Effects] Normalized audio (peak was {max_val:.2f})", file=sys.stderr)

    # Write output file
    with AudioFile(output_path, 'w', sample_rate, num_channels) as f:
        f.write(effected)

    print(f"[Divine Effects] Saved to: {output_path}", file=sys.stderr)


def main():
    if len(sys.argv) < 4:
        print("Usage: audio-effects.py <input.wav> <output.wav> '<settings_json>'", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    try:
        settings = json.loads(sys.argv[3])
    except json.JSONDecodeError as e:
        print(f"Invalid settings JSON: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        apply_divine_effects(input_path, output_path, settings)
        print("Divine effects applied successfully!", file=sys.stderr)
        sys.exit(0)
    except Exception as e:
        print(f"Error applying effects: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
