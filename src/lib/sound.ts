/**
 * Step alerts for Brew run: short tones from Web Audio, vibration on Android.
 * iOS only plays audio after a tap, so `unlockAudio` runs in the Start handler.
 */

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } }

let context: AudioContext | null = null

export function unlockAudio(): void {
    try {
        // Lets tones play even with the ringer switched to silent (Safari 16.4+).
        const session = (navigator as AudioSessionNavigator).audioSession
        if (session) session.type = 'playback'

        context ??= new AudioContext()
        if (context.state === 'suspended') void context.resume()

        // A silent blip completes the unlock on iOS.
        tone(0, 0.01, 0)
    } catch {
        context = null
    }
}

function tone(frequency: number, duration: number, volume: number, delay = 0): void {
    if (!context) return

    const start = context.currentTime + delay
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0001), start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    oscillator.connect(gain).connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
}

/** Browsers refuse to vibrate (and log an error) before the first tap on the page. */
function vibrate(pattern: number | number[]): void {
    if (navigator.userActivation?.hasBeenActive === false) return
    navigator.vibrate?.(pattern)
}

/** Short tick a few seconds before the next step. */
export function playTick(): void {
    tone(880, 0.12, 0.25)
    vibrate(40)
}

/** Clear two-tone chime when the step changes. */
export function playChange(): void {
    tone(660, 0.18, 0.4)
    tone(990, 0.3, 0.4, 0.18)
    vibrate([120, 60, 120])
}
