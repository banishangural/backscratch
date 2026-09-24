"use client";

import { useActionState } from "react";
import type { ProductStatus } from "@/generated/prisma/enums";
import { moderateProduct } from "@/lib/admin/actions";

const button = "rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50";

// Approve / reject / suspend controls for one product in the admin list.
export function AdminActions({ productId, status, verified }: { productId: string; status: ProductStatus; verified: boolean }) {
  const [state, formAction, pending] = useActionState(moderateProduct, null);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="productId" value={productId} />
      {status !== "SUSPENDED" && (
        <input
          name="reason"
          maxLength={500}
          placeholder="Reason (required to reject or suspend; shown to the founder)"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
      )}
      <div className="flex flex-wrap gap-2">
        {status === "PENDING" && (
          <>
            <button name="action" value="approve" disabled={pending || !verified} className={`${button} bg-emerald-600 text-white`}>
              Approve
            </button>
            <button name="action" value="reject" disabled={pending} className={`${button} bg-red-600 text-white`}>
              Reject
            </button>
          </>
        )}
        {status !== "SUSPENDED" && (
          <button name="action" value="suspend" disabled={pending} className={`${button} border border-red-600 text-red-600`}>
            Suspend
          </button>
        )}
        {status === "SUSPENDED" && (
          <button name="action" value="unsuspend" disabled={pending} className={`${button} border border-zinc-400`}>
            Unsuspend
          </button>
        )}
      </div>
      {state && <p className={`text-xs ${state.ok ? "text-emerald-600" : "text-red-600"}`}>{state.message}</p>}
    </form>
  );
}
