import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Create organizer account" };

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-xl px-5 py-16 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-[#537b26]">For organizers</p>
      <h1 className="mt-3 text-4xl font-bold">Start organizing</h1>
      <p className="mt-4 text-[#596760]">Create an account to manage your community workshops.</p>
      <AuthForm mode="sign-up" />
    </div>
  );
}
