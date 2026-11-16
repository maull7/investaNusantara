<?php

namespace App\Enums;

enum Role: string
{
    case SuperAdmin = 'super_admin';
    case Editor = 'editor';
    case Journalist = 'journalist';
    case Contributor = 'contributor';

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Super Admin',
            self::Editor => 'Editor Daerah',
            self::Journalist => 'Wartawan',
            self::Contributor => 'Kontributor',
        };
    }
}
