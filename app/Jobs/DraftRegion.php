<?php

namespace App\Jobs;

use App\Enums\NewsTaskStatus;
use App\Models\ArticleReview;
use App\Models\DirectoryEntry;
use App\Models\NewsFetch;
use App\Models\NewsItem;
use App\Models\RegionDraft;
use App\Models\RegionProfile;
use App\Services\NewsPipeline;
use App\Services\NewsPrompts;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Hermes researches one region and drafts its directory: profile facts, tourism, UMKM, events.
 * Everything lands unverified; only sourced items are kept, and a verified profile is never touched.
 */
class DraftRegion extends HermesTask
{
    protected function subject(): ?RegionDraft
    {
        return RegionDraft::with('region.parent')->find($this->subjectId);
    }

    protected function operation(): string
    {
        return 'region';
    }

    protected function runTimeout(): int
    {
        // Several sources per region: give it twice the article budget.
        return 2 * (int) config('hermes.run_timeout');
    }

    protected function prompt(NewsFetch|NewsItem|ArticleReview|RegionDraft $subject): ?string
    {
        /** @var RegionDraft $subject */
        return NewsPrompts::region($subject->region);
    }

    /** @param  array<string, mixed>  $output */
    protected function complete(NewsFetch|NewsItem|ArticleReview|RegionDraft $subject, array $output): void
    {
        /** @var RegionDraft $subject */
        $added = DB::transaction(function () use ($subject, $output) {
            $added = 0;
            $profile = RegionProfile::firstOrNew(['region_code' => $subject->region_code]);
            if (! $profile->verified_at) {
                $facts = $profile->facts ?? [];
                foreach (array_keys(RegionProfile::FACTS) as $key) {
                    $fact = $output['facts'][$key] ?? null;
                    $value = is_array($fact) ? $this->text($fact['value'] ?? null, 200) : null;
                    $source = is_array($fact) ? NewsPipeline::validUrl($fact['source'] ?? null) : null;
                    if ($value && $source) {
                        $facts[$key] = ['value' => $value, 'source' => $source, 'as_of' => $this->text($fact['as_of'] ?? null, 20)];
                        $added++;
                    }
                }
                $description = $this->paragraphs($output['description']['text'] ?? null);
                $descriptionSource = NewsPipeline::validUrl($output['description']['source'] ?? null);
                if ($description && $descriptionSource) {
                    $profile->description = $description;
                    $profile->description_source = $descriptionSource;
                    $added++;
                }
                $profile->facts = $facts ?: null;
                $profile->save();
            }

            $lists = ['wisata' => 'wisata', 'umkm' => 'umkm', 'events' => 'event', 'industri' => 'industri', 'infrastruktur' => 'infrastruktur', 'properti' => 'properti', 'pendidikan' => 'pendidikan'];
            foreach ($lists as $key => $type) {
                foreach (array_slice(is_array($output[$key] ?? null) ? $output[$key] : [], 0, 6) as $item) {
                    $name = is_array($item) ? $this->text($item['name'] ?? null, 200) : null;
                    $source = is_array($item) ? NewsPipeline::validUrl($item['source'] ?? null) : null;
                    $startsOn = $type === 'event' ? $this->date($item['starts_on'] ?? null) : null;
                    if (! $name || ! $source || ($type === 'event' && ! $startsOn)) {
                        continue;
                    }
                    $exists = DirectoryEntry::where('region_code', $subject->region_code)->where('type', $type)
                        ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->exists();
                    if ($exists) {
                        continue;
                    }
                    DirectoryEntry::create([
                        'region_code' => $subject->region_code,
                        'type' => $type,
                        'category' => $type === 'event' && isset(DirectoryEntry::EVENT_CATEGORIES[$item['category'] ?? '']) ? $item['category'] : null,
                        'name' => $name,
                        'organizer' => $type === 'event' ? $this->text($item['organizer'] ?? null, 200) : null,
                        'description' => $this->text($item['description'] ?? null, 600),
                        'address' => $this->text($item['address'] ?? null, 250),
                        'website' => NewsPipeline::validUrl($item['website'] ?? null),
                        'source_url' => $source,
                        'starts_on' => $startsOn,
                        'ends_on' => $type === 'event' ? $this->date($item['ends_on'] ?? null) : null,
                    ]);
                    $added++;
                }
            }

            return $added;
        });

        $subject->update([
            'status' => NewsTaskStatus::Completed,
            'error' => $added === 0 ? 'Hermes tidak menemukan data yang bersumber jelas.' : null,
        ]);
    }

    private function text(mixed $value, int $max): ?string
    {
        return Str::limit(trim(strip_tags((string) (is_scalar($value) ? $value : ''))), $max, '') ?: null;
    }

    private function paragraphs(mixed $value): ?string
    {
        $text = trim(strip_tags(str_replace(['\\n', "\r"], ["\n", ''], is_string($value) ? $value : '')));

        return collect(preg_split('/\n\s*\n|\n/u', $text) ?: [])->map(fn ($p) => trim($p))->filter()->implode("\n\n") ?: null;
    }

    private function date(mixed $value): ?string
    {
        return is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)
            ? rescue(fn () => Carbon::createFromFormat('Y-m-d', $value)->toDateString(), null, false)
            : null;
    }
}
