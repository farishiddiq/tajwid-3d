# PRD — Tajwid 3D: Makhraj & Sifat Huruf Interaktif

Oct 23, 2026 · @faris shiddiq · Status: Draft v0.1 (menunggu approval)

## Ringkasan

Tajwid 3D adalah website belajar tajwid yang menampilkan bagian dalam mulut, tenggorokan, dan hidung dalam model 3D yang bisa diputar, di-zoom, dan dianimasikan. Fase 1 hanya mencakup dua materi: **makharijul huruf** (17 tempat keluar huruf) dan **sifat huruf** (termasuk tafkhim/tarqiq seperti ra tebal dan ra tipis).

**Masalahnya:** selama ini orang belajar tajwid hanya dengan mendengar dan meniru. Apa yang terjadi di dalam mulut tidak terlihat, jadi orang awam sulit membedakan huruf yang mirip (ح vs ه, س vs ص vs ث, ت vs ط) dan sulit memahami istilah seperti *jahr*, *syiddah*, atau *isti'la*.

**Solusinya:** setiap huruf punya animasi 3D yang menunjukkan posisi lidah, titik sentuh, aliran udara, getaran pita suara, dan aliran ke hidung, disinkronkan dengan audio qari. Pengguna bisa memutar ulang, memperlambat, dan membandingkan dua huruf berdampingan.

## Tujuan, non-goals, dan target pengguna

**Tujuan fase 1**

1. Pengguna awam bisa menunjuk di model 3D di mana makhraj suatu huruf, untuk ke-28 huruf hijaiyah plus huruf mad.
2. Pengguna bisa menjelaskan beda dua huruf yang mirip setelah melihat mode bandingkan.
3. Pengguna paham arti tiap sifat huruf dari visualnya, bukan hanya hafal daftar hurufnya.
4. Guru/ustadz bisa memakai website ini sebagai alat peraga saat mengajar (di layar/proyektor).

**Non-goals fase 1**

- Hukum nun mati/tanwin, mim mati, mad, waqaf, dan bab tajwid lain (fase berikutnya).
- Koreksi bacaan otomatis lewat mikrofon/speech recognition.
- Simulasi anatomi yang akurat secara medis; modelnya disederhanakan agar mudah dipahami.
- Aplikasi native iOS/Android; fase 1 web saja.

**Target pengguna**

| Persona | Kebutuhan utama | Konteks pakai |
| --- | --- | --- |
| Pemula dewasa (belajar ngaji dari nol atau memperbaiki bacaan) | Penjelasan bahasa Indonesia sederhana, visual jelas, bisa diulang | HP, belajar mandiri |
| Santri/pelajar TPA–SMA | Materi ringkas, latihan, hafalan pengelompokan huruf | HP/laptop |
| Guru ngaji/ustadz | Alat peraga di kelas, mode presentasi, bandingkan huruf | Laptop + proyektor/TV |

## Ruang lingkup konten

Konten mengikuti riwayat Hafs 'an 'Ashim dan pembagian 17 makhraj menurut Imam Ibnul Jazari (Matan Al-Jazariyah). Semua isi tabel di bawah wajib divalidasi ustadz bersanad sebelum rilis.

### A. Makharijul huruf: 5 area, 17 makhraj

