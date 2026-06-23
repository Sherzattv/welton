// Префиксует путь к ассету из public/ текущим base-путём сайта.
// На GitHub Pages проект публикуется по адресу /welton/, поэтому абсолютные
// "/img/..." ссылки нужно строить от import.meta.env.BASE_URL ("/welton/").
// BASE_URL может прийти как "/welton" или "/welton/" — нормализуем без хвоста.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const asset = (path: string): string =>
  `${BASE}/${path.replace(/^\//, "")}`;
