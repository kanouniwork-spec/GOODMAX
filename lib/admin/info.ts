import "server-only";
import type { Publishable } from "@/types/content";
import { draftOf, hasUnpublishedChanges, localeStatus, type PublishableCollection } from "@/lib/content/publish";

export function publishInfo(c: PublishableCollection, row: Publishable & Record<string, unknown>) {
  const draft = draftOf(c, row);
  return {
    published: !!row.published_snapshot,
    changed: hasUnpublishedChanges(c, row),
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    status: localeStatus(draft, row.published_snapshot),
  };
}
