import { queryOptions } from "@tanstack/react-query";
import {
  getDashboard,
  getBooks,
  getPublishers,
  getCategories,
  getMembers,
  getLoans,
  getCurrentUser,
} from "./server-functions";

export const dashboardQueryOptions = () =>
  queryOptions({ queryKey: ["dashboard"], queryFn: () => getDashboard() });

export const booksQueryOptions = () =>
  queryOptions({ queryKey: ["books"], queryFn: () => getBooks() });

export const publishersQueryOptions = () =>
  queryOptions({ queryKey: ["publishers"], queryFn: () => getPublishers() });

export const categoriesQueryOptions = () =>
  queryOptions({ queryKey: ["categories"], queryFn: () => getCategories() });

export const membersQueryOptions = () =>
  queryOptions({ queryKey: ["members"], queryFn: () => getMembers() });

export const loansQueryOptions = () =>
  queryOptions({ queryKey: ["loans"], queryFn: () => getLoans() });

export const currentUserQueryOptions = () =>
  queryOptions({ queryKey: ["current-user"], queryFn: () => getCurrentUser() });
