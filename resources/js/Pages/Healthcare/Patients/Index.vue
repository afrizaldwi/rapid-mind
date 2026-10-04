<template>
    <HealthcareLayout>
        <div class="space-y-5 max-w-5xl">
            <!-- Page Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 class="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
                        Rekam Medis Pasien
                    </h1>
                    <p class="text-xs text-slate-500 mt-1 font-normal">
                        Direktori rekam jejak skrining dan status tindak lanjut klinis penyintas bencana.
                    </p>
                </div>

                <!-- Search Input -->
                <div class="relative w-full sm:w-72">
                    <span class="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 pointer-events-none">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        v-model="searchQuery"
                        type="search"
                        placeholder="Cari nama atau NIK..."
                        class="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-700 focus:outline-none"
                    />
                </div>
            </div>

            <!-- Unified Table Surface -->
            <div class="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-50/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-100">
                            <tr>
                                <th class="py-3 px-4">Nama Pasien</th>
                                <th class="py-3 px-4">NIK</th>
                                <th class="py-3 px-4">Posko Lapangan</th>
                                <th class="py-3 px-4">Status Klinis Terkini</th>
                                <th class="py-3 px-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 font-normal text-slate-800">
                            <tr
                                v-for="p in filteredPatients"
                                :key="p.id"
                                class="hover:bg-slate-50/60 transition"
                            >
                                <td class="py-3 px-4 font-bold text-slate-900">
                                    {{ p.name }}
                                </td>
                                <td class="py-3 px-4 font-mono text-slate-500">
                                    {{ maskNik(p.nik) }}
                                </td>
                                <td class="py-3 px-4 text-slate-600">
                                    {{ p.shelter?.name || "Posko tidak diketahui" }}
                                </td>
                                <td class="py-3 px-4">
                                    <div class="flex items-center gap-1.5 text-xs font-bold" :class="latestTextColor(p)">
                                        <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="latestDotColor(p)"></span>
                                        <span>{{ latestCategory(p) }}</span>
                                    </div>
                                    <p
                                        v-if="p.latest_clinical_status"
                                        class="mt-0.5 text-[11px] text-slate-400"
                                    >
                                        <template
                                            v-if="p.latest_clinical_status.source === 'active_emergency'"
                                        >
                                            Insiden darurat
                                        </template>
                                        <template v-else>
                                            {{ latestSource(p.latest_clinical_status.source) }}
                                        </template>
                                        <span v-if="p.latest_clinical_status.occurred_at">
                                            • {{ formatDate(p.latest_clinical_status.occurred_at) }}
                                        </span>
                                    </p>
                                </td>
                                <td class="py-3 px-4 text-right">
                                    <Link
                                        :href="`/healthcare/patients/${p.id}`"
                                        class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition inline-block"
                                    >
                                        Detail Pasien
                                    </Link>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div
                    v-if="!patients || patients.length === 0"
                    class="p-8 text-center text-xs text-slate-400"
                >
                    Belum ada data pasien terdata.
                </div>
                <div
                    v-else-if="filteredPatients.length === 0"
                    class="p-8 text-center text-xs text-slate-400"
                >
                    Tidak ada pasien yang cocok dengan kata kunci pencarian.
                </div>
            </div>
        </div>
    </HealthcareLayout>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Link } from "@inertiajs/vue3";
import HealthcareLayout from "@/layouts/HealthcareLayout.vue";

const props = defineProps<{
    patients: any[];
}>();

function latestCategory(patient: any): string {
    return patient.latest_clinical_status?.label || "Belum ada hasil";
}

function latestTextColor(patient: any): string {
    const cat = patient.latest_clinical_status?.category;
    if (cat?.startsWith("T0")) return "text-rose-700";
    if (cat === "T1") return "text-orange-700";
    if (cat === "T2") return "text-amber-700";
    if (cat === "T3") return "text-emerald-700";
    return "text-slate-500";
}

function latestDotColor(patient: any): string {
    const cat = patient.latest_clinical_status?.category;
    if (cat?.startsWith("T0")) return "bg-rose-600";
    if (cat === "T1") return "bg-orange-600";
    if (cat === "T2") return "bg-amber-600";
    if (cat === "T3") return "bg-emerald-600";
    return "bg-slate-400";
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
