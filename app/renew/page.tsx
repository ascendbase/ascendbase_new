import { redirect } from "next/navigation";

// Renewal landing: existing members extend their access at the discounted
// member price. All logic lives in the checkout flow (?renew=1 mode).
export default function RenewPage() {
  redirect("/checkout?renew=1");
}
