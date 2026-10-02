"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  joinWithCode,
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  type FormState,
} from "@/app/actions/auth";

function Feedback({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p role="alert" className="font-bold text-redgum">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="font-bold text-gum">
        {state.message}
      </p>
    );
  return null;
}

function Field(props: { id: string; label: string; type?: string; autoComplete?: string; hint?: string }) {
  return (
    <div>
      <label className="label" htmlFor={props.id}>
        {props.label}
      </label>
      <input
        id={props.id}
        name={props.id}
        type={props.type ?? "text"}
        autoComplete={props.autoComplete}
        className="field"
        required
      />
      {props.hint && <p className="hint mt-1">{props.hint}</p>}
    </div>
  );
}

export function LoginForm({ linkError }: { linkError?: boolean }) {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action} className="mt-6 grid gap-4">
      {linkError && (
        <p role="alert" className="font-bold text-redgum">
          That link has expired or was already used. Sign in, or request a new password reset link.
        </p>
      )}
      <Field id="email" label="Email" type="email" autoComplete="email" />
      <Field id="password" label="Password" type="password" autoComplete="current-password" />
      <Feedback state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-sm">
        <Link href="/forgot" className="link">
          Forgot your password?
        </Link>
      </p>
      <p className="border-t border-line pt-4">
        New member?{" "}
        <Link href="/signup" className="link font-bold">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, {});
  return (
    <form action={action} className="mt-6 grid gap-4">
      <Field id="name" label="Your name" autoComplete="name" />
      <Field id="email" label="Email" type="email" autoComplete="email" />
      <Field
        id="password"
        label="Choose a password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
      />
      <Field
        id="code"
        label="Join code"
        hint="The group's join code, from the secretary or the members' email."
      />
      <Feedback state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-sm">
        Already a member?{" "}
        <Link href="/login" className="link">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});
  return (
    <form action={action} className="mt-6 grid gap-4">
      <Field id="email" label="Email" type="email" autoComplete="email" />
      <Feedback state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Email me a reset link"}
      </button>
      <p className="text-sm">
        <Link href="/login" className="link">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(updatePassword, {});
  return (
    <form action={action} className="mt-6 grid gap-4">
      <Field id="password" label="New password" type="password" autoComplete="new-password" hint="At least 8 characters." />
      <Feedback state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}

export function JoinForm() {
  const [state, action, pending] = useActionState(joinWithCode, {});
  return (
    <form action={action} className="mt-6 grid gap-4">
      <Field id="code" label="Join code" />
      <Feedback state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Checking…" : "Join the library"}
      </button>
    </form>
  );
}
