<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Str;
use Inertia\Response;

abstract class Controller
{
    use AuthorizesRequests;

    /**
     * Meta tags rendered by the Blade root view, so crawlers that don't run JavaScript
     * (WhatsApp, Facebook, X) still see the title, description and image.
     *
     * @param  array<string, mixed>|null  $jsonLd
     */
    protected function seo(Response $page, string $title, string $description, ?string $image = null, ?array $jsonLd = null): Response
    {
        return $page->withViewData('meta', [
            'title' => $title.' - '.config('app.name'),
            'description' => Str::limit(trim(preg_replace('/\s+/', ' ', $description)), 160),
            'image' => $image,
            'url' => url()->current(),
            'type' => ($jsonLd['@type'] ?? null) === 'NewsArticle' ? 'article' : 'website',
            'jsonLd' => $jsonLd,
        ]);
    }
}
