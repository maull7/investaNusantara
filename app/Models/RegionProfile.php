<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $region_code
 * @property array<string, array{value: string, source: string|null, as_of: string|null}>|null $facts
 * @property string|null $description
 * @property string|null $description_source
 * @property int|null $verified_by
 * @property Carbon|null $verified_at
 */
class RegionProfile extends Model
{
    /** Fact key => [label, unit]. The order is the order on the page. */
    public const FACTS = [
        'head' => ['Kepala daerah', null],
        'deputy' => ['Wakil kepala daerah', null],
        'capital' => ['Pusat pemerintahan', null],
        'population' => ['Jumlah penduduk', 'jiwa'],
        'area' => ['Luas wilayah', 'km²'],
        'districts' => ['Jumlah kecamatan', null],
        'apbd' => ['APBD', null],
        'website' => ['Situs resmi', null],
        'umk' => ['UMK', 'per bulan'],
        'economic_growth' => ['Pertumbuhan ekonomi', '%'],
        'pdrb' => ['PDRB', null],
        'investment' => ['Realisasi investasi', null],
        'unemployment' => ['Tingkat pengangguran terbuka', '%'],
        'large_industries' => ['Industri besar & sedang', 'unit'],
        'ipm' => ['Indeks Pembangunan Manusia', null],
        'mean_schooling' => ['Rata-rata lama sekolah', 'tahun'],
        'schools' => ['Jumlah sekolah', 'unit'],
        'universities' => ['Perguruan tinggi', 'unit'],
        'tourists' => ['Kunjungan wisatawan', 'orang/tahun'],
    ];

    /**
     * "Pusat Data Daerah" topic pages: which facts and entry types each shows,
     * and which news category feeds its related articles.
     */
    public const TOPICS = [
        'investasi' => ['label' => 'Investasi', 'facts' => ['umk', 'economic_growth', 'pdrb', 'investment', 'population', 'unemployment'], 'types' => ['industri', 'infrastruktur'], 'category' => 'ekonomi'],
        'industri' => ['label' => 'Industri', 'facts' => ['large_industries', 'umk', 'economic_growth', 'population'], 'types' => ['industri'], 'category' => 'ekonomi'],
        'properti' => ['label' => 'Properti', 'facts' => ['population', 'area', 'economic_growth'], 'types' => ['properti', 'infrastruktur'], 'category' => 'ekonomi'],
        'pendidikan' => ['label' => 'Pendidikan', 'facts' => ['ipm', 'mean_schooling', 'schools', 'universities', 'population'], 'types' => ['pendidikan'], 'category' => 'pendidikan'],
        'pariwisata' => ['label' => 'Pariwisata', 'facts' => ['tourists', 'population', 'area'], 'types' => ['wisata', 'event'], 'category' => 'pariwisata'],
    ];

    /** Facts that make sense in a nationwide ranking (/data/{fact}). */
    public const COMPARABLE = ['umk', 'ipm', 'economic_growth', 'unemployment', 'population', 'mean_schooling'];

    /** "Rp 5.343.430" / "5,12" / "1.052.359 jiwa" => float, for sorting rankings; null when no number. */
    public static function number(string $value): ?float
    {
        if (! preg_match('/\d[\d.,]*/', $value, $m)) {
            return null;
        }
        $n = $m[0];
        // Indonesian notation: "." groups thousands, "," is the decimal mark.
        $n = preg_match('/^\d{1,3}(\.\d{3})+(,\d+)?$/', $n) ? str_replace(['.', ','], ['', '.'], $n) : str_replace(',', '.', $n);

        return is_numeric($n) ? (float) $n : null;
    }

    protected $primaryKey = 'region_code';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['facts' => 'array', 'verified_at' => 'datetime'];
    }

    /** @return BelongsTo<Region, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'region_code');
    }

    /** @return BelongsTo<User, $this> */
    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
