<?php

namespace App\Policies;

use App\Enums\ArticleStatus;
use App\Enums\Role;
use App\Models\Article;
use App\Models\Region;
use App\Models\User;

class ArticlePolicy
{
    public function before(User $user): ?bool
    {
        return $user->role === Role::SuperAdmin ? true : null;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Article $article): bool
    {
        if ($this->edits($user, $article)) {
            return true;
        }

        return $article->author_id === $user->id
            && in_array($article->status, [ArticleStatus::Draft, ArticleStatus::Rejected], true);
    }

    public function delete(User $user, Article $article): bool
    {
        return $this->update($user, $article);
    }

    public function submit(User $user, Article $article): bool
    {
        return $this->update($user, $article) && $article->status !== ArticleStatus::Published;
    }

    public function publish(User $user, Article $article): bool
    {
        return $this->edits($user, $article);
    }

    /** Editors manage their region and everything below it; an editor without a region handles national news. */
    private function edits(User $user, Article $article): bool
    {
        if ($user->role !== Role::Editor) {
            return false;
        }
        if ($user->region_code === null) {
            return true;
        }

        return (new Region(['code' => $user->region_code]))->contains($article->region_code);
    }
}
