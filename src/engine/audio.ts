// Audio qari per huruf. File rekaman diletakkan di public/audio/ dan didaftarkan di public/audio/manifest.json.
// Perlambatan memakai playbackRate dengan preservesPitch (time-stretch bawaan browser) sehingga nada tidak berubah.
// Selama rekaman qari belum tersedia, dipakai suara sintetis (Web Speech API) jika perangkat punya suara Arab.
import type { Harakat } from '../content'

interface Manifest {
  files: Record<string, string>
}

let manifest: Manifest = { files: {} }
let manifestPromise: Promise<void> | null = null
const cache = new Map<string, HTMLAudioElement>()

export function loadManifest(): Promise<void> {
  if (!manifestPromise) {
    manifestPromise = fetch(`${import.meta.env.BASE_URL}audio/manifest.json`)
      .then((r) => (r.ok ? r.json() : { files: {} }))
      .then((m: Manifest) => {
        manifest = { files: m.files ?? {} }
      })
      .catch(() => undefined)
  }
  return manifestPromise
}

export function recordingKey(letterId: string, h: Harakat) {
  return `${letterId}:${h}`
}

export function hasRecording(letterId: string, h: Harakat) {
  return recordingKey(letterId, h) in manifest.files
}

function arabicVoice(): SpeechSynthesisVoice | undefined {
  if (typeof speechSynthesis === 'undefined') return undefined
  return speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('ar'))
}

export type AudioSource = 'recording' | 'tts' | 'none'

export function audioSource(letterId: string, h: Harakat, allowTts: boolean): AudioSource {
  if (hasRecording(letterId, h)) return 'recording'
  if (allowTts && arabicVoice()) return 'tts'
  return 'none'
}

let current: { stop: () => void } | null = null

export function stopAudio() {
  current?.stop()
  current = null
}

export function playSyllable(opts: { letterId: string; harakat: Harakat; text: string; rate: number; allowTts: boolean }): AudioSource {
  stopAudio()
  const key = recordingKey(opts.letterId, opts.harakat)
  const file = manifest.files[key]
  if (file) {
    let el = cache.get(key)
    if (!el) {
      el = new Audio(`${import.meta.env.BASE_URL}audio/${file}`)
      el.preload = 'auto'
      cache.set(key, el)
    }
    el.preservesPitch = true
    el.playbackRate = opts.rate
    el.currentTime = 0
    void el.play().catch(() => undefined)
    const audio = el
    current = { stop: () => audio.pause() }
    return 'recording'
  }
  const voice = opts.allowTts ? arabicVoice() : undefined
  if (voice) {
    const u = new SpeechSynthesisUtterance(opts.text)
    u.voice = voice
    u.lang = voice.lang
    u.rate = Math.max(0.1, opts.rate * 0.8)
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
    current = { stop: () => speechSynthesis.cancel() }
    return 'tts'
  }
  return 'none'
}

if (typeof speechSynthesis !== 'undefined') {
  // beberapa browser memuat daftar suara secara asinkron
  speechSynthesis.getVoices()
}
