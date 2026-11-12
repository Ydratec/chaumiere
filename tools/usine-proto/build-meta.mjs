// Génère public/usine/jeu/meta.js (window.USINE_META) à partir des fiches d'étapes lues par le jeu.
// Lancer depuis la racine du dépôt : node tools/usine-proto/build-meta.mjs
import { readFileSync, writeFileSync } from "node:fs";

const STAGES = [1, 2, 3, 4, 5]; // étapes jouables (voir STAGE_NAMES dans game.js)
const meta = Object.fromEntries(STAGES.map((n) => [n, JSON.parse(readFileSync(`public/usine/etape-${n}/etape.json`, "utf8"))]));
writeFileSync("public/usine/jeu/meta.js", `// Généré par tools/usine-proto/build-meta.mjs : ne pas modifier à la main.\nwindow.USINE_META = ${JSON.stringify(meta)};\n`);
console.log(`meta.js : étapes ${STAGES.join(", ")}`);
