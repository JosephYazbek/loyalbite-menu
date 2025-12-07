export const COUNTRY_OPTIONS = [
  { value: "+961", label: "Lebanon (+961)" },
  { value: "+971", label: "UAE (+971)" },
  { value: "+966", label: "Saudi (+966)" },
  { value: "+965", label: "Kuwait (+965)" },
  { value: "+974", label: "Qatar (+974)" },
  { value: "+962", label: "Jordan (+962)" },
  { value: "+90", label: "Turkey (+90)" },
  { value: "+1", label: "USA / Canada (+1)" },
];

export const sanitizeDigits = (value: string) => value.replace(/[^\d]/g, "");

export const splitInternationalNumber = (
  raw: string | null,
  fallback: string
) => {
  if (!raw) return { code: fallback, number: "" };
  const trimmed = raw.trim();
  const intlMatch = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
  if (intlMatch) {
    return {
      code: intlMatch[1],
      number: sanitizeDigits(intlMatch[2]),
    };
  }
  return {
    code: fallback,
    number: sanitizeDigits(trimmed),
  };
};

export const formatInternationalNumber = (code: string, digits: string) => {
  const normalized = sanitizeDigits(digits);
  if (!normalized) return null;
  if (!code.startsWith("+")) {
    return `+${code}${normalized}`;
  }
  return `${code}${normalized}`;
};
