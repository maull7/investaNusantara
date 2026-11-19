<?php

namespace App\Enums;

/** Admin areas a Super Admin can open up to a Sub Admin, one by one. */
enum Permission: string
{
    case Articles = 'articles';
    case Categories = 'categories';
    case Users = 'users';
    case Ai = 'ai';
    case Activity = 'activity';
    case Directory = 'directory';
    case Insights = 'insights';
    case Memberships = 'memberships';

    public function label(): string
    {
        return match ($this) {
            self::Articles => 'Kelola semua artikel',
            self::Categories => 'Kategori',
            self::Users => 'Pengguna',
            self::Ai => 'Berita AI',
            self::Activity => 'Log aktivitas',
            self::Directory => 'Direktori daerah',
            self::Insights => 'Media Intelligence',
            self::Memberships => 'Langganan',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Articles => 'Menyunting, menerbitkan, dan mengembalikan artikel siapa pun',
            self::Categories => 'Menambah, mengubah, dan menghapus kategori',
            self::Users => 'Mengelola editor, wartawan, dan kontributor',
            self::Ai => 'Mengatur sumber berita dan antrean Hermes',
            self::Activity => 'Melihat riwayat aktivitas seluruh tim',
            self::Directory => 'Menyusun dan memverifikasi profil, wisata, UMKM, dan event daerah',
            self::Insights => 'Melihat dashboard topik, daerah, kata kunci, dan sentimen berita',
            self::Memberships => 'Menyetujui pengajuan langganan dan mengatur paket serta harga',
        };
    }
}
