// Общие типы доменных данных. Используются через `satisfies` в data-файлах
// (ловят опечатки на сборке) и как основа Zod-схем Content Collections (Фаза 2).

export interface ContactInfo {
  phone: string;
  phoneHref: string;
  email: string;
  emailHref: string;
  address: string;
  instagram: string;
  company: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface Stat {
  value: string;
  unit: string;
  label: string;
}

export interface Service {
  num: string;
  title: string;
  desc: string;
}

export interface Advantage {
  title: string;
  desc: string;
}

/** Категория объектов на главной. Отдельно от Service: в Фазе 2 у проектов
 *  появятся location/year/category — это станет основой коллекции `projects`. */
export interface ProjectObject {
  num: string;
  title: string;
  desc: string;
  /** slug категории каталога — для перехода в /projects/?category= */
  category:
    | "country-house"
    | "cottage-village"
    | "glamping"
    | "barnhouse"
    | "resort-base"
    | "restaurant";
}

export interface Partner {
  name: string;
  logo: string;
}

export interface Stage {
  num: string;
  title: string;
  desc: string;
}

export interface FaqItem {
  q: string;
  a: string;
}
