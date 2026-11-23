# Deploy dengan Docker Compose

Satu VPS, berdampingan dengan Hermes, MySQL dan Nginx yang sudah ada di server.

```
Pengunjung ──► Nginx host (domain) ──► ./socket/app.sock  app (FrankenPHP)
                                            │
          horizon (antrean)  scheduler ─────┤ network host
                                            ├─► /var/run/mysqld  MySQL host (socket)
                                            ├─► 127.0.0.1:8642  Hermes host
                                            └─► 127.0.0.1:6380  redis (container)
```

| Service     | Isi                                                                |
|-------------|--------------------------------------------------------------------|
| `app`       | Web (FrankenPHP). Menjalankan migrasi saat start (`RUN_MIGRATIONS`). |
| `horizon`   | Worker antrean, termasuk berita AI Hermes. Dashboard: `/horizon`.   |
| `scheduler` | `schedule:work`: jadwal ambil berita + pulihkan tugas macet.        |
| `redis`     | Antrean, cache, session. Data di volume `redis`.                    |

Container PHP memakai `network_mode: host`, karena MySQL dan Hermes di server
hanya mendengar di `127.0.0.1`. MySQL dihubungi lewat socket
`/var/run/mysqld/mysqld.sock` yang di-mount ke container, jadi user MySQL-nya
`'user'@'localhost'`. Upload (`storage/`) disimpan di volume `storage`.

## 1. Pertama kali di server

```bash
git clone <repo> /var/www/investanusantara && cd /var/www/investanusantara
cp .env.production.example .env
install -d -m 0777 socket   # folder unix socket web, dibaca Nginx host
```

Isi `.env`: `APP_URL`, `DB_*`, `HERMES_TOKEN`. Lalu buat `APP_KEY`:

```bash
echo "base64:$(openssl rand -base64 32)"
```

Tempel hasilnya ke `APP_KEY=` di `.env`.

Buat database dan user MySQL (sekali saja):

```sql
CREATE DATABASE investanusantara CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'investanusantara'@'127.0.0.1' IDENTIFIED BY 'password-kuat';
GRANT ALL PRIVILEGES ON investanusantara.* TO 'investanusantara'@'127.0.0.1';
```

Jalankan:

```bash
docker compose up -d --build
docker compose run --rm app php artisan db:seed --force   # wilayah, kategori, akun awal (sekali)
```

Seeder membuat satu akun Super Admin `admin@nusantaranews.test` dan **mencetak password
acaknya sekali** di terminal. Catat, login, lalu ganti email/password-nya. Di production
seeder tidak membuat akun demo dan tidak membuat berita dummy.

## 2. Nginx host (sites-enabled)

App tidak membuka port TCP. Nginx host mem-proxy domain ke unix socket
`socket/app.sock`. Template siap pakai: `docker/nginx.conf`.

```bash
sudo cp docker/nginx.conf /etc/nginx/sites-available/investanusantara
sudo sed -i 's/DOMAIN/domain-anda.com/g; s#PROJECT#/var/www/investanusantara#g' /etc/nginx/sites-available/investanusantara
sudo ln -sf /etc/nginx/sites-available/investanusantara /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d domain-anda.com -d www.domain-anda.com   # HTTPS, sekali
```

`APP_URL` di `.env` harus `https://domain-anda.com`. Hapus site Nginx lama yang
`listen` di port khusus (mis. 8081) atau yang menunjuk ke PHP-FPM, lalu tutup port
itu di firewall (`sudo ufw delete allow 8081`).

## 3. Update / redeploy

```bash
git pull
docker compose up -d --build
```

Container `app` menjalankan migrasi lalu menyalakan web; `horizon` menunggu job yang
sedang berjalan selesai (maks. 2 menit) sebelum diganti.

## Perintah berguna

```bash
docker compose ps                         # status
docker compose logs -f app horizon        # log
docker compose exec app php artisan tinker
docker compose exec app php artisan news:backfill-images
docker compose restart horizon            # setelah ubah .env
```

Setelah mengubah `.env`, jalankan `docker compose up -d` (bukan hanya restart) agar
konfigurasi baru dibaca dan cache konfigurasi dibangun ulang.

## Catatan

- Web app tidak membuka port TCP sama sekali (hanya `socket/app.sock`). Redis tetap di
  `127.0.0.1:${DOCKER_REDIS_PORT}` (6380), tidak terbuka ke internet.
- Backup: database lewat `mysqldump` seperti biasa; file upload ada di volume
  `investanusantara_storage` (`docker run --rm -v investanusantara_storage:/s -v $PWD:/b alpine tar czf /b/storage.tgz -C /s .`).
- Hermes dihubungi lewat `127.0.0.1:8642` langsung, jadi tidak ada SSH tunnel yang bisa putus.
