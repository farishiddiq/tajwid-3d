# Brief model 3D untuk Tajwid 3D

Dokumen ini untuk 3D artist yang membuat model kepala potongan sagital. Animasinya **tidak** dibuat oleh artist:
posisi lidah, bibir, rahang, dan langit-langit lunak sudah ditentukan oleh data (`src/content/poses.json`) yang
di-review ustadz. Model Anda dipasang di atas data itu. Selama nama dan posisi mengikuti kontrak ini, model
bisa diganti kapan saja tanpa mengubah data pose maupun efek (partikel udara, gelombang suara, titik makhraj).

File contoh yang sudah memenuhi kontrak (buka di Blender untuk melihat struktur):

- `public/models/head-3d.glb` — **model bawaan aplikasi**: kepala 3D utuh dan simetris, dengan lengkung gigi lengkap, langit-langit berbentuk kubah, dan lidah bertulang (dibuat dengan `npm run model:build`). Titik awal terbaik untuk diganti/diperhalus artist.
- `public/models/sample-bones.glb` — lidah dengan 13 tulang (cara yang disarankan)
- `public/models/sample-morphs.glb` — lidah dengan morph target per pose
- `public/models/sample-bones-draco.glb` — sama dengan versi tulang, terkompresi Draco

## 1. Sistem koordinat & skala

| | |
| --- | --- |
| Sumbu | **x = ke depan** (arah bibir), **y = ke atas**, z = ke samping |
| Potongan | **Kepala utuh simetris** terhadap bidang tengah **z = 0** (disarankan) — aplikasi memotongnya sendiri secara sagital dan menggambar penampang padat (tombol "Potongan / Utuh"). Setengah kepala kiri (z ≤ 0) juga diterima. Setiap mesh organ sebaiknya **tertutup rapat** (watertight) agar penampangnya terisi. |
| Skala | 1 unit ≈ 1,6 cm. Tinggi kepala ±10 unit (y −4,4 … 6,0), dari tengkuk ke ujung hidung ±8,6 unit (x −3,6 … 5,0). |
| Titik acuan | Ujung gigi seri atas ±(3,55; −0,07). Bibir atas ±(4,05; 0,5). Engsel langit-langit lunak (0,55; 1,70). Pita suara y = −2,65. |

Blender memakai Z-atas; eksportir glTF Blender (opsi **+Y Up**, bawaan) sudah mengubahnya otomatis.
Kalau model Anda tidak tepat di koordinat ini, itu masih bisa diselaraskan lewat `transform` di
`public/models/model.json` (posisi, rotasi, skala) — tapi posisi tulang lidah harus tetap cocok setelah transform itu.

Bidang potong (z = 0) sebaiknya ditutup dengan permukaan sayatan berwarna lebih terang (gaya buku anatomi), kecuali
kulit (`skin`) yang dibiarkan terbuka agar bagian dalam terlihat.

## 2. Nama node (wajib)

Akhiran gaya Blender seperti `.001` atau `_kiri` boleh. Anak dari sebuah node otomatis ikut organ induknya
(mis. `throat` boleh berisi `throat_pharynx`, `throat_larynx`, `throat_epiglottis`).

| Node | Isi | Gerakan yang dilakukan engine |
| --- | --- | --- |
| `skin` | kulit kepala, setengah kiri | opasitas dari slider (material dibuat transparan otomatis) |
| `palate` | gusi atas + langit-langit keras | diam |
| `velum` | langit-langit lunak + anak lidah | **diputar di sekitar engsel (0,55; 1,70)** hingga 0,38 rad (≈22°) ke bawah saat ghunnah. Origin node bebas. |
| `tongue` | lidah (lihat bagian 3) | dideformasi oleh tulang atau morph target |
| `lips_upper` | bibir atas | digeser (dx, dy) dan sedikit diskalakan saat membulat (و) |
| `lips_lower` | bibir bawah | digeser (dx, dy); **jangan** dijadikan anak `jaw` kecuali memang ingin ikut rahang |
| `incisors_upper` | gigi seri atas | diam |
| `incisors_lower` | gigi seri bawah | ikut rahang (turun sebesar `jaw`) |
| `molars_upper` | gigi geraham atas kiri | diam |
| `molars_lower` | gigi geraham bawah kiri (opsional) | ikut rahang |
| `jaw` | rahang bawah / dasar mulut (opsional) | turun sebesar `jaw` (0 … 0,28 unit). Gigi bawah boleh jadi anaknya. |
| `throat` | dinding faring, laring, epiglotis | diam |
| `vocal_folds_l`, `vocal_folds_r` | pita suara kiri & kanan (atau satu `vocal_folds` untuk model setengah) | **skala z = tingkat penutupan** (0,08 … 1). Origin di dinding samping (z ≈ ∓0,42); mesh memanjang ke arah garis tengah dan menyentuhnya (z = 0) saat skala 1. |
| `nasal` | rongga hidung (volume udara) | diam; sebaiknya material transparan kebiruan |

## 3. Lidah

Pilih **salah satu** cara. Tulang lebih disarankan karena mengikuti data secara langsung dan tetap benar
ketika ustadz mengoreksi angka pose.

### A. 13 tulang (disarankan)

