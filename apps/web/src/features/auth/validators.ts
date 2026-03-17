export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validatePassword(value: string) {
  if (value.length < 8) {
    return "La contrasena debe tener al menos 8 caracteres.";
  }

  if (!/[A-Z]/.test(value)) {
    return "La contrasena debe incluir al menos una mayuscula.";
  }

  if (!/[a-z]/.test(value)) {
    return "La contrasena debe incluir al menos una minuscula.";
  }

  if (!/[0-9]/.test(value)) {
    return "La contrasena debe incluir al menos un numero.";
  }

  return null;
}
