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
 * Returns the assistant's reply for the current conversation.
 *
 * TODO: connect to an LLM. This is intentionally the single integration point —
 * the chat UI is already fully wired, so wiring up a real model later only means
 * replacing the body of this function (e.g. POST the messages to an API route).
 */
export async function getAssistantReply(messages: ChatMessage[]): Promise<string> {
  void messages
  return "AI insights are coming soon — this assistant isn't connected to a model yet. Your message was received."
}
