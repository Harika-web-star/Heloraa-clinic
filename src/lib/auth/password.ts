
export const PASSWORD_HELP =
  "Use at least 8 characters, including an uppercase letter, a lowercase letter, and a symbol.";

export function getPasswordRequirements(password: string) {
  return {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function isStrongPassword(password: string): boolean {
  const requirements = getPasswordRequirements(password);

  return (
    requirements.length &&
    requirements.lowercase &&
    requirements.uppercase &&
    requirements.special
  );
}
