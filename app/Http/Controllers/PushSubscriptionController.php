<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use App\Models\Region;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Breaking-news notifications. Guests can subscribe too: the browser's push endpoint is the identity.
 * Every call answers with the provinces this browser follows.
 */
class PushSubscriptionController extends Controller
{
    /** Which provinces this browser follows (null: not subscribed here). */
    public function status(Request $request): JsonResponse
    {
        $request->validate(['endpoint' => ['required', 'string', 'url', 'max:2000']]);

        return $this->answer(PushSubscription::findByEndpoint($request->string('endpoint')));
    }

    /** Subscribe, and optionally follow one more province. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string', 'url:https', 'max:2000'],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'keys.auth' => ['required', 'string', 'max:255'],
            'province' => ['nullable', Rule::exists('regions', 'code')->where('level', Region::PROVINCE)],
        ]);

        $subscription = PushSubscription::findByEndpoint($data['endpoint']) ?? new PushSubscription([
            'endpoint' => $data['endpoint'],
            'endpoint_hash' => PushSubscription::hash($data['endpoint']),
            'provinces' => [],
        ]);
        $subscription->fill([
            'public_key' => $data['keys']['p256dh'],
            'auth_token' => $data['keys']['auth'],
            'user_id' => $request->user()?->id ?? $subscription->user_id,
            'provinces' => collect($subscription->provinces)->push($data['province'] ?? null)->filter()->unique()->values()->all(),
        ])->save();

        return $this->answer($subscription);
    }

    /** Unfollow one province, or (without `province`) stop all notifications for this browser. */
    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string', 'max:2000'],
            'province' => ['nullable', 'string', 'max:13'],
        ]);
        $subscription = PushSubscription::findByEndpoint($data['endpoint']);

        if ($subscription && isset($data['province'])) {
            $subscription->update(['provinces' => array_values(array_diff($subscription->provinces, [$data['province']]))]);
        } else {
            $subscription?->delete();
            $subscription = null;
        }

        return $this->answer($subscription);
    }

    private function answer(?PushSubscription $subscription): JsonResponse
    {
        return response()->json(['subscribed' => (bool) $subscription, 'provinces' => $subscription->provinces ?? []]);
    }
}
