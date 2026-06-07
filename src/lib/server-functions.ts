import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Map raw Postgres/PostgREST errors to safe user-facing messages.
// Raw details are logged server-side only.
function dbError(err: { message?: string; code?: string; details?: string } | null | undefined): Error {
  console.error("[db]", err);
  const code = err?.code;
  switch (code) {
    case "23505":
      return new Error("Já existe um registro com esses dados.");
    case "23503":
      return new Error("Registro relacionado não encontrado ou em uso.");
    case "23502":
      return new Error("Campo obrigatório ausente.");
    case "23514":
      return new Error("Dados inválidos para esta operação.");
    case "42501":
    case "PGRST301":
      return new Error("Você não tem permissão para esta operação.");
    default:
      return new Error("Não foi possível concluir a operação. Tente novamente.");
  }
}


// ---------- Current user + roles ----------
export const getCurrentUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    return {
      userId,
      profile,
      roles: (roles ?? []).map((r) => r.role),
    };
  });

// First user becomes admin (bootstrap)
export const claimAdminIfFirst = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) return { granted: false };
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) throw dbError(error);
    return { granted: true };
  });

// ---------- Dashboard ----------
export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const today = new Date().toISOString().slice(0, 10);

    const [books, members, loans, recentLoans] = await Promise.all([
      supabase.from("books").select("id, total_quantity, borrowed_quantity"),
      supabase.from("members").select("id", { count: "exact", head: true }),
      supabase.from("loans").select("id, status, due_date, return_date"),
      supabase
        .from("loans")
        .select("id, code, loan_date, status, members(full_name), books(title)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const bookList = books.data ?? [];
    const totalBooks = bookList.reduce((s, b) => s + (b.total_quantity ?? 0), 0);
    const borrowedBooks = bookList.reduce((s, b) => s + (b.borrowed_quantity ?? 0), 0);
    const availableBooks = totalBooks - borrowedBooks;

    const loansList = loans.data ?? [];
    const activeLoans = loansList.filter((l) => l.status === "active").length;
    const overdueLoans = loansList.filter(
      (l) => l.status !== "returned" && l.due_date < today && !l.return_date,
    ).length;

    return {
      totalBooks,
      availableBooks,
      borrowedBooks,
      totalTitles: bookList.length,
      totalMembers: members.count ?? 0,
      activeLoans,
      overdueLoans,
      totalLoans: loansList.length,
      recentLoans: recentLoans.data ?? [],
    };
  });

// ---------- Publishers ----------
export const getPublishers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("publishers")
      .select("*")
      .order("name");
    if (error) throw dbError(error);
    return data ?? [];
  });

const publisherInput = z.object({
  id: z.string().optional(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  email: z.string().email().max(255).optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
});

export const upsertPublisher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => publisherInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, email: data.email || null, phone: data.phone || null };
    const { error } = data.id
      ? await context.supabase.from("publishers").update(payload).eq("id", data.id)
      : await context.supabase.from("publishers").insert(payload);
    if (error) throw dbError(error);
    return { ok: true };
  });

export const deletePublisher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("publishers").delete().eq("id", data.id);
    if (error) throw dbError(error);
    return { ok: true };
  });

// ---------- Categories ----------
export const getCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("categories").select("*").order("name");
    if (error) throw dbError(error);
    return data ?? [];
  });

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string }) =>
    z.object({ id: z.string().optional(), name: z.string().min(1).max(100) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = data.id
      ? await context.supabase.from("categories").update({ name: data.name }).eq("id", data.id)
      : await context.supabase.from("categories").insert({ name: data.name });
    if (error) throw dbError(error);
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error) throw dbError(error);
    return { ok: true };
  });

// ---------- Books ----------
export const getBooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("books")
      .select("*, publishers(name), categories(name)")
      .order("title");
    if (error) throw dbError(error);
    return data ?? [];
  });

const bookInput = z.object({
  id: z.string().optional(),
  code: z.string().min(1).max(50),
  title: z.string().min(1).max(255),
  author: z.string().min(1).max(255),
  publisher_id: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  publication_year: z.number().int().min(0).max(9999).nullable().optional(),
  isbn: z.string().max(50).optional().or(z.literal("")),
  total_quantity: z.number().int().min(0).max(100000),
  cover_url: z.string().max(2000).optional().or(z.literal("")),
});

export const upsertBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bookInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      code: data.code,
      title: data.title,
      author: data.author,
      publisher_id: data.publisher_id || null,
      category_id: data.category_id || null,
      publication_year: data.publication_year ?? null,
      isbn: data.isbn || null,
      total_quantity: data.total_quantity,
      cover_url: data.cover_url || null,
    };
    if (data.id) {
      const { data: existing } = await context.supabase
        .from("books")
        .select("borrowed_quantity")
        .eq("id", data.id)
        .single();
      if (existing && data.total_quantity < (existing.borrowed_quantity ?? 0)) {
        throw new Error("A quantidade total não pode ser menor que a quantidade emprestada.");
      }
      const { error } = await context.supabase.from("books").update(payload).eq("id", data.id);
      if (error) throw dbError(error);
    } else {
      const { error } = await context.supabase.from("books").insert(payload);
      if (error) throw dbError(error);
    }
    return { ok: true };
  });

