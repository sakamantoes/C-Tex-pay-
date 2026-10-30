import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import adminUserService from "../../service/adminUser.service";

const LIMIT = 20;

const statusStyles = {
  ACTIVE: "text-emerald-500",
  INACTIVE: "text-ctex-text-muted",
  SUSPENDED: "text-red-500",
  PENDING: "text-amber-500",
};

const roleStyles = {
  SUPER_ADMIN: "text-purple-500",
  ADMIN: "text-ctex-blue",
  MERCHANT: "text-ctex-text",
  USER: "text-ctex-text-muted",
};

/**
 * Normalizes the response from adminUserService.listUsers.
 *
 * Supports:
 * 1. { users: [], pagination: {} } - current service response
 * 2. { success: true, data: [], pagination: {} } - backend response
 * 3. { data: { data: [], pagination: {} } } - Axios response
 * 4. [] - direct array response
 */
function normalizeListResponse(raw, fallbackPage, fallbackLimit) {
  const fallbackPagination = {
    page: fallbackPage,
    limit: fallbackLimit,
    totalItems: 0,
    totalPages: 0,
  };

  // Case 1: Current adminUserService response
  if (raw && Array.isArray(raw.users)) {
    return {
      users: raw.users,
      pagination: raw.pagination || fallbackPagination,
    };
  }

  // Case 2: Direct backend response
  if (raw && Array.isArray(raw.data)) {
    return {
      users: raw.data,
      pagination: raw.pagination || fallbackPagination,
    };
  }

  // Case 3: Raw Axios response
  if (raw?.data && Array.isArray(raw.data.data)) {
    return {
      users: raw.data.data,
      pagination: raw.data.pagination || fallbackPagination,
    };
  }

  // Case 4: Direct array
  if (Array.isArray(raw)) {
    return {
      users: raw,
      pagination: {
        ...fallbackPagination,
        totalItems: raw.length,
        totalPages: raw.length > 0 ? 1 : 0,
      },
    };
  }

  console.warn("Unexpected listUsers response shape:", raw);

  return {
    users: [],
    pagination: fallbackPagination,
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: LIMIT,
    totalItems: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    role: "",
    status: "",
  });

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /**
   * Fetch platform users.
   */
  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page,
        limit: LIMIT,
      };

      if (filters.search.trim()) {
        params.search = filters.search.trim();
      }

      if (filters.role) {
        params.role = filters.role;
      }

      if (filters.status) {
        params.status = filters.status;
      }

      const raw = await adminUserService.listUsers(params);

      console.log("Admin users service response:", raw);

      const { users: nextUsers, pagination: nextPagination } =
        normalizeListResponse(raw, page, LIMIT);

      setUsers(nextUsers);
      setPagination(nextPagination);
    } catch (e) {
      console.error("Failed to load admin users:", e);

      setError(
        e.response?.data?.message ||
          e.message ||
          "Unable to load users. Please try again.",
      );

      setUsers([]);

      setPagination({
        page,
        limit: LIMIT,
        totalItems: 0,
        totalPages: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  /**
   * Automatically reload users when page or filters change.
   */
  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Apply filters.
   */
  const onFilterSubmit = (e) => {
    e.preventDefault();

    if (page !== 1) {
      setPage(1);
    }
  };

  /**
   * Clear all filters.
   */
  const clearFilters = () => {
    setFilters({
      search: "",
      role: "",
      status: "",
    });

    setPage(1);
  };

  /**
   * Check whether any filter is active.
   */
  const hasActiveFilters = useMemo(
    () =>
      Boolean(filters.search.trim()) ||
      Boolean(filters.role) ||
      Boolean(filters.status),
    [filters],
  );

  const totalPages = Math.max(1, pagination.totalPages || 0);

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-ctex-text">All users</h1>

      <p className="mt-1 text-sm text-ctex-text-muted">
        {(pagination.totalItems || 0).toLocaleString()} users on the platform
      </p>

      {/* Filters */}
      <form
        onSubmit={onFilterSubmit}
        role="search"
        className="mt-4 flex flex-wrap gap-2 rounded-lg border border-ctex-border bg-ctex-surface p-3"
      >
        <input
          type="text"
          placeholder="Search name, email, phone"
          value={filters.search}
          onChange={(e) =>
            setFilters({
              ...filters,
              search: e.target.value,
            })
          }
          aria-label="Search users"
          className="h-9 flex-1 min-w-[200px] rounded border border-ctex-border bg-ctex-elevated px-2 text-sm text-ctex-text"
        />

        <select
          value={filters.role}
          onChange={(e) =>
            setFilters({
              ...filters,
              role: e.target.value,
            })
          }
          aria-label="Filter by role"
          className="h-9 rounded border border-ctex-border bg-ctex-elevated px-2 text-sm text-ctex-text"
        >
          <option value="">All roles</option>
          <option value="USER">USER</option>
          <option value="MERCHANT">MERCHANT</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) =>
            setFilters({
              ...filters,
              status: e.target.value,
            })
          }
          aria-label="Filter by status"
          className="h-9 rounded border border-ctex-border bg-ctex-elevated px-2 text-sm text-ctex-text"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="PENDING">PENDING</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="h-9 rounded bg-ctex-blue px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Applying…" : "Apply"}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="h-9 rounded border border-ctex-border px-3 text-sm text-ctex-text-muted hover:text-ctex-text"
          >
            Clear
          </button>
        )}
      </form>

      {/* Error message */}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
        >
          {error}
        </p>
      )}

      {/* Users table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-ctex-border bg-ctex-surface">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ctex-elevated text-xs text-ctex-text-muted">
              <tr>
                <th scope="col" className="whitespace-nowrap px-3 py-2">
                  Name
                </th>

                <th scope="col" className="whitespace-nowrap px-3 py-2">
                  Email
                </th>

                <th scope="col" className="whitespace-nowrap px-3 py-2">
                  Role
                </th>

                <th scope="col" className="whitespace-nowrap px-3 py-2">
                  Status
                </th>

                <th scope="col" className="whitespace-nowrap px-3 py-2">
                  Last login
                </th>

                <th scope="col" className="whitespace-nowrap px-3 py-2">
                  Created
                </th>

                <th scope="col" className="px-3 py-2" aria-label="Actions" />
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-ctex-text-muted"
                  >
                    Loading users…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-ctex-text-muted"
                  >
                    {hasActiveFilters
                      ? "No users match these filters."
                      : "No users on the platform yet."}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-ctex-border">
                    <td className="whitespace-nowrap px-3 py-2 text-ctex-text">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") ||
                        "—"}
                    </td>

                    <td className="px-3 py-2 font-mono text-xs text-ctex-text-muted">
                      {u.email || "—"}
                    </td>

                    <td
                      className={`whitespace-nowrap px-3 py-2 text-xs font-medium ${
                        roleStyles[u.role] || "text-ctex-text"
                      }`}
                    >
                      {u.role || "—"}
                    </td>

                    <td
                      className={`whitespace-nowrap px-3 py-2 text-xs font-medium ${
                        statusStyles[u.status] || "text-ctex-text"
                      }`}
                    >
                      {u.status || "—"}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2 text-xs text-ctex-text-muted">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleDateString()
                        : "—"}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2 text-xs text-ctex-text-muted">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString()
                        : "—"}
                    </td>

                    <td className="px-3 py-2 text-right">
                      <Link
                        to={`/super-admin/users/${u.id}`}
                        className="text-ctex-blue hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ctex-text-muted">
        <span>
          Page {pagination.page || page} of {totalPages}
        </span>

        <div className="flex gap-2">
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => current - 1)}
            className="rounded border border-ctex-border px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>

          <button
            disabled={page >= (pagination.totalPages || 0) || loading}
            onClick={() => setPage((current) => current + 1)}
            className="rounded border border-ctex-border px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
