import { useCallback, useEffect, useMemo, useState } from "react";
import { getAccounts } from "../system-admin.functions";
import { defaultAccountPageSize } from "../system-admin.constants";
import type { AccountCategory, AccountFilters } from "../system-admin.types";

type AccountsData = Awaited<ReturnType<typeof getAccounts>>;
type AccountsQuery = AccountFilters & {
  category: AccountCategory;
  page: number;
  pageSize?: number;
};
type ReadState = {
  key: string;
  owner: string;
  revision: number;
  data: AccountsData | null;
  metadata: AccountsData | null;
  error: string | null;
};

/** Keep the directory mounted; a new category, query or page loads only its rows. */
export function useAccounts(userId: string, search: AccountsQuery) {
  const query = useMemo(
    () => ({
      category: search.category,
      page: search.page,
      pageSize: search.pageSize ?? defaultAccountPageSize,
      q: search.q,
      role: search.role,
      status: search.status,
      departmentId: search.departmentId,
      signIn: search.signIn,
    }),
    [
      search.category,
      search.page,
      search.pageSize,
      search.q,
      search.role,
      search.status,
      search.departmentId,
      search.signIn,
    ],
  );
  const key = JSON.stringify([userId, query]);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<ReadState | null>(null);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    void getAccounts({ data: query })
      .then((data) => {
        if (!cancelled)
          setState({
            key,
            owner: userId,
            revision,
            data,
            metadata: data,
            error: null,
          });
      })
      .catch(() => {
        if (!cancelled)
          setState((previous) => ({
            key,
            owner: userId,
            revision,
            data: null,
            metadata: previous?.owner === userId ? previous.metadata : null,
            error: "We couldn't load the accounts. Please try again.",
          }));
      });
    return () => {
      cancelled = true;
    };
  }, [userId, query, key, revision]);

  const current =
    state?.key === key && state.revision === revision ? state : null;
  return {
    data: current?.data ?? null,
    // Department choices and administrator controls stay stable while rows load.
    metadata: state?.owner === userId ? state.metadata : null,
    isLoading: current === null,
    error: current?.error ?? null,
    refresh,
  };
}
