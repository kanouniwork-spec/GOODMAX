import Link from "next/link";

export default function NotFound() {
  return (
    <section className="hero">
      <div className="container">
        <span className="eyebrow">404</span>
        <h1 className="display-lg">Page not found</h1>
        <p className="lead">
          <Link className="text-link" href="/">
            GOODMAX →
          </Link>
        </p>
      </div>
    </section>
  );
}
