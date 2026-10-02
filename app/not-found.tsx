import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-3xl font-bold">Not on the shelf</h1>
      <p className="mt-3">That page doesn&apos;t exist, or the book has been removed from the library.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Back to the catalogue
      </Link>
    </div>
  );
}
