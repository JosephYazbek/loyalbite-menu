// app/admin/menu/page.tsx
import { redirect } from "next/navigation";

export default function MenuIndexPage() {
  // Redirect to categories by default
  redirect("/admin/menu/categories");
}