export const deleteBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: book } = await context.supabase
      .from("books")
      .select("borrowed_quantity")
      .eq("id", data.id)
      .single();
    if (book && (book.borrowed_quantity ?? 0) > 0) {
      throw new Error("Não é possível excluir um livro com exemplares emprestados.");
    }
    const { error } = await context.supabase.from("books").delete().eq("id", data.id);
    if (error) throw dbError(error);
    return { ok: true };
  });

// ---------- Members ----------
export const getMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("members")
      .select("*")
      .order("full_name");
    if (error) throw dbError(error);
    return data ?? [];
  });

const memberInput = z.object({
  id: z.string().optional(),
  code: z.string().min(1).max(50),
  registration: z.string().max(50).optional().or(z.literal("")),
  full_name: z.string().min(1).max(255),
  email: z.string().email().max(255).optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  member_role: z.string().max(50).optional().or(z.literal("")),
  course: z.string().max(100).optional().or(z.literal("")),
  grade: z.string().max(20).optional().or(z.literal("")),
  cpf: z.string().max(20).optional().or(z.literal("")),
  street: z.string().max(255).optional().or(z.literal("")),
  number: z.string().max(20).optional().or(z.literal("")),
  district: z.string().max(100).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(2).optional().or(z.literal("")),
});

export const upsertMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => memberInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (k === "id") continue;
      payload[k] = v === "" ? null : v;
    }
    const { error } = data.id
      ? await context.supabase.from("members").update(payload).eq("id", data.id)
      : await context.supabase.from("members").upsert(payload as never, { onConflict: "code" });
    if (error) throw dbError(error);
    return { ok: true };
  });

export const deleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: loans, error: loansError } = await supabaseAdmin
      .from("loans")
      .select("id, book_id, status")
      .eq("member_id", data.id);
    if (loansError) throw dbError(loansError);

    const activeBookIds = (loans ?? [])
      .filter((loan) => loan.status !== "returned")
      .map((loan) => loan.book_id)
      .filter(Boolean);

    await Promise.all(
      activeBookIds.map(async (bookId) => {
        const { data: book, error: bookError } = await supabaseAdmin
          .from("books")
          .select("borrowed_quantity")
          .eq("id", bookId)
          .single();
        if (bookError || !book) return;
        await supabaseAdmin
          .from("books")
          .update({ borrowed_quantity: Math.max(0, (book.borrowed_quantity ?? 0) - 1) })
          .eq("id", bookId);
      }),
    );

    const { error: deleteLoansError } = await supabaseAdmin.from("loans").delete().eq("member_id", data.id);
    if (deleteLoansError) throw dbError(deleteLoansError);

    const { error } = await supabaseAdmin.from("members").delete().eq("id", data.id);
    if (error) throw dbError(error);
    return { ok: true };
  });

// ---------- Loans ----------
export const getLoans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("loans")
      .select("*, members(full_name, code), books(title, code)")
      .order("created_at", { ascending: false });
    if (error) throw dbError(error);
    return data ?? [];
  });

const loanInput = z.object({
  member_id: z.string().uuid(),
  book_id: z.string().uuid(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const createLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => loanInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: book, error: be } = await supabase
      .from("books")
      .select("total_quantity, borrowed_quantity")
      .eq("id", data.book_id)
      .single();
    if (be || !book) throw new Error("Livro não encontrado.");
    if ((book.borrowed_quantity ?? 0) >= (book.total_quantity ?? 0)) {
      throw new Error("Sem exemplares disponíveis deste livro.");
    }
    const { error: le } = await supabase.from("loans").insert({
      member_id: data.member_id,
      book_id: data.book_id,
      due_date: data.due_date,
      status: "active",
      created_by: userId,
    });
    if (le) throw dbError(le);
    const { error: ue } = await supabase
      .from("books")
      .update({ borrowed_quantity: (book.borrowed_quantity ?? 0) + 1 })
      .eq("id", data.book_id);
    if (ue) throw dbError(ue);
    return { ok: true };
  });

export const returnLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: loan, error: le } = await supabase
      .from("loans")
      .select("book_id, status")
      .eq("id", data.id)
      .single();
    if (le || !loan) throw new Error("Empréstimo não encontrado.");
    if (loan.status === "returned") throw new Error("Empréstimo já devolvido.");

    const today = new Date().toISOString().slice(0, 10);
    const { error: ue } = await supabase
      .from("loans")
      .update({ status: "returned", return_date: today })
      .eq("id", data.id);
    if (ue) throw dbError(ue);

    const { data: book } = await supabase
      .from("books")
      .select("borrowed_quantity")
      .eq("id", loan.book_id)
      .single();
    if (book) {
      await supabase
        .from("books")
        .update({ borrowed_quantity: Math.max(0, (book.borrowed_quantity ?? 0) - 1) })
        .eq("id", loan.book_id);
    }
    return { ok: true };
  });
