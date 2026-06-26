// Хелперы для работы с файлами проекта из коллекции `projects`.
// Файлы лежат в /public/projects/<folder>/, где folder — короткое имя
// папки на диске ("01".."82"); id записи коллекции при этом — "wlt-NN".

import { asset } from "@lib/asset";

/** Путь к файлу проекта. thumb=true — берём из подпапки thumbs/. */
export const projectFile = (
  folder: string,
  file: string,
  thumb = false,
): string => asset(`/projects/${folder}/${thumb ? "thumbs/" : ""}${file}`);

/** Отображаемое имя проекта. Пока title не наполнен — показываем код "WLT-NN". */
export const projectTitle = (p: { folder: string; title?: string }): string =>
  p.title ?? `WLT-${p.folder}`;
