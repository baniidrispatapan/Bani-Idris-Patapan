# Bani Idris Patapan — Nasab Explorer v0.4

Tambahan v0.4:
- Login admin menggunakan Supabase Auth
- Tabel `app_admins` untuk whitelist admin
- Antrean verifikasi berdasarkan status
- Edit nama, kode buku, generasi, alamat, kode lokasi, catatan, status verifikasi
- Audit trail otomatis ke `verification_history`
- Riwayat perubahan per orang
- Update hanya bisa dilakukan oleh user yang terdaftar sebagai admin

Setup admin pertama:
1. Buat user di Supabase Authentication > Users.
2. Salin UUID user.
3. Tambahkan ke tabel `public.app_admins`:
   insert into public.app_admins (user_id, display_name)
   values ('UUID_USER', 'Nama Admin');
4. Login dari bagian Admin Verifikasi di aplikasi.

Status yang tersedia:
IMPORTED, UNVERIFIED, NEEDS_CORRECTION, VERIFIED, CONFLICT.
