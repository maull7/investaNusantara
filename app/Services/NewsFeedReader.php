<?php

namespace App\Services;

use App\Jobs\DiscoverNews;
use App\Models\NewsItem;
use App\Models\NewsSource;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use SimpleXMLElement;
use Throwable;

/**
 * Finds the latest articles of a site through the channels publishers offer to
 * machines: RSS/Atom feeds and (news) sitemaps. Costs no AI tokens and works on
 * sites whose pages turn bots away but publish a feed.
 *
 * It only uses public, published channels with an honest user agent and honours
 * robots.txt. It never disguises itself as a browser or works around blocks.
 */
class NewsFeedReader
{
    /** Common feed locations, tried after the ones the site announces. */
    private const COMMON_PATHS = ['/rss', '/feed', '/rss.xml', '/feed.xml', '/atom.xml', '/index.xml', '/feed/rss', '/rss/'];

    /**
     * @return array{via: 'rss'|'sitemap', feed_url: string, articles: list<array{url: string, title: string, published_at: string|null, image_url: string|null, excerpt: string|null}>}|null
     */
    public function discover(NewsSource $source): ?array
    {
        $deadline = microtime(true) + 45; // stay well inside the job timeout
        foreach ($this->candidates($source) as $url) {
            if (microtime(true) > $deadline) {
                break;
            }
            $found = $this->read($url, $source->max_articles);
            if ($found && $found['articles'] !== []) {
                return ['via' => $found['via'], 'feed_url' => $url, 'articles' => $found['articles']];
            }
        }

        return null;
    }

    /**
     * Saved feed first, then the source URL itself (it may be a feed), feeds announced
     * in the page's <head>, common paths, and sitemaps listed in robots.txt.
     *
     * @return list<string>
     */
    private function candidates(NewsSource $source): array
    {
        $origin = $this->origin($source->url);
        $list = array_filter([$source->feed_url, $source->url]);

        $page = $this->get($source->url);
        if ($page && ! $this->isXml($page)) {
            preg_match_all('/<link\b[^>]*type=["\']application\/(?:rss|atom)\+xml["\'][^>]*>/i', $page, $links);
            foreach ($links[0] as $tag) {
                if (preg_match('/href=["\']([^"\']+)["\']/i', $tag, $href)) {
                    $list[] = $this->absolute(html_entity_decode($href[1]), $source->url);
                }
            }
        }
        foreach (self::COMMON_PATHS as $path) {
            $list[] = $origin.$path;
        }
        foreach ($this->robots($origin)['sitemaps'] as $sitemap) {
            $list[] = $sitemap;
        }

        return array_values(array_unique($list));
    }

    /**
     * @return array{via: 'rss'|'sitemap', articles: list<array{url: string, title: string, published_at: string|null, image_url: string|null, excerpt: string|null}>}|null
     */
    public function read(string $url, int $limit, int $depth = 0): ?array
    {
        $body = $this->get($url);
        if (! $body || ! $this->isXml($body)) {
            return null;
        }
        $xml = rescue(fn () => new SimpleXMLElement($body, LIBXML_NONET | LIBXML_NOCDATA), null, false);
        if (! $xml) {
            return null;
        }

        return match ($xml->getName()) {
            'rss', 'RDF' => ['via' => 'rss', 'articles' => $this->rss($xml, $limit)],
            'feed' => ['via' => 'rss', 'articles' => $this->atom($xml, $limit)],
            'urlset' => ['via' => 'sitemap', 'articles' => $this->sitemap($xml, $limit)],
            // Sitemap index: follow its newest child (news sitemaps first), one level deep.
            'sitemapindex' => $depth === 0 ? $this->sitemapIndex($xml, $limit) : null,
            default => null,
        };
    }

    /** @return list<array{url: string, title: string, published_at: string|null, image_url: string|null, excerpt: string|null}> */
    private function rss(SimpleXMLElement $xml, int $limit): array
    {
        $items = $xml->channel->item ?? $xml->item ?? [];
        $out = [];
        foreach ($items as $item) {
            $media = $item->children('http://search.yahoo.com/mrss/');
            $content = (string) $item->children('http://purl.org/rss/1.0/modules/content/')->encoded;
            $description = (string) $item->description;
            $out[] = $this->article(
                (string) $item->link,
                (string) $item->title,
                (string) ($item->pubDate ?: $item->children('http://purl.org/dc/elements/1.1/')->date),
                (string) ($item->enclosure['url'] ?? '') ?: (string) ($media->content?->attributes()['url'] ?? '') ?: (string) ($media->thumbnail?->attributes()['url'] ?? '') ?: $this->firstImage($content.$description),
                $content ?: $description,
            );
        }

        return $this->newest($out, $limit);
    }

