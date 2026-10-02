import { createImageUpload } from "./imageUpload.js";

export const avatarUpload = createImageUpload({
  fieldName: "avatar",
  namespace: "avatars",
  allowedTypeNames: ["jpeg", "png", "webp"],
});
