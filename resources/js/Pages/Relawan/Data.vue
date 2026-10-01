<template>
    <RelawanLayout>
        <div class="space-y-6 pb-20">
            <!-- Header -->
            <div
                class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between"
            >
                <div>
                    <h2 class="text-xl font-extrabold text-slate-900">
                        Data Lapangan
                    </h2>
                    <p class="text-xs text-slate-500 mt-1">
                        Status penyimpanan lokal dan sinkronisasi server.
                    </p>
                </div>
                <button
                    type="button"
                    :disabled="isSyncing"
                    @click="triggerSync"
                    class="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs rounded-xl shadow-xs transition"
                >
                    <span>{{
                        isSyncing ? "Menyinkronkan…" : "↻ Sinkronkan"
                    }}</span>
                </button>
            </div>

            <!-- Section 1: In Progress Assessments -->
            <div v-if="inProgress && inProgress.length > 0" class="space-y-3">
                <h3
                    class="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center space-x-1.5"
                >
                    <span>⏳</span>
                    <span>Sedang Dikerjakan ({{ inProgress.length }})</span>
                </h3>
                <div class="space-y-2">
                    <div
                        v-for="item in inProgress"
                        :key="item.id"
                        class="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex items-center justify-between"
                    >
                        <div>
                            <h4 class="font-bold text-sm text-slate-900">
                                {{ item.patient?.name || "Penyintas" }}
                            </h4>
                            <p class="text-xs text-slate-500">
                                NIK: {{ item.patient?.nik || "Tanpa NIK" }} •
                                Mode: {{ item.mode }}
                            </p>
                        </div>
                        <Link
                            :href="item.resume_url"
                            class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition"
                        >
                            {{ item.resume_label }} →
                        </Link>
                    </div>
                </div>
            </div>

            <!-- Section 2: Completed Assessments -->
            <div class="space-y-3">
                <h3
                    class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5"
                >
                    <span>✓</span>
                    <span>Asesmen Selesai ({{ completed?.length || 0 }})</span>
                </h3>

                <div
                    v-if="completed && completed.length > 0"
                    class="space-y-2.5"
                >
                    <div
                        v-for="item in completed"
                        :key="item.id"
                        class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between"
                    >
                        <div class="space-y-1">
                            <div class="flex items-center space-x-2">
                                <h4 class="font-bold text-sm text-slate-900">
                                    {{ item.patient?.name }}
                                </h4>
                                <Badge
                                    :variant="
                                        badgeVariant(
                                            item.triage_result
                                                ?.system_recommendation,
                                        )
                                    "
                                >
                                    {{
                                        item.triage_result
                                            ?.system_recommendation || "T3"
                                    }}
                                </Badge>
                            </div>
                            <p class="text-xs text-slate-500">
                                Total Skor:
                                {{ item.triage_result?.total_score || 0 }}/37 •
                                {{ formatDate(item.completed_at) }}
                            </p>
                        </div>

                        <Link
                            :href="`/relawan/assessment/${item.id}/result`"
                            class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition"
                        >
                            Lihat Detail
                        </Link>
                    </div>
                </div>

                <div
                    v-else
                    class="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs"
                >
                    Belum ada asesmen yang diselesaikan.
                </div>
            </div>
        </div>
    </RelawanLayout>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Link, router, usePage } from "@inertiajs/vue3";
import RelawanLayout from "@/layouts/RelawanLayout.vue";
import Badge from "@/components/ui/Badge.vue";
import { syncManager } from "@/offline/syncManager";

defineProps<{
    inProgress?: any[];
    completed?: any[];
}>();

const isSyncing = ref(false);
const page = usePage();

function triggerSync() {
    isSyncing.value = true;
    syncManager
        .sync((page.props.auth as { user: { id: number } }).user.id)
        .finally(() => {
            router.reload({ only: ["inProgress", "completed"] });
            isSyncing.value = false;
        });
}

function badgeVariant(category?: string) {
    switch (category) {
        case "T0_SUSPECT":
        case "T0_CONFIRMED":
            return "t0";
        case "T1":
            return "t1";
        case "T2":
            return "t2";
        default:
            return "t3";
    }
}

function formatDate(dateStr?: string) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}
</script>
