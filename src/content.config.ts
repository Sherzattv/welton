// Коллекция projects: 82 объекта из /public/projects/.
// Кастомный loader на каждом билде сканирует папки, читает project.json
// и проставляет реальный набор файлов (renders/floorplans варьируются).
//
// id записи = "wlt-NN" — он же slug URL (/projects/wlt-01/).
// Папка на диске сохраняет короткое имя "01" — это технический ключ к файлам.

import { defineCollection, z } from "astro:content";
import { readdir, readFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { join, resolve } from "node:path";
import { projectOverrides } from "@data/projectOverrides";

const projectsDir = resolve(process.cwd(), "public/projects");

const category = z.enum([
  "country-house",
  "cottage-village",
  "glamping",
  "barnhouse",
  "resort-base",
  "restaurant",
]);

const technology = z.enum(["monolith", "stone", "sip", "metal", "sandwich"]);

const projects = defineCollection({
  loader: async () => {
    const entries = await readdir(projectsDir, { withFileTypes: true });
    const folders = entries
      .filter((d: Dirent) => d.isDirectory() && /^\d+$/.test(d.name))
      .map((d: Dirent) => d.name)
      .sort();

    return Promise.all(
      folders.map(async (folder: string) => {
        const files = await readdir(join(projectsDir, folder));
        const has = (name: string) => files.includes(name);

        const renders = ["3d-1.jpg", "3d-2.jpg"].filter(has);
        const floorplans = has("plan.png")
          ? ["plan.png"]
          : ["plan-1.png", "plan-2.png"].filter(has);

        const json = JSON.parse(
          await readFile(join(projectsDir, folder, "project.json"), "utf-8"),
        );

        const id = `wlt-${folder}`;
        const override = projectOverrides[id] ?? {};

        return {
          id,
          folder,
          area: json.area,
          width: json.width,
          depth: json.depth,
          floors: json.floors,
          pages: json.pages,
          note: json.note,
          facade: "facade.png",
          renders,
          floorplans,
          ...override,
        };
      }),
    );
  },
  schema: z.object({
    folder: z.string(),
    area: z.number(),
    width: z.number(),
    depth: z.number(),
    floors: z.number(),
    pages: z.string().optional(),
    note: z.string().optional(),
    facade: z.string(),
    renders: z.array(z.string()),
    floorplans: z.array(z.string()),

    // ─── Опциональная мета: заполняется вручную/через API позже ───
    title: z.string().optional(),
    tagline: z.string().optional(),
    description: z.string().optional(),
    category: category.optional(),
    technology: technology.optional(),
    bedrooms: z.number().optional(),
    bathrooms: z.number().optional(),
    wallMaterial: z.string().optional(),
    wallThickness: z.string().optional(),
    roof: z.string().optional(),
    priceFrom: z.number().nullable().optional(),
    featured: z.boolean().optional(),
  }),
});

export const collections = { projects };
