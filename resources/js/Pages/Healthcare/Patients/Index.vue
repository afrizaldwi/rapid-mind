<template>
    <HealthcareLayout>
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h2
                        class="text-xl font-black text-slate-900 tracking-tight"
                    >
                        Data Rekam Medis Pasien Terdata
                    </h2>
                    <p class="text-xs text-slate-500 mt-1">
                        Riwayat skrining dan status tindak lanjut klinis
                        penyintas bencana.
                    </p>
                </div>
            </div>

            <div class="relative max-w-xl">
                <span
                    class="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none"
                    >⌕</span
                >
                <input
                    v-model="searchQuery"
                    type="search"
                    placeholder="Cari nama atau NIK..."
                    class="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-xs focus:border-teal-700 focus:outline-none"
                />
            </div>

            <div
                class="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs"
            >
                <table class="w-full text-left text-xs">
                    <thead
                        class="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200"
                    >
                        <tr>
                            <th class="py-4 px-6">Nama Pasien</th>
                            <th class="py-4 px-6">NIK</th>
                            <th class="py-4 px-6">Posko Asal</th>
                            <th class="py-4 px-6">Status Terbaru</th>
                            <th class="py-4 px-6 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody
                        class="divide-y divide-slate-100 font-medium text-slate-800"
                    >
                        <tr
                            v-for="p in filteredPatients"
                            :key="p.id"
                            class="hover:bg-slate-50/70 transition"
                        >
                            <td class="py-4 px-6 font-bold text-slate-900">
                                {{ p.name }}
                            </td>
                            <td class="py-4 px-6 text-slate-500">
                                {{ maskNik(p.nik) }}
                            </td>
                            <td class="py-4 px-6">
                                {{ p.shelter?.name || "Posko tidak diketahui" }}
                            </td>
                            <td class="py-4 px-6">
                                <Badge :variant="latestBadge(p)">
                                    {{ latestCategory(p) }}
                                </Badge>
                                <p
                                    v-if="p.latest_clinical_status"
                                    class="mt-1 text-[11px] text-slate-500"
                                >
                                    {{
                                        latestSource(
                                            p.latest_clinical_status.source,
                                        )
                                    }}
                                    <span
                                        v-if="
                                            p.latest_clinical_status.occurred_at
                                        "
                                    >
                                        •
                                        {{
                                            formatDate(
                                                p.latest_clinical_status
                                                    .occurred_at,
                                            )
                                        }}
                                    </span>
                                </p>
                            </td>
                            <td class="py-4 px-6 text-right">
                                <Link
                                    :href="`/healthcare/patients/${p.id}`"
                                    class="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 font-bold rounded-lg transition"
                                >
                                    Detail Klinis →
                                </Link>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div
                    v-if="!patients || patients.length === 0"
                    class="p-8 text-center text-xs text-slate-400"
                >
                    Belum ada data pasien.
                </div>
                <div
                    v-else-if="filteredPatients.length === 0"
                    class="p-8 text-center text-xs text-slate-400"
                >
                    Tidak ada pasien yang cocok dengan pencarian.
                </div>
            </div>
        </div>
    </HealthcareLayout>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Link } from "@inertiajs/vue3";
import HealthcareLayout from "@/layouts/HealthcareLayout.vue";
import Badge from "@/components/ui/Badge.vue";

const props = defineProps<{
    patients: any[];
}>();

function latestCategory(patient: any): string {
    return patient.latest_clinical_status?.label || "Belum ada hasil";
}

function latestBadge(patient: any): "t0" | "t1" | "t2" | "t3" | "neutral" {
    const cat = patient.latest_clinical_status?.category;
    if (cat?.startsWith("T0")) return "t0";
    if (cat === "T1") return "t1";
    if (cat === "T2") return "t2";
    if (cat === "T3") return "t3";
    return "neutral";
}

function latestSource(source?: string): string {
    return (
        (
            {
                active_emergency: "Darurat aktif",
                emergency_decision: "Keputusan T0 Healthcare",
                assessment_validation: "Validasi Healthcare",
                system_recommendation: "Rekomendasi sistem",
            } as Record<string, string>
        )[source ?? ""] || "Sumber tidak tersedia"
    );
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
    }).format(new Date(value));
}

function maskNik(nik?: string): string {
    const normalized = String(nik ?? "").replace(/\D/g, "");
    if (normalized.length < 8) return "NIK tidak tersedia";
    return `${normalized.slice(0, 4)}••••${normalized.slice(-4)}`;
}

const searchQuery = ref("");
const filteredPatients = computed(() => {
    const query = searchQuery.value.trim().toLocaleLowerCase("id-ID");
    const digits = query.replace(/\D/g, "");
    if (!query) return props.patients ?? [];

    return (props.patients ?? []).filter((patient) => {
        const name = String(patient.name ?? "").toLocaleLowerCase("id-ID");
        const nik = String(patient.nik ?? "").replace(/\D/g, "");
        return (
            name.includes(query) || (digits.length > 0 && nik.includes(digits))
        );
    });
});
</script>
