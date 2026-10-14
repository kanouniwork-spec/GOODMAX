import { notFound } from "next/navigation";

/** Any other address gets the site's own "not found" page, with the header and footer. */
export default function Rest() {
  notFound();
}
