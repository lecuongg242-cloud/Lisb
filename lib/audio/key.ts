import "server-only";
import { createHash } from "node:crypto";

/**
 * Khóa của file âm thanh sinh sẵn cho một đoạn văn bản.
 * Phải khớp với công thức trong tools/audio/generate.mjs: 20 ký tự đầu của sha1(văn bản).
 */
export function audioKey(text: string): string {
  return createHash("sha1").update(text).digest("hex").slice(0, 20);
}
