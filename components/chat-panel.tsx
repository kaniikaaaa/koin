"use client"

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import { Bot, Send, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Markdown } from "@/components/markdown"
import { createChatMessage, getAssistantReply, type ChatMessage } from "@/lib/chat"

type PanelMessage = ChatMessage & { error?: boolean }

const SUGGESTIONS = [
  "Where can I cut spending?",
  "What's my biggest expense category?",
  "How did this month compare to last?",
]

export function ChatPanel({ context }: { context?: string }) {
  const [messages, setMessages] = useState<PanelMessage[]>([])
  const [input, setInput] = useState("")
  const [isReplying, setIsReplying] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Keep the conversation scrolled to the newest message.
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, isReplying])

  // Auto-grow the composer up to a max height.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || isReplying) return

    const nextMessages: PanelMessage[] = [...messages, createChatMessage("user", content)]
    setMessages(nextMessages)
    setInput("")
    setIsReplying(true)

    try {
      const reply = await getAssistantReply(nextMessages, context)
      setMessages((current) => [...current, createChatMessage("assistant", reply)])
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong."
      setMessages((current) => [...current, { ...createChatMessage("assistant", message), error: true }])
    } finally {
      setIsReplying(false)
      textareaRef.current?.focus()
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
    <section className="mt-6 flex h-[32rem] flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <span className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="size-5" />
        </span>
        <div>
          <h2 className="font-medium leading-tight">Ask MoneyMirror</h2>
          <p className="text-sm text-muted-foreground">Questions about your spending, answered.</p>
        </div>
      </div>

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center">
            <div className="max-w-md text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                <Bot className="size-6" />
              </span>
              <p className="mt-4 text-sm text-muted-foreground">
                Ask about your transactions, categories, or where to save. Try one of these:
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}

        {isReplying ? (
          <div className="flex items-end gap-2">
            <Avatar />
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-3">
              <Dot className="[animation-delay:-0.3s]" />
              <Dot className="[animation-delay:-0.15s]" />
              <Dot />
            </div>
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message MoneyMirror… (Enter to send, Shift+Enter for a new line)"
          className="max-h-40 min-h-10 flex-1 resize-none"
          rows={1}
        />
        <Button type="submit" disabled={!input.trim() || isReplying} aria-label="Send message">
          <Send className="size-4" />
          Send
        </Button>
      </form>
    </section>
  )
}

function MessageBubble({ message }: { message: PanelMessage }) {
  const isUser = message.role === "user"
  // Only the assistant's normal replies contain markdown; user input and error
  // bubbles stay as literal text.
  const renderMarkdown = !isUser && !message.error

  return (
    <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? <Avatar /> : null}
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
          renderMarkdown ? "" : "whitespace-pre-wrap"
        } ${
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : message.error
              ? "rounded-bl-sm border border-destructive/30 bg-destructive/10 text-destructive"
              : "rounded-bl-sm bg-muted text-foreground"
        }`}
      >
        {renderMarkdown ? <Markdown>{message.content}</Markdown> : message.content}
      </div>
    </div>
  )
}

function Avatar() {
  return (
    <span className="mb-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
      <Bot className="size-4" />
    </span>
  )
}

function Dot({ className = "" }: { className?: string }) {
  return <span className={`size-2 animate-bounce rounded-full bg-muted-foreground/60 ${className}`} />
}
