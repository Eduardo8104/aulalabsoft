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
    const roleList = (roles ?? []).map((r) => r.role);
    return {
      userId,
      profile,
      roles: roleList,
      isAdmin: roleList.includes("admin"),
      isStaff: roleList.includes("admin") || roleList.includes("librarian"),
    };
  });

// Bootstrap: ensures profile exists, grants admin to first user, otherwise
// "user" role, and auto-promotes to librarian if there's a matching member
// record with member_role containing "bibliotec".
export const ensureUserSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase, claims } = context;
    const email = (claims.email as string | undefined) ?? null;
    const name =
      (claims.user_metadata as Record<string, unknown> | undefined)?.full_name ??
      (claims.user_metadata as Record<string, unknown> | undefined)?.name ??
      null;

    // Ensure profile row
    await supabase
      .from("profiles")
      .upsert({ id: userId, email, name: name as string | null }, { onConflict: "id" });

    // Existing roles
    const { data: existing } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const have = new Set((existing ?? []).map((r) => r.role));

    if (have.size === 0) {
      // First user -> admin; else default to "user"
      const { count } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      const role = (count ?? 0) === 0 ? "admin" : "user";
      await supabase.from("user_roles").insert({ user_id: userId, role });
      have.add(role);
    }

    // Auto-promote librarian by email match in members table
    if (email && !have.has("librarian") && !have.has("admin")) {
      const { data: m } = await supabase
        .from("members")
        .select("member_role")
        .ilike("email", email)
        .maybeSingle();
      if (m?.member_role && /bibliotec/i.test(m.member_role)) {
        await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "librarian" });
        have.add("librarian");
      }
    }

    const roles = Array.from(have);
    return {
      roles,
      isAdmin: roles.includes("admin"),
      isStaff: roles.includes("admin") || roles.includes("librarian"),
    };
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

// ---------- End-user catalog & loan requests ----------
export const getCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("books")
      .select("id, code, title, author, cover_url, total_quantity, borrowed_quantity, publishers(name), categories(name)")
      .order("title");
    if (error) throw dbError(error);
    return data ?? [];
  });

export const getMyLoans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("loans")
      .select("id, status, loan_date, due_date, return_date, books(title, code)")
      .eq("requested_by", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw dbError(error);
    return data ?? [];
  });

export const requestLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      book_id: z.string().uuid(),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Validate book has copies
    const { data: book } = await supabaseAdmin
      .from("books")
      .select("total_quantity, borrowed_quantity")
      .eq("id", data.book_id)
      .maybeSingle();
    if (!book) throw new Error("Livro não encontrado.");
    if ((book.borrowed_quantity ?? 0) >= (book.total_quantity ?? 0)) {
      throw new Error("Sem exemplares disponíveis.");
    }

    // Try to find a matching member record by user's email
    const { data: claims } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = claims.user?.email ?? null;
    let memberId: string | null = null;
    if (email) {
      const { data: m } = await supabaseAdmin
        .from("members")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      memberId = m?.id ?? null;
    }
    if (!memberId) {
      const code = `U-${userId.slice(0, 8)}`;
      const fullName = (claims.user?.user_metadata?.full_name as string)
        ?? (claims.user?.user_metadata?.name as string)
        ?? email
        ?? "Usuário";
      const { data: newM, error: me } = await supabaseAdmin
        .from("members")
        .upsert({ code, full_name: fullName, email }, { onConflict: "code" })
        .select("id")
        .single();
      if (me || !newM) throw dbError(me);
      memberId = newM.id;
    }

    const { error } = await supabaseAdmin.from("loans").insert({
      member_id: memberId,
      book_id: data.book_id,
      due_date: data.due_date,
      status: "pending",
      requested_by: userId,
      created_by: userId,
    });
    if (error) throw dbError(error);
    return { ok: true };
  });

export const approveLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: loan } = await supabase.from("loans").select("book_id, status").eq("id", data.id).single();
    if (!loan) throw new Error("Empréstimo não encontrado.");
    if (loan.status !== "pending") throw new Error("Solicitação já processada.");

    const { data: book } = await supabase.from("books").select("total_quantity, borrowed_quantity").eq("id", loan.book_id).single();
    if (!book) throw new Error("Livro não encontrado.");
    if ((book.borrowed_quantity ?? 0) >= (book.total_quantity ?? 0)) throw new Error("Sem exemplares disponíveis.");

    const { error: ue } = await supabase.from("loans").update({ status: "active" }).eq("id", data.id);
    if (ue) throw dbError(ue);
    await supabase.from("books").update({ borrowed_quantity: (book.borrowed_quantity ?? 0) + 1 }).eq("id", loan.book_id);
    return { ok: true };
  });

export const rejectLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("loans").update({ status: "rejected" }).eq("id", data.id).eq("status", "pending");
    if (error) throw dbError(error);
    return { ok: true };
  });


// ---------- Book cover upload ----------
// Accepts a base64-encoded image, uploads to the private "book-covers" bucket
// using the admin client, and returns a long-lived signed URL.
const uploadInput = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
  // base64 (no data URL prefix); ~5MB binary => ~6.7MB base64
  base64: z.string().min(1).max(7_500_000),
});

