import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const disclaimer =
    "Hasil asesmen ini bersifat REKOMENDASI SISTEM sebagai alat bantu keputusan awal hingga dilakukan VALIDASI KLINIS resmi oleh Tenaga Kesehatan / Spesialis Profesional.";
const heading = "Rekomendasi Sistem (Bukan Diagnosis Medis):";

test("assessment result uses the exact authoritative disclaimer", () => {
    const workflow = readFileSync(
        new URL("../../docs/workflow.md", import.meta.url),
        "utf8",
    );
    const result = readFileSync(
        new URL("../../resources/js/Pages/Relawan/Assessment/Result.vue", import.meta.url),
        "utf8",
    );
    const section = result.split("<!-- Clinical Safety Disclaimer -->")[1]?.split("<!-- Action Buttons -->")[0];

    assert.ok(workflow.includes(disclaimer));
    assert.ok(section, "Clinical Safety Disclaimer section is present");
    assert.ok(section.replace(/\s+/g, " ").includes(disclaimer));
    assert.ok(section.includes(heading));
});