    /** @return list<array{url: string, title: string, published_at: string|null, image_url: string|null, excerpt: string|null}> */
    private function atom(SimpleXMLElement $xml, int $limit): array
    {
        $out = [];
        foreach ($xml->entry as $entry) {
            $link = '';
            foreach ($entry->link as $l) {
                if (in_array((string) $l['rel'], ['', 'alternate'], true)) {
                    $link = (string) $l['href'];
                    break;
                }
            }
            $content = (string) ($entry->content ?: $entry->summary);
            $out[] = $this->article($link, (string) $entry->title, (string) ($entry->published ?: $entry->updated), $this->firstImage($content), $content);
        }

        return $this->newest($out, $limit);
    }

    /** @return list<array{url: string, title: string, published_at: string|null, image_url: string|null, excerpt: string|null}> */
    private function sitemap(SimpleXMLElement $xml, int $limit): array
    {
        $out = [];
        foreach ($xml->url as $entry) {
            $news = $entry->children('http://www.google.com/schemas/sitemap-news/0.9')->news;
            $image = $entry->children('http://www.google.com/schemas/sitemap-image/1.1')->image;
            $title = (string) ($news->title ?? '');
            $out[] = $this->article(
                (string) $entry->loc,
                // Plain sitemaps carry no titles; the slug is a readable stand-in until Hermes writes the real one.
                $title !== '' ? $title : Str::headline(basename((string) parse_url((string) $entry->loc, PHP_URL_PATH))),
                (string) ($news->publication_date ?? '') ?: (string) $entry->lastmod,
                (string) ($image->loc ?? '') ?: null,
                null,
            );
        }

        // Plain sitemaps without dates are not "latest news"; skip them.
        $dated = array_values(array_filter($out, fn ($a) => $a['published_at'] !== null));

        return $this->newest($dated, $limit);
    }

    /** @return array{via: 'rss'|'sitemap', articles: list<array{url: string, title: string, published_at: string|null, image_url: string|null, excerpt: string|null}>}|null */
    private function sitemapIndex(SimpleXMLElement $xml, int $limit): ?array
    {
        $children = [];
        foreach ($xml->sitemap as $sitemap) {
            $loc = (string) $sitemap->loc;
            $children[] = ['loc' => $loc, 'score' => (str_contains(strtolower($loc), 'news') ? 1 : 0).'|'.(string) $sitemap->lastmod];
        }
        usort($children, fn ($a, $b) => strcmp($b['score'], $a['score']));

        foreach (array_slice($children, 0, 2) as $child) {
            if (($found = $this->read($child['loc'], $limit, 1)) && $found['articles'] !== []) {
                return $found;
            }
        }

        return null;
    }

