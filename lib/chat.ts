import { createId } from "@/lib/money-id"

export type ChatRole = "user" | "assistant"

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: string
}

export function createChatMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id: createId("msg"),
    role,
    content,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Send the conversation to the server-side chat route (which calls OpenAI with
 * the key from the environment) and return the assistant's reply.
 *
 * `context` is a plain-text summary of the user's finances; it's injected into
 * the system prompt so answers are grounded in the uploaded data.
 *
 * Throws with a human-readable message on failure so the UI can surface it.
 */
export async function getAssistantReply(
  messages: ChatMessage[],
  context?: string
): Promise<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    }),
  })

  const data = (await response.json().catch(() => null)) as
    | { reply?: string; error?: string }
    | null

  if (!response.ok || !data?.reply) {
    throw new Error(data?.error ?? "The assistant is unavailable right now.")
  }

  return data.reply
}