| No | Area | Titik makhraj | Huruf | Animasi kunci |
| --- | --- | --- | --- | --- |
| 1 | Al-Jauf (rongga mulut & tenggorokan) | Rongga kosong, tanpa titik sentuh | Huruf mad: ا و ي | Udara mengalir bebas, lidah & bibir tidak menyentuh |
| 2 | Al-Halq | Pangkal tenggorokan (aqshal halq) | ء ه | Penutupan/penyempitan di dekat pita suara |
| 3 | Al-Halq | Tengah tenggorokan (wasathul halq) | ع ح | Penyempitan di faring tengah |
| 4 | Al-Halq | Ujung tenggorokan (adnal halq) | غ خ | Penyempitan di dekat anak lidah |
| 5 | Al-Lisan | Pangkal lidah + langit-langit lunak | ق | Pangkal lidah naik paling belakang |
| 6 | Al-Lisan | Pangkal lidah sedikit ke depan + langit-langit | ك | Bandingkan langsung dengan ق |
| 7 | Al-Lisan | Tengah lidah + langit-langit keras | ج ش ي (bukan mad) | Tengah lidah naik |
| 8 | Al-Lisan | Tepi lidah + gigi geraham atas | ض | Tepi lidah kiri/kanan/keduanya menempel |
| 9 | Al-Lisan | Tepi lidah depan + gusi | ل | Udara lewat sisi lidah |
| 10 | Al-Lisan | Ujung lidah, sedikit di bawah makhraj lam | ن | Udara diarahkan ke hidung (ghunnah) |
| 11 | Al-Lisan | Ujung lidah + punggung lidah dekat gusi | ر | Getar ringan ujung lidah |
| 12 | Al-Lisan | Ujung lidah + pangkal gigi seri atas | ت د ط | Ujung lidah menekan lalu dilepas |
| 13 | Al-Lisan | Ujung lidah + dekat gigi seri bawah | ص س ز | Celah sempit, desis (shafir) |
| 14 | Al-Lisan | Ujung lidah + ujung gigi seri atas | ث ذ ظ | Ujung lidah sedikit keluar |
| 15 | Asy-Syafatain | Bibir bawah bagian dalam + ujung gigi seri atas | ف | Bibir bawah menyentuh gigi atas |
| 16 | Asy-Syafatain | Dua bibir | ب م و (bukan mad) | ب & م bibir rapat, و bibir membulat |
| 17 | Al-Khaisyum (rongga hidung) | Pangkal hidung | Ghunnah (ن & م) | Aliran udara dibelokkan ke hidung |

Catatan: ada pendapat lain (16 atau 14 makhraj). Aplikasi memakai 17 sebagai default dan cukup memberi satu catatan info tentang perbedaan ini.

### B. Sifat huruf

**Sifat yang berpasangan (setiap huruf pasti punya satu dari tiap pasangan)**

| Sifat | Arti singkat | Huruf | Visual pembeda |
| --- | --- | --- | --- |
| Hams | Napas mengalir saat huruf diucapkan | ف ح ث ه ش خ ص س ك ت | Partikel udara terus keluar |
| Jahr | Napas tertahan | Selain huruf hams | Partikel udara berhenti, pita suara bergetar |
| Syiddah | Suara tertahan | أ ج د ق ط ب ك ت | Titik sentuh menutup rapat, gelombang suara berhenti |
| Tawassuth | Suara setengah tertahan | ل ن ع م ر | Gelombang suara mengalir sebagian |
| Rakhawah | Suara mengalir | Selain dua kelompok di atas | Gelombang suara mengalir penuh |
| Isti'la | Pangkal lidah terangkat (tebal) | خ ص ض غ ط ق ظ | Pangkal lidah naik ke langit-langit |
| Istifal | Lidah turun (tipis) | Selain huruf isti'la | Pangkal lidah turun |
| Ithbaq | Lidah melekat ke langit-langit | ص ض ط ظ | Permukaan lidah menempel luas |
| Infitah | Ada celah lidah–langit-langit | Selain huruf ithbaq | Celah terlihat |
| Idzlaq | Ringan, dari ujung lidah/bibir | ف ر م ن ل ب | Highlight ujung lidah & bibir |
| Ishmat | Lebih berat diucapkan | Selain huruf idzlaq | Highlight area lain |

**Sifat yang tidak berpasangan**

| Sifat | Huruf | Visual pembeda |
| --- | --- | --- |
| Shafir (desis) | ص س ز | Aliran udara sempit di gigi depan + efek desis |
| Qalqalah (pantulan) | ق ط ب ج د | Pantulan saat titik sentuh dilepas (hanya saat sukun) |
| Lin (lunak) | و ي sukun setelah fathah | Udara lembut tanpa sentuhan |
| Inhiraf (berbelok) | ل ر | Arah aliran udara membelok |
| Takrir (berulang) | ر | Ujung lidah cenderung bergetar (yang harus dihindari berlebihan) |
| Tafasysyi (menyebar) | ش | Udara menyebar di rongga mulut |
| Istithalah (memanjang) | ض | Suara memanjang sepanjang tepi lidah |

