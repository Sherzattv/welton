// Сквозные данные сайта (не контент конкретной страницы): контакты и навигация.
// Потребители — Header, Footer, CtaCalc. Контент главной — в home.ts.

import type { ContactInfo, NavItem } from "@/types";

export const contact = {
  phone: "+7 700 510 10 30",
  phoneHref: "tel:+77005101030",
  email: "mail@welton.kz",
  emailHref: "mailto:mail@welton.kz",
  address: "г. Алматы, ул. Кунаева, 43",
  instagram: "https://instagram.com/welton.kz",
  company: "ТОО «Велтон»",
} satisfies ContactInfo;

export const nav = [
  { label: "Технологии", href: "#services" },
  { label: "О компании", href: "#about" },
  { label: "Партнеры", href: "#partners" },
  { label: "Этапы работы", href: "#stages" },
  { label: "Контакты", href: "#contacts" },
] satisfies NavItem[];
