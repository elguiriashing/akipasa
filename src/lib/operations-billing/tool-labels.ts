/** Same canonical keys and bilingual labels as AkiBusiness assets/toolbox.js. */
export const OPERATION_TOOL_LABELS = {
  en: {
    crm: "Customers / CRM",
    inbox: "Inbox & support",
    tasks: "Tasks & projects",
    calendar: "Calendar",
    inventory: "Inventory",
    pos: "Point of sale",
    sales: "Sales & billing",
    marketing: "Marketing & sites",
    automation: "Automation",
    collaboration: "Team chat",
    employees: "Staff",
    knowledge: "Knowledge",
  },
  es: {
    crm: "Clientes / CRM",
    inbox: "Bandeja y soporte",
    tasks: "Tareas y proyectos",
    calendar: "Calendario",
    inventory: "Inventario",
    pos: "Punto de venta",
    sales: "Ventas y facturación",
    marketing: "Marketing y webs",
    automation: "Automatización",
    collaboration: "Chat del equipo",
    employees: "Personal",
    knowledge: "Conocimiento",
  },
} as const;
export function operationToolLabel(tool: string, locale: "en" | "es"): string {
  return (
    OPERATION_TOOL_LABELS[locale][
      tool as keyof typeof OPERATION_TOOL_LABELS.en
    ] || tool
  );
}
