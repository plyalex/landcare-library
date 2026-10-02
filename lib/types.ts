export type LoanStatus =
  | "requested"
  | "approved"
  | "active"
  | "returned"
  | "declined"
  | "cancelled";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  pickup_notes: string | null;
  is_member: boolean;
};

export type BookMeta = {
  title: string;
  subtitle: string | null;
  authors: string[];
  isbn: string | null;
  publisher: string | null;
  published_year: number | null;
  page_count: number | null;
  description: string | null;
  categories: string[];
  cover_url: string | null;
  info_url: string | null;
  source: "google" | "openlibrary" | "manual";
};

export type CatalogBook = Omit<BookMeta, "source"> & {
  id: string;
  owner_id: string;
  notes: string | null;
  available: boolean;
  created_at: string;
  owner_name: string;
  loan_id: string | null;
  loan_status: LoanStatus | null;
  borrower_id: string | null;
  borrower_name: string | null;
  started_on: string | null;
  due_date: string | null;
  renewals: number | null;
  pending_requests: number;
};

export type LoanDetail = {
  id: string;
  book_id: string;
  owner_id: string;
  borrower_id: string;
  status: LoanStatus;
  pickup_date: string | null;
  requested_at: string;
  responded_at: string | null;
  started_on: string | null;
  due_date: string | null;
  renewals: number;
  returned_at: string | null;
  book_title: string;
  book_authors: string[];
  book_cover_url: string | null;
  owner_name: string;
  owner_phone: string | null;
  owner_pickup_notes: string | null;
  borrower_name: string;
  borrower_phone: string | null;
};

export type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  loan_id: string | null;
  body: string;
  is_system: boolean;
  created_at: string;
  read_at: string | null;
};

export type DetectedBook = {
  title: string;
  author: string | null;
  confidence: "high" | "medium" | "low";
};
