import { db } from "@/lib/data";
import { MediaLibrary } from "@/components/admin/MediaLibrary";

export default async function Media() {
  return <MediaLibrary items={await db().list("media_library")} />;
}
