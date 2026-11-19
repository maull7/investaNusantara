<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tag;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/** Tags are created by editors and by the AI; admins rename, merge and delete them here. */
class TagController extends Controller
{
    public function index(Request $request): Response
    {
        $q = $request->string('q')->trim()->value();

        return Inertia::render('admin/tags/index', [
            'tags' => Tag::withCount('articles')
                ->when($q, fn ($query) => $query->where('name', 'like', "%$q%"))
                ->orderByDesc('articles_count')->orderBy('name')
                ->paginate(50)->withQueryString(),
            'q' => $q,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate(['name' => ['required', 'string', 'max:60']]);
        Tag::idsFor([$request->string('name')->value()]);

        return back()->with('success', 'Tag disimpan.');
    }

    /** Renaming onto an existing tag's name merges this tag into it. */
    public function update(Request $request, Tag $tag): RedirectResponse
    {
        $request->validate(['name' => ['required', 'string', 'max:60']]);
        $name = trim($request->string('name')->value());
        $slug = Str::slug($name);
        abort_if($slug === '', 422, 'Nama tag tidak valid.');

        $target = Tag::where('slug', $slug)->whereKeyNot($tag->id)->first();
        if (! $target) {
            $tag->update(['name' => $name, 'slug' => $slug]);

            return back()->with('success', 'Tag diperbarui.');
        }

        DB::transaction(function () use ($tag, $target) {
            $target->articles()->syncWithoutDetaching($tag->articles()->pluck('articles.id'));
            $tag->delete();
        });

        return back()->with('success', "Tag digabung ke \"{$target->name}\".");
    }

    public function destroy(Tag $tag): RedirectResponse
    {
        $tag->delete();

        return back()->with('success', 'Tag dihapus.');
    }
}
