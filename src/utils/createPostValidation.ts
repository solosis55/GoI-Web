import { POST_BODY_MAX, POST_BODY_MIN } from "../constants/createPost";
import type { PostFormat } from "../constants/postFormat";

export type CreatePostValidation = {
  canSubmit: boolean;
  hint: string;
  charCount: number;
};

/** Reglas alineadas con Goi App (`validateCreatePost`). */
export function validateCreatePost(
  content: string,
  imageCount: number,
  format: PostFormat = "standard",
): CreatePostValidation {
  const trimmed = content.trim();
  const charCount = trimmed.length;

  if (format === "standard" && imageCount === 0) {
    return {
      canSubmit: false,
      hint: "Añade al menos una foto para publicar.",
      charCount,
    };
  }

  if (format === "training" && imageCount === 0 && charCount < POST_BODY_MIN) {
    return {
      canSubmit: false,
      hint: `Escribe al menos ${POST_BODY_MIN - charCount} caracteres más o adjunta una foto.`,
      charCount,
    };
  }

  if (format === "standard" && imageCount > 0 && charCount < POST_BODY_MIN) {
    if (charCount > POST_BODY_MAX) {
      return {
        canSubmit: false,
        hint: `Te pasaste por ${charCount - POST_BODY_MAX} caracteres.`,
        charCount,
      };
    }
    return { canSubmit: true, hint: "", charCount };
  }

  if (charCount > POST_BODY_MAX) {
    return {
      canSubmit: false,
      hint: `Te pasaste por ${charCount - POST_BODY_MAX} caracteres.`,
      charCount,
    };
  }

  return { canSubmit: true, hint: "", charCount };
}

/** @deprecated Usar validateCreatePost(..., "standard") */
export function validateStandardCreatePost(content: string, imageCount: number): CreatePostValidation {
  return validateCreatePost(content, imageCount, "standard");
}
