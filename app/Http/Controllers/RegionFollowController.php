<?php

namespace App\Http\Controllers;

use App\Models\Region;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** "Ikuti wilayah": provinces and kab/kota whose news fill the reader's dashboard. */
class RegionFollowController extends Controller
{
    public const MAX = 20;

    public function store(Request $request, Region $region): RedirectResponse
    {
        $user = $request->user();
        abort_if($user->role->isStaff(), 403);
        if ($user->followedRegions()->count() >= self::MAX && ! $user->followedRegions()->whereKey($region->code)->exists()) {
            throw ValidationException::withMessages(['region' => 'Maksimal '.self::MAX.' wilayah yang bisa diikuti.']);
        }
        $user->followedRegions()->syncWithoutDetaching([$region->code]);

        return back();
    }

    public function destroy(Request $request, Region $region): RedirectResponse
    {
        $request->user()->followedRegions()->detach($region->code);

        return back();
    }
}
