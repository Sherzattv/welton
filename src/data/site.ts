// Сквозные данные сайта (не контент конкретной страницы): контакты и навигация.
// Потребители — Header, Footer, CtaCalc. Контент главной — в home.ts.

import type { ContactInfo, NavItem } from "@/types";

export const contact = {
  phone: "+7 903 021 12 88",
  phoneHref: "tel:+79030211288",
  email: "zakaz.velesgroup@mail.ru",
  emailHref: "mailto:zakaz.velesgroup@mail.ru",
  address:
    "107564, г.Москва, ул. Краснобогатырская, д. 38 стр. 2 , помещ. 1н/4",
  telegram: "https://t.me/velesgroup2026",
  max: "https://max.ru/u/f9LHodD0cOKa30SIOmUqIhTqGGMg_IFGfR6i8brxKQYD_MnJrhg1G5IUN_I",
  company: "ООО «Велес Групп»",
  inn: "9718270842",
  kpp: "771801001",
} satisfies ContactInfo;

export const nav = [
  { label: "Направления", href: "#services" },
  { label: "О компании", href: "#about" },
  { label: "Партнеры", href: "#partners" },
  { label: "Этапы работы", href: "#stages" },
  { label: "Контакты", href: "#contacts" },
] satisfies NavItem[];
