<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/categories/index', [
            'categories' => Category::withCount('articles')->orderBy('sort')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Category::create($this->validated($request));

        return back()->with('success', 'Kategori ditambahkan.');
    }

    public function update(Request $request, Category $category): RedirectResponse
    {
        $category->update($this->validated($request, $category));

        return back()->with('success', 'Kategori diperbarui.');
    }

    public function destroy(Category $category): RedirectResponse
    {
        if ($category->articles()->withTrashed()->exists()) {
            return back()->with('error', 'Kategori masih dipakai artikel.');
        }
        $category->delete();

        return back()->with('success', 'Kategori dihapus.');
    }

    /** @return array{name: string, slug: string, sort: int} */
    private function validated(Request $request, ?Category $category = null): array
    {
        $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'sort' => ['nullable', 'integer', 'min:0'],
        ]);
        $data = [
            'name' => $request->string('name')->value(),
            'slug' => Str::slug($request->string('name')->value()),
            'sort' => $request->integer('sort'),
        ];
        validator($data, ['slug' => [Rule::unique('categories')->ignore($category)]], ['slug.unique' => 'Kategori sudah ada.'])->validate();

        return $data;
    }
}