export const uploadBookCover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uploadInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Staff-only
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", userId);
    const rs = (roles ?? []).map((r) => r.role);
    if (!rs.includes("admin") && !rs.includes("librarian")) {
      throw new Error("Apenas administradores podem alterar capas.");
    }

    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > 5 * 1024 * 1024) {
      throw new Error("A imagem deve ter no máximo 5 MB.");
    }
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg", "image/jpg": "jpg",
      "image/png": "png", "image/webp": "webp",
    };
    const ext = extMap[data.contentType] ?? "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("book-covers")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (upErr) {
      console.error("[storage] upload", upErr);
      throw new Error("Falha ao enviar a imagem. Tente novamente.");
    }

    // 10-year signed URL
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("book-covers")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (sErr || !signed?.signedUrl) {
      console.error("[storage] sign", sErr);
      throw new Error("Falha ao gerar URL da imagem.");
    }
    return { url: signed.signedUrl, path };
  });

// ---------- Lookup book metadata by ISBN ----------
// Uses Google Books first, falls back to Open Library. If a cover image is
// found, downloads it and uploads to the "book-covers" bucket so it's served
// from our own storage (stable signed URL).
const isbnInput = z.object({
  isbn: z.string().trim().min(10).max(20).regex(/^[0-9Xx\-\s]+$/),
});

function normalizeIsbn(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

async function uploadCoverFromUrl(
  imageUrl: string,
  userId: string,
  supabase: any,
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") ?? "image/jpeg").toLowerCase();
    const contentType =
      ct.includes("png") ? "image/png" :
      ct.includes("webp") ? "image/webp" : "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > 5 * 1024 * 1024) return null;
    const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/isbn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("book-covers")
      .upload(path, buf, { contentType, upsert: false });
    if (upErr) { console.error("[isbn] upload", upErr); return null; }
    const { data: signed } = await supabase.storage
      .from("book-covers")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    return signed?.signedUrl ?? null;
  } catch (err) {
    console.error("[isbn] cover fetch", err);
    return null;
  }
}

export const lookupBookByIsbn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => isbnInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const rolesRes = await supabase
      .from("user_roles").select("role").eq("user_id", userId);
    const rs = (rolesRes.data ?? []).map((r) => r.role);
    if (!rs.includes("admin") && !rs.includes("librarian")) {
      throw new Error("Apenas administradores podem buscar por ISBN.");
    }

    const isbn = normalizeIsbn(data.isbn);
    if (isbn.length !== 10 && isbn.length !== 13) {
      throw new Error("ISBN inválido. Use 10 ou 13 dígitos.");
    }

    let title: string | null = null;
    let author: string | null = null;
    let publisher: string | null = null;
    let year: number | null = null;
    let category: string | null = null;
    let coverSource: string | null = null;

    // 1) Google Books
    try {
      const apiKey = process.env.GOOGLE_BOOKS_API_KEY || process.env.VITE_GOOGLE_BOOKS_API_KEY || "";
      const params = apiKey ? `q=isbn:${isbn}&key=${apiKey}` : `q=isbn:${isbn}`;
      const r = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`);
      if (r.ok) {
        const j: any = await r.json();
        const v = j?.items?.[0]?.volumeInfo;
        if (v) {
          title = v.title ?? null;
          author = Array.isArray(v.authors) ? v.authors.join(", ") : null;
          publisher = v.publisher ?? null;
          const d = v.publishedDate ?? "";
          const yMatch = String(d).match(/\d{4}/);
          year = yMatch ? Number(yMatch[0]) : null;
          category = Array.isArray(v.categories) ? v.categories[0] : null;
          const img = v.imageLinks ?? {};
          coverSource =
            img.extraLarge ?? img.large ?? img.medium ?? img.small ?? img.thumbnail ?? img.smallThumbnail ?? null;
          if (coverSource) coverSource = coverSource.replace(/^http:/, "https:");
        }
      }
    } catch (err) { console.error("[isbn] google", err); }

    // 2) Open Library fallback (also great for covers)
    if (!title || !coverSource) {
      try {
        const r = await fetch(
          `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
        );
        if (r.ok) {
          const j: any = await r.json();
          const v = j?.[`ISBN:${isbn}`];
          if (v) {
            title = title ?? v.title ?? null;
            author = author ?? (Array.isArray(v.authors) ? v.authors.map((a: any) => a.name).join(", ") : null);
            publisher = publisher ?? (Array.isArray(v.publishers) ? v.publishers[0]?.name : null);
            if (!year && v.publish_date) {
              const m = String(v.publish_date).match(/\d{4}/);
              if (m) year = Number(m[0]);
            }
            category = category ?? (Array.isArray(v.subjects) ? v.subjects[0]?.name : null);
            coverSource = coverSource ?? v.cover?.large ?? v.cover?.medium ?? v.cover?.small ?? null;
          }
        }
        if (!coverSource) {
          // Open Library Covers API (returns image bytes)
          coverSource = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
        }
      } catch (err) { console.error("[isbn] openlibrary", err); }
    }

    if (!title && !author && !coverSource) {
      throw new Error("Nenhum livro encontrado para este ISBN.");
    }

    let coverUrl: string | null = null;
    if (coverSource) coverUrl = await uploadCoverFromUrl(coverSource, userId, supabase);

    return { isbn, title, author, publisher, publication_year: year, category, cover_url: coverUrl };
  });