Buat armature dengan 13 tulang bernama persis seperti di bawah. **Kepala (head) tulang** pada pose istirahat
harus berada di titik berikut (bidang tengah, z = 0). Engine memindahkan setiap tulang ke titik kontrol pose
huruf yang sedang diputar; tulang tidak perlu dirotasi. Tulang boleh sejajar (semua anak satu induk) atau berantai.

| Tulang | x | y | Bagian |
| --- | --- | --- | --- |
| `tongue_root` | −0,45 | −1,75 | akar (dekat epiglotis) |
| `tongue_backLow` | −0,62 | −1,00 | pangkal bawah |
| `tongue_backMid` | −0,64 | −0,20 | pangkal tengah (menghadap faring) |
| `tongue_backTop` | −0,42 | 0,55 | pangkal atas |
| `tongue_dorsumBack` | 0,30 | 0,95 | punggung belakang |
| `tongue_dorsumMid` | 1,20 | 1,05 | tengah lidah |
| `tongue_dorsumFront` | 2,10 | 0,85 | punggung depan |
| `tongue_blade` | 2,75 | 0,42 | daun lidah |
| `tongue_tip` | 3,12 | −0,10 | ujung lidah |
| `tongue_underTip` | 2,92 | −0,38 | bawah ujung |
| `tongue_under` | 2,40 | −0,72 | bawah lidah |
| `tongue_floorFront` | 1,60 | −1,10 | dasar depan |
| `tongue_floor` | 0,60 | −1,55 | dasar |

Tips skinning: setiap verteks cukup dipengaruhi 2–3 tulang terdekat dengan bobot halus. Tepi kiri lidah
(z ≈ −1) sebaiknya ikut tulang yang sama dengan potongan tengahnya agar sentuhan ke geraham (ض) tetap terlihat.
Bentuk istirahat ini = posisi netral; jarak antar titik bisa berubah hingga ±0,6 unit saat beranimasi,
jadi beri cukup kepadatan mesh di punggung dan ujung lidah.

### B. Morph target (alternatif)

Satu shape key/morph target per pose, dinamai persis seperti id di `poses.json`, ditambah `raised`
(pangkal lidah terangkat untuk ra/lam jalalah/alif yang tebal):

`glottal`, `glottal_fric`, `pharyngeal`, `uvular_fric`, `qof`, `kaf`, `wasath`, `wasath_fric`, `wasath_glide`,
`dhad`, `lam`, `nun`, `ra`, `nathiyah`, `nathiyah_emph`, `asaliyah`, `asaliyah_emph`, `litsawiyah`,
`litsawiyah_emph`, `labiodental`, `bilabial`, `bilabial_nasal`, `labial_round`, `jauf_a`, `jauf_u`, `jauf_i`, `raised`

Bentuk tiap target harus meniru titik kontrol pose itu (lihat `sample-morphs.glb`). Kekurangannya: setiap
kali angka pose dikoreksi, morph target harus dibuat ulang — karena itu tulang lebih disarankan.

## 4. Anggaran & ekspor

| | Target |
| --- | --- |
| Ukuran file | ≤ 5 MB **terkompresi** (PRD) |
| Kompresi | Draco atau Meshopt (keduanya didukung, decoder disajikan lokal) |
| Segitiga | ≤ 150.000 total (HP Android kelas menengah) |
| Material | PBR metallic-roughness, tanpa tekstur pun boleh; jika pakai tekstur ≤ 1024 px, format KTX2/WebP/JPEG |
| Gaya | semi-realistis bersih, bukan anatomi berdarah (PRD) |
| Format | `.glb` (glTF 2.0 biner) |

Blender → *File › Export › glTF 2.0*: format glTF Binary, +Y Up, centang Shape Keys (jika morph) atau
Skinning (jika tulang), Compression (Draco) aktif.

## 5. Cara menguji model

```bash
npm run model:check -- public/models/kepala.glb
```

Validator memakai kode rig yang sama dengan aplikasi, lalu melaporkan: ukuran, kompresi, jumlah segitiga,
node yang hilang, tulang/morph lidah, posisi istirahat tulang vs titik netral, dan keselarasan koordinat.
Harus **LOLOS** (peringatan boleh, tapi sebaiknya dibereskan).

Lalu lihat di aplikasi tanpa mengubah konfigurasi:

```
http://localhost:5173/?model=models/kepala.glb#/huruf/qof
```

Buka panel **Lapisan → Titik referensi (kalibrasi model)**. Titik biru muda = titik kontrol lidah dari data,
belah ketupat oranye = titik makhraj, cincin ungu = engsel velum, garis putus-putus = jalur udara. Titik lidah
harus menempel di permukaan lidah model dan titik makhraj harus jatuh tepat di organ yang benar
(gusi, gigi, langit-langit, dll.) untuk setiap huruf. Jika semuanya bergeser sama rata, cukup perbaiki
`transform` di `model.json`.

Jika model gagal dimuat, aplikasi otomatis kembali ke model prosedural dan menulis peringatan di console.

## 6. Memasang ke situs

1. Simpan file di `public/models/`, mis. `public/models/kepala.glb`.
2. Di `public/models/model.json` ubah `"url": "models/kepala.glb"` (dan `transform` bila perlu).
3. `npm run build`. Selesai — tidak ada kode, data pose, atau efek yang berubah.
4. Sesuai PRD, posisi organ dasar tetap perlu dicek ahli anatomi/terapis wicara, dan setiap animasi di-review ustadz.
