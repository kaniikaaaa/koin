import { UploadDropzone } from "@/components/upload-dropzone"

export default function UploadPage() {
  return (
    <section className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-8">
      <UploadDropzone />
    </section>
  )
}
