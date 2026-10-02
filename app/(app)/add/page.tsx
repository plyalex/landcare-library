import AddBooks from "@/components/AddBooks";
import { requireMember } from "@/lib/auth";

export const metadata = { title: "Add books" };

export default async function AddPage() {
  const { supabase, user } = await requireMember();
  const { data } = await supabase.from("books").select("title").eq("owner_id", user.id);
  const existing = (data ?? []).map((b) => (b.title as string).toLowerCase().trim());
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold sm:text-4xl">Add books</h1>
      <p className="mt-2">
        Take a photo of the spines on your shelf, or a stack of books, and the library will look each one up. You
        can check the list before anything is added.
      </p>
      <AddBooks existingTitles={existing} />
    </div>
  );
}
