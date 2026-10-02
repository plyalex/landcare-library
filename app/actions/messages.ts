"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { notifyMessage } from "@/lib/notify";

export async function sendMessage(recipientId: string, body: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireMember();
  const text = body.trim();
  if (!text) return { error: "Write a message first." };
  if (text.length > 4000) return { error: "Keep messages under 4,000 characters." };
  if (recipientId === user.id) return { error: "You can't message yourself." };

  const { error } = await supabase
    .from("messages")
    .insert({ sender_id: user.id, recipient_id: recipientId, body: text });
  if (error) return { error: "The message couldn't be sent. Try again." };

  after(() => notifyMessage(user.id, recipientId, text));
  revalidatePath(`/messages/${recipientId}`);
  revalidatePath("/messages");
  return {};
}
