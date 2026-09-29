# GKJW Google Apps Script Upload

Script ini menerima payload JSON dari route Next.js `/api/upload`, lalu menyimpan file ke Google Drive.

## Deployment

1. Buat project baru di Google Apps Script.
2. Salin isi `Code.gs` ke editor Apps Script.
3. Jalankan fungsi `doPost` hanya melalui Web App deployment.
4. Deploy > New deployment > Web app.
5. Execute as: akun Google pemilik folder Drive.
6. Who has access: Anyone.
7. Salin URL Web App ke environment server sebagai `GAS_UPLOAD_URL`.
8. Folder utama yang digunakan saat ini adalah folder yang diberikan:

	`1VSzwfJKXV6mEG8D-Ktd7ysMfTXuSV2W3`

	 Jika ingin menggantinya, buka Project Settings > Script properties, lalu tambahkan:

		- Property: `FOLDER_UTAMA`
	- Value: ID folder Google Drive utama tempat file GKJW disimpan.

9. Pastikan akun deployment memiliki izin membuat file di Google Drive.
10. Tambahkan Script Property keamanan:

	- Property: `NEXT_UPLOAD_SECRET`
	- Value: secret acak yang sama dengan `GAS_UPLOAD_SECRET` di server Next.js.

	Nama property lama `UPLOAD_SHARED_SECRET` dan `GAS_UPLOAD_SECRET` juga masih didukung. Jangan menambahkan spasi atau tanda kutip pada value.

## Otorisasi Drive

Sebelum mencoba upload dari web app:

1. Di editor Apps Script, pilih fungsi `authorizeDrive`.
2. Klik **Run**.
3. Pilih akun Google yang memiliki folder utama.
4. Izinkan akses Google Drive yang diminta.
5. Buka **Deploy > Manage deployments**.
6. Pastikan **Execute as** adalah **Me**.
7. Pastikan **Who has access** adalah **Anyone**.
8. Klik **Edit** lalu **Deploy** ulang.

Jika `authorizeDrive` gagal, bagikan folder utama kepada akun Google yang digunakan sebagai pemilik/deployer Web App dengan akses **Editor**.

Untuk diagnosis cepat, buka URL Web App dengan browser. Jika berhasil, responsnya berisi `"ok": true` dan nama folder. Jika gagal, berarti deployment GAS belum memiliki akses Drive atau belum memakai versi kode terbaru.

Folder yang dibuat otomatis:

- `[Folder utama]/Artikel Media`: gambar publik artikel.
- `[Folder utama]/Dokumen Artikel`: dokumen pendukung privat.

ID folder dapat diambil dari URL Google Drive:

`https://drive.google.com/drive/folders/ID_FOLDER`

Batas upload saat ini 10 MB. Jangan memasukkan API key atau credential ke script ini.

Di `.env.local` tambahkan konfigurasi berikut tanpa meng-commit nilai secret:

```env
GAS_UPLOAD_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
GAS_UPLOAD_SECRET=isi-dengan-secret-acak-yang-sama
```

Firebase App Hosting juga harus memiliki secret environment variable `GAS_UPLOAD_SECRET`.
