// Префиксует путь к ассету из public/ текущим base-путём сайта.
// Сейчас сайт обслуживается из корня домена (base не задан), поэтому BASE_URL = "/"
// и asset("/img/x") === "/img/x". Если base когда-нибудь снова появится — все пути
// из public/, обёрнутые в asset(), переедут автоматически.
// BASE_URL может прийти как "/" или "/что-то/" — нормализуем без хвостового слэша.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const asset = (path: string): string =>
  `${BASE}/${path.replace(/^\//, "")}`;
