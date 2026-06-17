"use client"

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createChatMessage, getAssistantReply, type ChatMessage } from "@/lib/chat"

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isReplying, setIsReplying] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, isReplying])

  async function sendMessage() {
    const content = input.trim()
    if (!content || isReplying) return

    const nextMessages = [...messages, createChatMessage("user", content)]
    setMessages(nextMessages)
    setInput("")
    setIsReplying(true)

    try {
      const reply = await getAssistantReply(nextMessages)
      setMessages((current) => [...current, createChatMessage("assistant", reply)])
    } finally {
      setIsReplying(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    sendMessage()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <section className="mt-6 flex h-[28rem] flex-col rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4">
        <h2 className="font-medium">Ask MoneyMirror</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Chat about your spending. The assistant isn&apos;t connected to a model yet.
        </p>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="grid h-full place-items-center text-center text-sm text-muted-foreground">
            Ask something like &ldquo;Where can I cut spending?&rdquo; to get started.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))
        )}
        {isReplying ? (
          <div className="flex justify-start">
            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Thinking&hellip;
            </div>
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message MoneyMirror… (Enter to send, Shift+Enter for a new line)"
          className="max-h-32 min-h-10 flex-1 resize-none"
          rows={1}
        />
        <Button type="submit" disabled={!input.trim() || isReplying}>
          <Send className="size-4" />
          Send
        </Button>
      </form>
    </section>
  )
}