### C. Tafkhim & tarqiq (sifat 'aridhah)

Masuk fase 1 karena sangat sering ditanyakan:

- **Ra tebal vs ra tipis:** semua kondisi tafkhim dan tarqiq ra, plus kondisi yang boleh keduanya, masing-masing dengan contoh ayat.
- **Lam pada lafzhul jalalah:** tebal setelah fathah/dhammah, tipis setelah kasrah.
- **Alif mad:** mengikuti tebal/tipis huruf sebelumnya.
- Tingkatan tafkhim huruf isti'la (berdasarkan harakat) ditampilkan sebagai info tambahan.

## Fitur & kebutuhan fungsional

Prioritas: **P0** = wajib ada di MVP, **P1** = rilis fase 1 lengkap, **P2** = nanti.

| ID | Fitur | Deskripsi | Prioritas |
| --- | --- | --- | --- |
| F1 | Viewer 3D organ bicara | Model potongan kepala (setengah sagital) berisi bibir, gigi seri & geraham, gusi, langit-langit keras & lunak, anak lidah, lidah (ujung, tepi, tengah, pangkal), tenggorokan, pita suara, rongga hidung | P0 |
| F2 | Kontrol kamera | Rotate, zoom, pan (mouse & sentuh/pinch); tombol preset sudut: samping, depan, atas, dalam mulut; tombol reset | P0 |
| F3 | Layer & transparansi | Toggle tampil/sembunyi tiap organ; slider transparansi kulit/pipi agar lidah terlihat dari luar | P0 |
| F4 | Animasi per huruf | Lidah & bibir bergerak ke posisi huruf, titik sentuh menyala, aliran udara terlihat; huruf diucapkan dalam bentuk sukun didahului hamzah berharakat (mis. أَبْ) seperti cara tes makhraj tradisional | P0 |
| F5 | Kontrol pemutaran | Play/pause, ulang, kecepatan 0.25x/0.5x/1x, geser timeline per fase (persiapan → sentuh → lepas), loop | P0 |
| F6 | Audio qari sinkron | Rekaman per huruf (sukun, fathah, kasrah, dhammah) sinkron dengan animasi; audio ikut diperlambat tanpa mengubah nada | P0 |
| F7 | Jelajah per huruf | Grid 28 huruf hijaiyah + huruf mad; kartu huruf berisi makhraj, daftar sifat, animasi, audio, kesalahan umum | P0 |
| F8 | Jelajah per makhraj | Peta 5 area → 17 titik; klik titik di model 3D atau daftar untuk melihat huruf-hurufnya; tombol "putar semua huruf di area ini" | P0 |
| F9 | Jelajah per sifat | Pilih sifat → huruf yang memilikinya menyala di grid; animasi khusus yang menjelaskan sifat itu (mis. jahr: pita suara bergetar) | P0 |
| F10 | Mode bandingkan | Dua viewer berdampingan dengan kamera tersinkron: ra tebal vs ra tipis, س vs ص, ت vs ط, ذ vs ز, ح vs ه, ك vs ق, ء vs ع | P1 |
| F11 | Tafkhim & tarqiq | Modul ra, lam jalalah, dan alif dengan kondisi, contoh ayat, dan animasi pangkal lidah naik/turun | P1 |
| F12 | Kuis & latihan | Tebak makhraj dari animasi, tebak huruf dari audio, pilih huruf dengan sifat tertentu, cocokkan pasangan sifat | P1 |
| F13 | Mode guru/presentasi | Layar penuh, teks besar, kontrol keyboard, sembunyikan UI tambahan | P1 |
| F14 | Progress belajar | Tandai huruf/sifat yang sudah dipelajari, simpan di perangkat; akun opsional | P2 |
| F15 | Rekam suara sendiri | Pengguna merekam lalu memutar berdampingan dengan audio qari (tanpa penilaian otomatis) | P2 |
| F16 | Mode offline (PWA) | Konten bisa diunduh untuk dipakai tanpa internet | P2 |

