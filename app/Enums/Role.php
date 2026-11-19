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

    /** Pelanggan only reads the public site; every other role works in the newsroom. */
    public function isStaff(): bool
    {
        return $this !== self::Customer;
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
        };
    }
}