    /** @return array{url: string, title: string, published_at: string|null, image_url: string|null, excerpt: string|null} */
    private function article(string $url, string $title, string $date, ?string $image, ?string $excerpt): array
    {
        $text = $excerpt ? trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($excerpt))) ?? '') : '';

        return [
            'url' => trim($url),
            'title' => Str::limit(trim(html_entity_decode(strip_tags($title))), 250, ''),
            'published_at' => $date !== '' ? rescue(fn () => now()->parse($date)->toIso8601String(), null, false) : null,
            'image_url' => NewsPipeline::validUrl($image),
            'excerpt' => $text !== '' ? Str::limit($text, 4000) : null,
        ];
    }

    /**
     * @param  list<array{url: string, title: string, published_at: string|null, image_url: string|null, excerpt: string|null}>  $articles
     * @return list<array{url: string, title: string, published_at: string|null, image_url: string|null, excerpt: string|null}>
     */
    private function newest(array $articles, int $limit): array
    {
        $articles = array_values(array_filter($articles, fn ($a) => $a['url'] !== '' && $a['title'] !== ''));
        usort($articles, fn ($a, $b) => strcmp((string) $b['published_at'], (string) $a['published_at']));

        return array_slice($articles, 0, $limit);
    }

    private function firstImage(string $html): ?string
    {
        return preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', $html, $m) ? html_entity_decode($m[1]) : null;
    }

    private function isXml(string $body): bool
    {
        return (bool) preg_match('/^\s*(<\?xml|<rss|<feed|<urlset|<sitemapindex|<rdf:RDF)/i', $body);
    }

    /**
     * Cover photo for an article that came without one: its entry in the site's feed,
     * else the og:image / twitter:image the page publishes for link previews.
     */
    public function imageFor(string $articleUrl, ?string $feedUrl = null): ?string
    {
        if ($feedUrl && ($feed = $this->read($feedUrl, 100))) {
            $hash = NewsItem::hashUrl($articleUrl);
            foreach ($feed['articles'] as $article) {
                if ($article['image_url'] && NewsItem::hashUrl($article['url']) === $hash) {
                    return $article['image_url'];
                }
            }
        }

        $page = $this->get($articleUrl);
        if (! $page || $this->isXml($page)) {
            return null;
        }
        foreach (['og:image:secure_url', 'og:image', 'twitter:image'] as $name) {
            $pattern = '/<meta\b[^>]*(?:property|name)=["\']'.preg_quote($name, '/').'["\'][^>]*>/i';
            if (preg_match($pattern, $page, $tag) && preg_match('/content=["\']([^"\']+)["\']/i', $tag[0], $content)) {
                return NewsPipeline::validUrl($this->absolute(html_entity_decode($content[1]), $articleUrl));
            }
        }

        return null;
    }

    /** Body of a successful GET, or null. Skips URLs robots.txt disallows for us. */
    private function get(string $url): ?string
    {
        if (! NewsPipeline::validUrl($url) || ! $this->allowed($url)) {
            return null;
        }

        try {
            $response = $this->http()->get($url);

            return $response->successful() ? $response->body() : null;
        } catch (Throwable) {
            return null;
        }
    }

    private function http(): PendingRequest
    {
        return Http::withUserAgent((string) config('hermes.user_agent'))
            ->accept('application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, text/html;q=0.8')
            ->connectTimeout(5)
            ->timeout(15);
    }

    public function allowed(string $url): bool
    {
        $path = (string) (parse_url($url, PHP_URL_PATH) ?: '/');
        $rules = $this->robots($this->origin($url));
        $match = ['length' => -1, 'allow' => true];
        foreach ($rules['rules'] as [$allow, $prefix]) {
            // Longest matching rule wins, as in the robots.txt standard.
            if ($prefix !== '' && str_starts_with($path, $prefix) && strlen($prefix) > $match['length']) {
                $match = ['length' => strlen($prefix), 'allow' => $allow];
            }
        }

        return $match['allow'];
    }

    /**
     * Rules for "*" (or our own bot name when listed) and the sitemaps, cached for a day.
     *
     * @return array{rules: list<array{0: bool, 1: string}>, sitemaps: list<string>}
     */
    private function robots(string $origin): array
    {
        return Cache::remember('news-robots:'.md5($origin), now()->addDay(), function () use ($origin) {
            try {
                $response = $this->http()->get($origin.'/robots.txt');
                $text = $response->successful() ? $response->body() : '';
            } catch (Throwable) {
                $text = '';
            }

            $bot = strtolower(Str::before((string) config('hermes.user_agent'), '/'));
            $groups = [];
            $agents = [];
            $sitemaps = [];
            $inRules = false;
            foreach (preg_split('/\r?\n/', $text) ?: [] as $line) {
                $line = trim(Str::before($line, '#'));
                if (! str_contains($line, ':')) {
                    continue;
                }
                [$key, $value] = array_map('trim', explode(':', $line, 2));
                $key = strtolower($key);
                if ($key === 'sitemap') {
                    $sitemaps[] = $value;
                } elseif ($key === 'user-agent') {
                    if ($inRules) {
                        $agents = [];
                        $inRules = false;
                    }
                    $agents[] = strtolower($value);
                } elseif (in_array($key, ['allow', 'disallow'], true)) {
                    $inRules = true;
                    foreach ($agents as $agent) {
                        $groups[$agent][] = [$key === 'allow', $value];
                    }
                }
            }

            return ['rules' => $groups[$bot] ?? $groups['*'] ?? [], 'sitemaps' => array_slice($sitemaps, 0, 3)];
        });
    }

    private function origin(string $url): string
    {
        $p = parse_url($url) ?: [];

        return ($p['scheme'] ?? 'https').'://'.($p['host'] ?? '').(isset($p['port']) ? ':'.$p['port'] : '');
    }

    private function absolute(string $url, string $base): string
    {
        return DiscoverNews::absolute($url, $base);
    }
}