**Alur utama pengguna**

1. Buka beranda → pilih "Makhraj", "Sifat", atau langsung klik satu huruf.
2. Kartu huruf terbuka → animasi 3D berjalan otomatis sekali dengan audio.
3. Pengguna memutar model, memperlambat ke 0.25x, menyalakan transparansi.
4. Dari kartu, pengguna lompat ke huruf satu makhraj atau ke huruf pembanding.
5. Akhiri dengan kuis singkat 3–5 soal.

**Isi setiap kartu huruf:** nama & bentuk huruf, makhraj (area + titik), semua sifat lazimah, animasi, audio 4 harakat, kesalahan umum orang Indonesia (mis. ع dibaca seperti ء, ح seperti ه, ث seperti س, ض seperti د/ل), dan huruf yang sering tertukar.

## Bahasa visual animasi 3D

Setiap fenomena punya satu warna dan satu gaya animasi yang konsisten di seluruh website, supaya pengguna cukup belajar "kodenya" sekali. Warna final ditentukan desainer; yang wajib adalah konsistensi dan tetap terbaca oleh pengguna buta warna (selalu ada bentuk/gerak pembeda, bukan warna saja).

| Fenomena | Representasi visual | Dipakai untuk |
| --- | --- | --- |
| Titik makhraj | Titik bercahaya + label di permukaan organ | Semua huruf |
| Aliran udara dari paru-paru | Partikel/garis mengalir | Hams vs jahr, rakhawah, tafasysyi |
| Udara tertahan | Partikel berhenti dan menumpuk di titik sentuh | Jahr, syiddah |
| Gelombang suara | Gelombang yang mengalir, terpotong, atau setengah | Syiddah, tawassuth, rakhawah |
| Getaran pita suara | Pita suara bergetar + ikon getar | Jahr |
| Aliran ke hidung | Partikel berbelok ke rongga hidung | Ghunnah, nun, mim |
| Pangkal lidah naik | Pangkal lidah terangkat + rongga mulut menyempit | Isti'la, tafkhim, ra tebal |
| Lidah melekat | Permukaan kontak luas menyala | Ithbaq |
| Pantulan | Lidah/bibir memantul saat lepas + riak kecil | Qalqalah |
| Desis | Aliran sempit dan cepat di gigi depan | Shafir |
| Udara berbelok | Panah aliran membelok di sisi lidah | Inhiraf (ل ر) |

**Prinsip animasi**

- Setiap animasi dibagi 3 fase yang bisa dilompati: persiapan posisi → kontak/penyempitan → pelepasan.
- Gerakan sedikit dilebihkan agar jelas, tapi posisi akhir harus tetap benar menurut ustadz.
- Label organ muncul saat di-hover/ditap; tidak memenuhi layar secara default.
- Gaya: semi-realistis bersih (bukan anatomi berdarah), ramah untuk anak dan dewasa.

## Kebutuhan non-fungsional & teknis

| Aspek | Kebutuhan |
| --- | --- |
| Perangkat | Utama: HP Android kelas menengah (RAM 4 GB) di Chrome; juga desktop Chrome, Safari, Firefox, Edge |
| Performa | Animasi ≥ 30 fps di HP menengah, ≥ 60 fps di laptop |
| Waktu muat | Halaman pertama interaktif < 4 detik di 4G; model 3D utama ≤ 5 MB terkompresi; audio dimuat per huruf saat dibutuhkan |
| Fallback | Jika WebGL tidak tersedia/terlalu lambat: tampilkan video atau ilustrasi 2D potongan samping dengan audio yang sama |
| Bahasa | Antarmuka Bahasa Indonesia; teks Arab dengan font mushaf yang jelas dan harakat lengkap; transliterasi Latin opsional |
| Aksesibilitas | Kontrol keyboard, teks alternatif untuk tiap animasi, kontras cukup, tidak bergantung pada warna saja |
| Akun | Fase 1 tanpa login; progress disimpan di perangkat |

**Usulan arsitektur (dibahas detail di dokumen plan)**

