import { redirect } from "next/navigation";

type ResetPasswordPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = new URLSearchParams();

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === "string" && value.length > 0) {
        params.set(key, value);
      }
    }
  }

  params.set("recovery", "1");
  params.set("type", "recovery");

  redirect(`/login?${params.toString()}`);
}
