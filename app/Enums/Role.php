<?php

namespace App\Enums;

enum Role: string
{
    case SuperAdmin = 'super_admin';
    case SubAdmin = 'sub_admin';
    case Editor = 'editor';
    case Journalist = 'journalist';
    case Contributor = 'contributor';
    case Customer = 'customer';
    // Subscriber of Media Intelligence (pemda, perusahaan, konsultan): dashboard only.
    case Client = 'client';

    /** Pelanggan and Klien Data are outside the newsroom; every other role works in it. */
    public function isStaff(): bool
    {
        return ! in_array($this, [self::Customer, self::Client], true);
    }

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Super Admin',
            self::SubAdmin => 'Sub Admin',
            self::Editor => 'Editor Daerah',
            self::Journalist => 'Wartawan',
            self::Contributor => 'Kontributor',
            self::Customer => 'Pelanggan',
            self::Client => 'Klien Data',
        };
    }
}
