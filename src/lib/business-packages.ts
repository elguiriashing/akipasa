export const businessPackageTools = {
  business: [
    "crm",
    "employees",
    "dashboard",
    "tasks",
    "calendar",
    "sales",
    "knowledge",
  ],
  business_pro: [
    "crm",
    "crm-social",
    "employees",
    "dashboard",
    "tasks",
    "calendar",
    "sales",
    "knowledge",
    "inventory",
    "inbox",
    "pos",
    "collaboration",
  ],
} as const;

export const businessCategories = [
  {
    key: "food",
    en: "Food & hospitality",
    es: "Gastronomía y hostelería",
    focus: ["POS", "Inventory", "Invoices"],
  },
  {
    key: "music",
    en: "Music & nightlife",
    es: "Música y ocio nocturno",
    focus: ["Calendar", "People", "Team Chat"],
  },
  {
    key: "social",
    en: "Social venue",
    es: "Local social",
    focus: ["CRM", "Inbox", "Calendar"],
  },
  {
    key: "workshop",
    en: "Classes & workshops",
    es: "Clases y talleres",
    focus: ["People", "Tasks", "Knowledge"],
  },
  {
    key: "family",
    en: "Family activities",
    es: "Actividades familiares",
    focus: ["Calendar", "Knowledge", "Inbox"],
  },
  {
    key: "sport",
    en: "Sport & fitness",
    es: "Deporte y fitness",
    focus: ["People", "Calendar", "Invoices"],
  },
] as const;

export const businessExtras = [
  {
    key: "extra_seat",
    en: "Extra dashboard seat",
    es: "Usuario adicional",
    price: "€0.99/month",
  },
  {
    key: "integrations",
    en: "Integrations",
    es: "Integraciones",
    price: "€3.99/month",
  },
  {
    key: "profile_boost",
    en: "Profile boost credit",
    es: "Crédito de impulso de perfil",
    price: "€15 each",
  },
] as const;

export const internalOnlyTools = [
  "sites",
  "analytics",
  "telegram",
  "marketing",
] as const;