- **Frontend:** React + Three.js (via React Three Fiber) untuk viewer 3D.
- **Aset 3D:** dimodelkan di Blender, diekspor sebagai glTF/GLB terkompresi (Draco/Meshopt). Bentuk lidah memakai *shape keys/morph targets* per posisi huruf, sehingga satu model bisa membentuk semua huruf.
- **Efek:** partikel aliran udara dan gelombang suara dibuat di kode (shader/partikel), bukan dipanggang di model, agar bisa diatur per sifat.
- **Konten berbasis data:** setiap huruf, makhraj, dan sifat didefinisikan dalam file JSON (posisi lidah, titik sentuh, sifat, audio, teks). Menambah atau mengoreksi konten tidak perlu ubah kode, dan memudahkan review ustadz.
- **Audio:** Web Audio API dengan perlambatan tanpa ubah nada (time-stretch).
- **Hosting:** situs statis + CDN; PWA di fase P2.

## Validasi konten

Karena ini materi Al-Qur'an, akurasi konten adalah syarat rilis, bukan tambahan.

- Minimal 1 ustadz bersanad (riwayat Hafs) me-review setiap animasi, teks, dan audio sebelum tayang.
- Rekaman audio oleh qari bersanad, direkam di studio, 4 harakat + sukun per huruf.
- Konsultasi singkat dengan ahli anatomi/terapis wicara untuk posisi organ dasar.
- Referensi utama: Matan Al-Jazariyah dan syarahnya; buku tajwid standar yang dipakai di Indonesia.
- Ada tombol "Laporkan kesalahan" di setiap kartu huruf.

## Metrik sukses

| Metrik | Target 3 bulan setelah rilis |
| --- | --- |
| Skor kuis makhraj sebelum vs sesudah belajar | Naik ≥ 30 poin persentase |
| Pengguna yang membuka ≥ 5 huruf dalam satu sesi | ≥ 50% |
| Penggunaan fitur interaksi 3D (rotate/zoom/perlambat) per sesi | ≥ 70% sesi |
| Kesalahan konten yang dilaporkan dan terkonfirmasi | 0 kesalahan fatal; perbaikan < 7 hari |
| Guru yang memakai di kelas (survei) | ≥ 20 guru di fase uji coba |

## Tahapan rilis

1. **Prototipe (validasi ide):** viewer 3D + 3 huruf contoh (ب, ق, ع) + 1 sifat (jahr/hams); uji ke 5–10 pemula dan 1–2 ustadz.
2. **MVP:** semua 17 makhraj, semua huruf, jelajah per huruf/makhraj (F1–F8).
3. **Fase 1 lengkap:** semua sifat, tafkhim/tarqiq, mode bandingkan, kuis, mode guru (F9–F13).
4. **Lanjutan:** progress, rekam suara, offline, lalu bab tajwid berikutnya.

Gerbang antar tahap: lolos review ustadz dan uji performa di HP menengah.

## Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Animasi tidak akurat secara syar'i atau anatomi | Kepercayaan hilang, salah ajar | Review ustadz wajib per huruf; konten berbasis data agar mudah dikoreksi |
| Produksi model & animasi 3D mahal dan lama | Jadwal molor | Satu model dengan morph targets; mulai dari prototipe 3 huruf |
| Lambat di HP murah | Pengguna utama tidak bisa pakai | Budget ukuran aset, mode kualitas rendah, fallback 2D/video |
| Perbedaan pendapat ulama (jumlah makhraj, detail sifat) | Kebingungan/kritik | Pakai satu rujukan konsisten, beri catatan perbedaan secukupnya |
| Scope melebar ke semua bab tajwid | MVP tidak selesai | Non-goals dikunci; bab lain masuk roadmap |

## Pertanyaan terbuka

- [ ] Siapa ustadz/qari yang akan me-review dan merekam audio?
- [ ] Budget dan tim: bikin model 3D sendiri, sewa 3D artist, atau beli aset anatomi lalu dimodifikasi?
- [ ] Gratis sepenuhnya, donasi/wakaf, atau ada fitur berbayar?
- [ ] Target rilis MVP kapan?
- [ ] Perlu versi bahasa Inggris/Arab di fase awal?
- [ ] Nama produk dan domain?
