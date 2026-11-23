<?php

use App\Http\Controllers\Api\IntegrationRegisterController;
use App\Http\Middleware\VerifyIntegrationKey;
use Illuminate\Support\Facades\Route;

// Server-to-server from sister projects (investastar, investanews): sign-up sync.
Route::middleware([VerifyIntegrationKey::class, 'throttle:30,1'])->prefix('v1/integrations')->group(function () {
    Route::post('/register', IntegrationRegisterController::class);
});
