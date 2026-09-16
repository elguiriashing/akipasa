// Rebuild the locally served, licensed destination photo catalogue.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

const landmarks = {
  vigo: "Castro fortress",
  gijon: "Elogio del Horizonte",
  elche: "Palmeral of Elche",
  jerez: "Jerez de la Frontera Cathedral",
  cartagena: "Roman theatre of Cartagena",
  marbella: "Plaza de los Naranjos",
  santiago: "Santiago de Compostela Cathedral",
  merida: "Roman theatre of Mérida",
  ibiza: "Ibiza Cathedral",
  alcala: "University of Alcalá",
  badalona: "Pont del Petroli",
  terrassa: "Masia Freixa",
  sabadell: "Sant Fèlix de Sabadell",
  "la-laguna": "La Laguna Cathedral",
  "a-coruna": "Tower of Hercules",
  albacete: "Pasaje de Lodares",
  alicante: "Santa Bárbara Castle",
  almeria: "Alcazaba of Almería",
  avila: "Walls of Ávila",
  badajoz: "Alcazaba of Badajoz",
  barcelona: "Sagrada Família",
  bilbao: "Guggenheim Museum Bilbao",
  burgos: "Burgos Cathedral",
  caceres: "Cáceres, Spain",
  cadiz: "Cádiz Cathedral",
  castellon: "El Fadrí",
  ceuta: "Royal Walls of Ceuta",
  "ciudad-real": "Puerta de Toledo (Ciudad Real)",
  cordoba: "Roman bridge of Córdoba",
  cuenca: "Hanging Houses of Cuenca",
  "donostia-san-sebastian": "Beach of La Concha",
  girona: "Onyar",
  granada: "Alhambra",
  guadalajara: "Palace of the Infantado",
  huelva: "Monument to the Discovery Faith",
  huesca: "Huesca Cathedral",
  jaen: "Jaén Cathedral",
  "las-palmas": "Las Canteras",
  leon: "León Cathedral",
  lleida: "La Seu Vella",
  logrono: "Co-cathedral of Santa María de la Redonda",
  lugo: "Roman walls of Lugo",
  madrid: "Metropolis Building, Madrid",
  malaga: "Alcazaba of Málaga",
  melilla: "Melilla la Vieja",
  murcia: "Murcia Cathedral",
  ourense: "Ponte Vella",
  oviedo: "Oviedo Cathedral",
  palencia: "Palencia Cathedral",
  palma: "Palma Cathedral",
  pamplona: "Pamplona Cathedral",
  pontevedra: "Church of the Pilgrim Virgin",
  salamanca: "Plaza Mayor, Salamanca",
  "santa-cruz-tenerife": "Auditorio de Tenerife",
  santander: "Palacio de la Magdalena",
  segovia: "Aqueduct of Segovia",
  sevilla: "Plaza de España, Seville",
  soria: "Ermita de San Saturio",
  tarragona: "Tarragona Amphitheatre",
  teruel: "Tower of El Salvador",
  toledo: "Alcázar of Toledo",
  valencia: "L'Hemisfèric",
  valladolid: "Plaza Mayor, Valladolid",
  "vitoria-gasteiz": "Plaza de la Virgen Blanca",
  zamora: "Zamora Cathedral",
  zaragoza: "Cathedral-Basilica of Our Lady of the Pillar",
};
const output = new URL("../public/images/cities/", import.meta.url);
await mkdir(output, { recursive: true });
const manifestPath = new URL("../src/lib/city-photos.json", import.meta.url);
const manifest = JSON.parse(
  await readFile(manifestPath, "utf8").catch(() => "{}"),
);
const clean = (text = "") =>
  text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#160;/g, " ")
    .trim();
async function api(host, params) {
  const url = new URL(`https://${host}/w/api.php`);
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    ...params,
  });
  const response = await fetch(url, {
    headers: { "User-Agent": "AkiPasaCityCatalogue/1.0 (https://akipasa.com)" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return Object.values((await response.json()).query?.pages || {});
}
for (const [key, landmark] of Object.entries(landmarks)) {
  if (manifest[key] && !process.argv.includes(key)) continue;
  try {
    const [page] = await api("en.wikipedia.org", {
      titles: landmark,
      redirects: "1",
      prop: "pageimages",
      piprop: "name",
    });
    let images;
    if (
      page?.pageimage &&
      /\.(jpg|jpeg|png)$/i.test(page.pageimage) &&
      !/collage|montage/i.test(page.pageimage)
    ) {
      images = await api("commons.wikimedia.org", {
        titles: `File:${page.pageimage}`,
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: "960",
      });
    } else {
      images = await api("commons.wikimedia.org", {
        generator: "search",
        gsrsearch: `${landmark} filetype:bitmap -collage -montage`,
        gsrnamespace: "6",
        gsrlimit: "5",
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: "960",
      });
      images.sort((a, b) => a.index - b.index);
    }
    const suitable = (p) => {
      const info = p.imageinfo?.[0];
      return (
        info &&
        /^(CC BY|CC0|Public domain)/.test(
          info.extmetadata.LicenseShortName?.value || "",
        ) &&
        !info.extmetadata.Restrictions?.value
      );
    };
    let selected = images.find(suitable);
    if (!selected) {
      images = await api("commons.wikimedia.org", {
        generator: "search",
        gsrsearch: `${landmark} filetype:bitmap -collage -montage -logo`,
        gsrnamespace: "6",
        gsrlimit: "10",
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: "960",
      });
      images.sort((a, b) => a.index - b.index);
      selected = images.find(suitable);
    }
    if (!selected) throw new Error("No suitable licensed image");
    const info = selected.imageinfo[0];
    const meta = info.extmetadata;
    const imageUrl = new URL(info.thumburl || info.url);
    imageUrl.search = "";
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Image ${response.status}`);
    const buffer = await sharp(Buffer.from(await response.arrayBuffer()))
      .rotate()
      .resize({
        width: 960,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
    await writeFile(new URL(`${key}.webp`, output), buffer);
    manifest[key] = {
      src: `/images/cities/${key}.webp`,
      landmark,
      title: selected.title.replace(/^File:/, ""),
      author:
        clean(meta.Artist?.value) ||
        (selected.title === "File:Girona river-street.jpeg"
          ? "Filip Maljkovic"
          : "Author not listed"),
      credit:
        clean(meta.Attribution?.value || meta.Artist?.value) ||
        (selected.title === "File:Girona river-street.jpeg"
          ? "Filip Maljkovic"
          : "Author not listed"),
      license: meta.LicenseShortName.value,
      licenseUrl:
        meta.LicenseUrl?.value ||
        "https://creativecommons.org/publicdomain/mark/1.0/",
      source: info.descriptionurl,
      changes:
        "Resized and converted to WebP; displayed with a responsive crop.",
    };
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    console.log(
      `${key}: ${selected.title} (${Math.round(buffer.length / 1024)} KB)`,
    );
  } catch (error) {
    console.error(`${key}: ${error.message}`);
  }
}
