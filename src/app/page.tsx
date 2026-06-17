import { UploadDropzone } from "@/components/upload-dropzone"

export default function HomePage() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="space-y-5">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">Local finance tracker MVP</p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-normal text-foreground sm:text-6xl">
          MoneyMirror
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
          Upload one or more CSV statements and get clean monthly charts, category tables, and practical spending suggestions.
        </p>
      </div>

      <div className="flex justify-center lg:justify-end">
        <UploadDropzone />
      </div>
    </section>
  )
}
