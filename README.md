# Tajwid 3D — Makhraj & Sifat Huruf Interaktif

Implementasi fase 1 dari `PRD — Tajwid 3D Makhraj & Sifat Huruf Interaktif.md`.
React + Three.js (React Three Fiber), situs statis tanpa login.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # uji konsistensi konten vs tabel PRD
npm run build    # hasil di dist/ (bisa di-hosting di CDN/folder mana pun)
```

## Yang sudah ada

| PRD | Status |
| --- | --- |
| F1 Viewer 3D potongan sagital (bibir, gigi seri & geraham, gusi, langit-langit keras/lunak, anak lidah, lidah, tenggorokan, pita suara, rongga hidung) | ✅ model prosedural (tanpa aset Blender) |
| F2 Kamera: rotate/zoom/pan (mouse & sentuh), preset samping/depan/atas/dalam mulut, reset | ✅ |
| F3 Toggle organ + slider transparansi kulit | ✅ panel "Lapisan" |
| F4 Animasi per huruf (3 fase), titik makhraj, aliran udara, getaran pita suara, ghunnah | ✅ |
| F5 Play/pause, ulang, 0.25x/0.5x/1x, geser timeline per fase, loop | ✅ |
| F6 Audio sinkron, diperlambat tanpa ubah nada | ⚠️ mesin siap (`preservesPitch`); **rekaman qari belum ada** — sementara suara sintetis Arab jika perangkat punya |
| F7–F9 Jelajah per huruf / makhraj / sifat | ✅ |
| F10 Mode bandingkan (kamera & timeline tersinkron) | ✅ |
| F11 Tafkhim & tarqiq (ra, lam jalalah, alif, tingkatan) | ✅ |
| F12 Kuis (4 jenis soal) | ✅ |
| F13 Mode guru (tekan `P`), layar penuh (`F`), pintasan keyboard (`?`) | ✅ |
| F14 Progres di perangkat | ✅ sederhana (localStorage) |
| Fallback 2D tanpa WebGL / mode ringan | ✅ memakai data pose yang sama |
| F15 rekam suara, F16 PWA offline | ❌ (P2) |

## Konten berbasis data

Semua konten ada di `src/content/*.json` — mengoreksi materi tidak perlu ubah kode:

- `letters.json` — 28 huruf + 3 huruf mad: makhraj, pose, kesalahan umum, huruf yang sering tertukar.
- `makhraj.json` — 5 area, 17 makhraj, koordinat titik di model.
- `sifat.json` — sifat; kelompok "selain …" dihitung otomatis sebagai komplemen.
- `poses.json` — posisi lidah/bibir/rahang/langit-langit lunak per pose (setara *morph target*).
- `tafkhim.json`, `compare.json`, `config.json` (status konten, email laporan, offset audio).

`npm test` memastikan data cocok dengan tabel PRD (kelompok sifat, 17 makhraj, satu sifat per pasangan, dll).

## Menambahkan rekaman qari

Letakkan file di `public/audio/` lalu daftarkan di `public/audio/manifest.json`:

```json
{ "files": { "ba:sukun": "ba_sukun.mp3", "ba:fathah": "ba_fathah.mp3" } }
```

Kunci: `<id huruf>:<sukun|fathah|kasrah|dhammah>` (id lihat `letters.json`). Audio mulai diputar pada
`config.audioOffsetSeconds` detik di timeline (default 0,55 s, saat vokal hamzah pembuka).

## Model 3D bawaan

Model bawaan `public/models/head-3d.glb` adalah kepala 3D volumetrik penuh. Isinya: wajah dan kulit utuh, 32 gigi pada lengkung U, langit-langit berbentuk kubah, langit-langit lunak dengan anak lidah, faring dan laring berupa tabung, rongga hidung, rahang, bibir melengkung, dan lidah membulat bertulang. Organ dibentuk dari *signed distance field* lalu di-mesh dengan surface nets ([src/dev/headModel.ts](src/dev/headModel.ts)), dan hasilnya dikompresi Draco (~1,3 MB, ±144 ribu segitiga).

- Tombol **Potongan / Utuh** di viewer memotong kepala secara sagital; penampang organ diisi padat (stencil).
- Kamera bawaan memakai sudut **3/4** agar volume organ terlihat; preset Samping/Depan/Atas/Dalam mulut tetap ada.
- Bangun ulang setelah mengubah bentuk: `npm run model:build` (lalu `npm run model:check -- public/models/head-3d.glb`).
- Model lama yang 2,5D tetap menjadi cadangan otomatis kalau file GLB gagal dimuat (atau `?model=prosedural`).

## Mengganti model 3D dengan model dari 3D artist

Model prosedural bawaan bisa diganti file glTF/GLB dari 3D artist **tanpa mengubah data pose maupun efek**:
engine tetap menghitung animasi dari `poses.json`, lalu memasangnya ke model lewat nama node, 13 tulang lidah
(atau morph target per pose), dan engsel velum. Brief lengkap untuk artist: [docs/model-3d-artist.md](docs/model-3d-artist.md).

```bash
npm run model:check -- public/models/kepala.glb   # validasi kontrak (memakai kode rig yang sama dengan aplikasi)
npm run model:sample                              # buat ulang file contoh di public/models/
```

- Coba tanpa mengubah konfigurasi: `http://localhost:5173/?model=models/kepala.glb#/huruf/qof`
- Pasang permanen: isi `"url"` di `public/models/model.json` (plus `transform` bila perlu diselaraskan).
- Cek keselarasan: panel **Lapisan → Titik referensi (kalibrasi model)**.
- Jika file gagal dimuat, aplikasi kembali ke model prosedural secara otomatis.
- Contoh yang lolos kontrak: `public/models/sample-bones.glb`, `sample-morphs.glb`, `sample-bones-draco.glb`.

## Sebelum rilis (dari PRD)

- **Semua konten berstatus draf** dan wajib di-review ustadz bersanad (riwayat Hafs): posisi lidah per huruf, teks, contoh ayat & rujukannya.
- Rekam audio qari (4 harakat + sukun per huruf).
- Isi `reportEmail` di `config.json` untuk tombol "Laporkan kesalahan".
- Model 3D prosedural ini sengaja disederhanakan; ganti dengan model 3D artist (lihat bagian di atas).
