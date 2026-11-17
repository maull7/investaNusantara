<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivityLogController extends Controller
{
    /** Event prefix => filter label. */
    private const MODULES = [
        'auth' => 'Login & logout',
        'article' => 'Artikel',
        'category' => 'Kategori',
        'user' => 'Pengguna',
        'news_source' => 'Berita AI',
    ];

    public function index(Request $request): Response
    {
        $module = $request->string('module')->value();

        $logs = ActivityLog::query()
            ->with('user:id,name,role')
            ->when(isset(self::MODULES[$module]), fn ($q) => $q->where('event', 'like', "{$module}.%"))
            ->when($request->integer('user'), fn ($q, $id) => $q->where('user_id', $id))
            ->when($request->string('q')->trim()->value(), fn ($q, $term) => $q->where('description', 'like', "%{$term}%"))
            ->latest('id')
            ->paginate(30)
            ->withQueryString();

        return Inertia::render('admin/activity/index', [
            'logs' => $logs,
            'modules' => collect(self::MODULES)->map(fn ($label, $value) => compact('value', 'label'))->values(),
            'users' => User::whereIn('id', ActivityLog::query()->select('user_id')->whereNotNull('user_id')->distinct())
                ->orderBy('name')->get(['id', 'name']),
            'filters' => $request->only('module', 'user', 'q'),
        ]);
    }
}
