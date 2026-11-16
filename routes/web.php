<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PortalController;
use Illuminate\Support\Facades\Route;

Route::controller(PortalController::class)->group(function () {
    Route::get('/', 'home')->name('home');
    Route::get('/cari', 'search')->name('search');
    Route::get('/kategori/{category:slug}', 'category')->name('category');
    Route::get('/berita/{article:slug}', 'article')->name('article');
    Route::inertia('/wilayah', 'region/index')->name('regions');
    Route::get('/wilayah/{province:slug}/{child:slug?}', 'region')->name('region')->scopeBindings();
    Route::get('/api/wilayah/{province:code}/kota', 'cities')->name('region.cities');
    Route::get('/sitemap.xml', 'sitemap')->name('sitemap');
});

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'create'])->name('login');
    Route::post('/login', [AuthController::class, 'store'])->middleware('throttle:6,1');
});
Route::post('/logout', [AuthController::class, 'destroy'])->middleware('auth')->name('logout');

Route::middleware('auth')->prefix('admin')->name('admin.')->group(function () {
    Route::redirect('/', '/admin/articles');
    Route::resource('articles', Admin\ArticleController::class)->except('show');
    Route::post('articles/{article}/submit', [Admin\ArticleController::class, 'submit'])->name('articles.submit');
    Route::post('articles/{article}/publish', [Admin\ArticleController::class, 'publish'])->name('articles.publish');
    Route::post('articles/{article}/reject', [Admin\ArticleController::class, 'reject'])->name('articles.reject');

    Route::middleware('can:super-admin')->group(function () {
        Route::resource('categories', Admin\CategoryController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::resource('users', Admin\UserController::class)->except('show');
    });
});
