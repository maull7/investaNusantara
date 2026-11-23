<?php

namespace App\Http\Controllers;

use App\Enums\ArticleStatus;
use App\Models\Article;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** "Simpan berita": signed-in readers keep articles to read later. */
class BookmarkController extends Controller
{
    public function index(Request $request): Response
    {
        $page = Inertia::render('bookmarks', [
            'articles' => Inertia::scroll(fn () => $request->user()->bookmarks()
                ->published()->card()
                ->reorder('bookmarks.created_at', 'desc')
                ->paginate(12)),
        ]);

        return $this->seo($page, 'Berita Tersimpan', 'Berita yang Anda simpan untuk dibaca nanti.');
    }

    public function store(Request $request, Article $article): RedirectResponse
    {
        abort_unless($article->status === ArticleStatus::Published && $article->published_at?->isPast(), 404);
        $request->user()->bookmarks()->syncWithoutDetaching([$article->id]);

        return back();
    }

    public function destroy(Request $request, Article $article): RedirectResponse
    {
        $request->user()->bookmarks()->detach($article->id);

        return back();
    }
}
