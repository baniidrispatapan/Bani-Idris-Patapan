# Bani Idris Patapan — Nasab Explorer v0.5

Versi publik yang sudah diperkeras privasinya.

Perubahan v0.5:
- Statistik publik melalui RPC `get_public_stats()`
- Pencarian publik tidak menampilkan alamat
- Profil publik tidak menampilkan alamat, kode lokasi, tanggal lahir/wafat, atau catatan privat
- Pohon silsilah publik tidak mengambil kolom alamat langsung
- Admin tetap dapat melihat dan mengedit data lengkap melalui RPC admin
- Hak SELECT tabel `people` untuk anon/authenticated dibatasi hanya ke kolom publik

Backend: Supabase project `baniidrispatapan`.

Untuk deploy Vercel:
- Framework Preset: Other
- Build Command: kosong/default
- Output Directory: kosong/default
- Root Directory: repository root
