<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\AgendaController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BookmarkController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\MembershipController;
use App\Http\Controllers\PortalController;
use App\Http\Controllers\PushSubscriptionController;
use App\Models\RegionProfile;
use App\Support\InfoPages;
use Illuminate\Support\Facades\Route;

Route::controller(PortalController::class)->group(function () {
    Route::get('/', 'home')->name('home');
    Route::get('/cari', 'search')->name('search');
    Route::get('/sentimen', 'sentiment')->name('sentiment');
    Route::get('/kategori/{category:slug}', 'category')->name('category');
    Route::get('/tag/{tag:slug}', 'tag')->name('tag');
    Route::get('/berita/{article:slug}', 'article')->name('article');
    Route::post('/berita/{article:slug}/review', 'review')->name('article.review')->middleware(['auth', 'throttle:10,1']);
    Route::get('/wilayah', 'regions')->name('regions');
    Route::get('/wilayah/{province:slug}/{child:slug?}', 'region')->name('region')->scopeBindings();
    Route::get('/api/wilayah/{province:code}/kota', 'cities')->name('region.cities');
    Route::get('/api/wilayah/{province:code}/profil', 'profile')->name('region.profile');
    Route::get('/api/wilayah/{province:code}/preview', 'regionPreview')->name('region.preview');
    Route::get('/sitemap.xml', 'sitemap')->name('sitemap');
    Route::get('/sitemap-news.xml', 'newsSitemap')->name('sitemap.news');
    Route::get('/data/{fact}', 'compare')->name('data.compare')->whereIn('fact', RegionProfile::COMPARABLE);
    Route::get('/{page}', 'info')->name('info')->whereIn('page', InfoPages::SLUGS);

});

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'create'])->name('login');
    Route::post('/login', [AuthController::class, 'store'])->middleware('throttle:6,1');
    Route::get('/auth/google', [GoogleAuthController::class, 'redirect'])->name('google.redirect');
    Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('google.callback');
    // Same page as /login, opened on the "Daftar" tab.
    Route::get('/register', [AuthController::class, 'create'])->name('register');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:6,1');
});
Route::post('/logout', [AuthController::class, 'destroy'])->middleware('auth')->name('logout');

Route::middleware(['auth', 'staff'])->prefix('admin')->name('admin.')->group(function () {
    Route::redirect('/', '/admin/articles');
    Route::resource('articles', Admin\ArticleController::class)->except('show');
    Route::post('articles/{article}/submit', [Admin\ArticleController::class, 'submit'])->name('articles.submit');
    Route::post('articles/{article}/publish', [Admin\ArticleController::class, 'publish'])->name('articles.publish');
    Route::post('articles/{article}/reject', [Admin\ArticleController::class, 'reject'])->name('articles.reject');

    // Each area: Super Admin, or a Sub Admin granted it (see App\Enums\Permission).
    Route::resource('categories', Admin\CategoryController::class)->only(['index', 'store', 'update', 'destroy'])
        ->middleware('can:access-categories');
    Route::resource('tags', Admin\TagController::class)->only(['index', 'store', 'update', 'destroy'])
        ->middleware('can:access-categories');
    Route::resource('users', Admin\UserController::class)->except('show')->middleware('can:access-users');
    Route::get('activity', [Admin\ActivityLogController::class, 'index'])->name('activity.index')->middleware('can:access-activity');

    Route::middleware('can:access-memberships')->prefix('langganan')->name('memberships.')->controller(Admin\MembershipController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('{application}/setujui', 'approve')->name('approve');
        Route::post('{application}/tolak', 'reject')->name('reject');
        Route::put('paket/{plan}', 'updatePlan')->name('plans.update');
    });
    Route::get('insights', [Admin\InsightsController::class, 'index'])->name('insights')->middleware('can:access-insights');
    Route::get('insights/export', [Admin\InsightsController::class, 'export'])->name('insights.export')->middleware(['can:access-insights', 'throttle:20,1']);

    Route::middleware('can:access-directory')->prefix('direktori')->name('directory.')->controller(Admin\DirectoryController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('agenda', 'agenda')->name('agenda');
        Route::post('entri/{entry}/verifikasi', 'verify')->name('entries.verify');
        Route::get('{region:code}', 'show')->name('show');
        Route::put('{region:code}/profil', 'updateProfile')->name('profile.update');
        Route::post('{region:code}/draf', 'draft')->name('draft')->middleware('throttle:20,1');
        Route::post('{region:code}/entri', 'storeEntry')->name('entries.store');
        Route::put('entri/{entry}', 'updateEntry')->name('entries.update');
        Route::post('entri/{entry}/unggulan', 'feature')->name('entries.feature');
        Route::delete('entri/{entry}', 'destroyEntry')->name('entries.destroy');
    });

    Route::middleware('can:access-ai')->group(function () {
        Route::prefix('ai')->name('ai.')->controller(Admin\AiNewsController::class)->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('sources', 'sources')->name('sources');
            Route::get('sources/{source}/items', 'items')->name('sources.items');
            Route::patch('hermes-token', 'updateHermesToken')->name('hermes-token.update');
            Route::patch('sources/{source}/active', 'updateActive')->name('sources.active');
            Route::post('sources', 'store')->name('sources.store');
            Route::put('sources/{source}', 'update')->name('sources.update');
            Route::delete('sources/{source}', 'destroy')->name('sources.destroy');
            Route::post('sources/{source}/fetch', 'fetch')->name('sources.fetch')->middleware('throttle:10,1');
            Route::post('fetches/{fetch}/retry', 'retryFetch')->name('fetches.retry');
            Route::post('items/{item}/retry', 'retryItem')->name('items.retry');
        });
    });
});

// Breaking-news notifications; guests too (the browser's push endpoint identifies them).
Route::controller(PushSubscriptionController::class)->prefix('api/push')->name('push.')->middleware('throttle:30,1')->group(function () {
    Route::post('status', 'status')->name('status');
    Route::post('/', 'store')->name('store');
    Route::delete('/', 'destroy')->name('destroy');
});
Route::view('/offline', 'offline')->name('offline');

Route::middleware('auth')->controller(BookmarkController::class)->group(function () {
    Route::get('/tersimpan', 'index')->name('bookmarks');
    Route::post('/berita/{article:slug}/simpan', 'store')->name('bookmarks.store')->middleware('throttle:60,1');
    Route::delete('/berita/{article:slug}/simpan', 'destroy')->name('bookmarks.destroy')->middleware('throttle:60,1');
});

Route::get('/langganan', [MembershipController::class, 'index'])->name('membership');
Route::post('/langganan', [MembershipController::class, 'store'])->name('membership.apply')->middleware(['auth', 'throttle:5,1']);

Route::controller(AgendaController::class)->prefix('agenda')->name('agenda')->group(function () {
    Route::get('/', 'index');
    Route::get('ajukan', 'create')->name('.create')->middleware('auth');
    Route::post('ajukan', 'store')->name('.store')->middleware(['auth', 'throttle:5,1']);
    Route::get('{entry:slug}', 'show')->name('.show');
    Route::get('{entry:slug}/kalender.ics', 'ics')->name('.ics');
});

// Last: "/investasi/jawa-barat/kabupaten-bekasi" style topic pages (Pusat Data Daerah).
Route::get('/{topic}/{province:slug}/{child:slug?}', [PortalController::class, 'topic'])
    ->name('topic')->whereIn('topic', array_keys(RegionProfile::TOPICS))->scopeBindings();
