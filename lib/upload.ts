export type UploadResult = {
  id: string;
  url: string;
  contentType?: string;
  size?: number;
  filename?: string;
};

/** 上传单个文件到 /api/upload,返回可访问 url */
export async function uploadFile(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Upload failed (${res.status})`);
  }
  return res.json();
}
