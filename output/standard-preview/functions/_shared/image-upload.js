import { str } from "./common.js";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const IMAGE_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export async function readUpload(request) {
  const contentTypeHeader = String(request.headers.get("content-type") || "").trim();
  if (contentTypeHeader.toLowerCase().startsWith("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") throw uploadError("image file required", 422);
    return {
      body: file,
      size: Number(file.size || 0),
      contentType: normalizeContentType(file.type),
      claim: str(form.get("claim")).slice(0, 500),
      filename: str(file.name).slice(0, 255),
      folder: str(form.get("folder")),
      signature: new Uint8Array(await file.slice(0, 16).arrayBuffer()),
    };
  }

  const contentType = normalizeContentType(contentTypeHeader);
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > MAX_UPLOAD_BYTES) throw uploadError("image must be 10 MB or smaller", 413);
  const body = await request.arrayBuffer();
  return {
    body,
    size: body.byteLength,
    contentType,
    claim: str(new URL(request.url).searchParams.get("claim")).slice(0, 500),
    signature: new Uint8Array(body.slice(0, 16)),
  };
}

function normalizeContentType(value) {
  return String(value || "").split(";", 1)[0].trim().toLowerCase();
}

function uploadError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function matchesImageSignature(contentType, bytes) {
  if (contentType === "image/png") {
    return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (contentType === "image/jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (contentType === "image/gif") {
    return startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61])
      || startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  }
  if (contentType === "image/webp") {
    return startsWith(bytes, [0x52, 0x49, 0x46, 0x46])
      && startsWith(bytes?.slice(8), [0x57, 0x45, 0x42, 0x50]);
  }
  return false;
}

function startsWith(actual, expected) {
  return expected.every((byte, index) => actual?.[index] === byte);
}
