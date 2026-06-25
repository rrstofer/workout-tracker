export const ADMIN_USERNAMES = ["ryan", "tuna"];

const parseLegacyUserEmails = () => {
  const raw = import.meta.env.VITE_LEGACY_USER_EMAILS || "";
  const links = {};

  raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const [email, username] = entry.split(":").map((part) => part.trim().toLowerCase());
      if (email && username) {
        links[email] = username;
      }
    });

  return links;
};

export const LEGACY_USER_EMAILS = parseLegacyUserEmails();

export const slugifyUsername = (value) =>
  String(value || "user")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "user";
