<template>
    <section
        class="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 flex flex-col overflow-hidden"
    >
        <div class="p-4 border-b border-slate-100 space-y-3">
            <div class="flex items-center justify-between">
                <h2
                    class="text-xs font-bold uppercase tracking-wider text-slate-900"
                >
                    Antrean Darurat
                </h2>
                <span class="text-[11px] font-semibold text-slate-500">
                    {{ items.length }} kasus
                </span>
            </div>

            <!-- Search Bar -->
            <div class="relative">
                <span
                    class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400"
                >
                    <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </span>
                <input
                    v-model="searchModel"
                    type="text"
                    aria-label="Cari antrean darurat"
                    placeholder="Cari nama, NIK, ID RM..."
                    class="w-full pl-8 pr-7 py-1.5 bg-slate-50/70 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus:border-teal-600 focus:bg-white transition"
                />
                <button
                    v-if="searchQuery"
                    type="button"
                    @click="searchModel = ''"
                    aria-label="Hapus pencarian"
                    class="absolute inset-y-0 right-0 px-2.5 flex items-center text-slate-400 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700"
                >
                    &times;
                </button>
            </div>

            <!-- Filter Buttons: Semua, T0-Suspect, T0-Confirmed -->
            <div class="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                    type="button"
                    @click="emit('update:selectedFilter', 'ALL')"
                    :class="
                        selectedFilter === 'ALL'
                            ? 'bg-slate-900 text-white font-semibold'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80 font-medium'
                    "
                    class="px-2.5 py-1 rounded-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                >
                    Semua
                </button>
                <button
                    type="button"
                    @click="emit('update:selectedFilter', 'PENDING')"
                    :class="
                        selectedFilter === 'PENDING'
                            ? 'bg-slate-900 text-white font-semibold'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80 font-medium'
                    "
                    class="px-2.5 py-1 rounded-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                >
                    T0-Suspect
                </button>
                <button
                    type="button"
                    @click="emit('update:selectedFilter', 'CONFIRMED')"
                    :class="
                        selectedFilter === 'CONFIRMED'
                            ? 'bg-slate-900 text-white font-semibold'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80 font-medium'
                    "
                    class="px-2.5 py-1 rounded-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                >
                    T0-Confirmed
                </button>
            </div>
        </div>

        <!-- Queue List Items (Inbox style, thin dividers, Sections 10, 11, 12) -->
        <div
            class="divide-y divide-slate-100 overflow-y-auto max-h-[calc(100vh-280px)]"
        >
            <button
                v-for="item in items"
                :key="item.key"
                type="button"
                @click="emit('select', item)"
                :aria-current="selectedKey === item.key ? 'true' : undefined"
                class="block w-full text-left p-3.5 transition cursor-pointer text-xs space-y-1 select-none hover:bg-slate-50/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-700"
                :class="[
                    selectedKey === item.key
                        ? 'bg-teal-50/50 border-l-2 border-l-teal-600 pl-3'
                        : 'bg-white pl-3.5',
                ]"
            >
                <!-- Line 1: Priority Indicator + Time -->
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5">
                        <span
                            v-if="item.semanticPriority.startsWith('T0')"
                            class="w-1.5 h-1.5 rounded-full bg-rose-600"
                        ></span>
                        <span
                            class="text-[10px] font-bold tracking-wide uppercase"
                            :class="
                                item.semanticPriority === 'T0_CONFIRMED'
                                    ? 'text-rose-700'
                                    : 'text-amber-700'
                            "
                        >
                            {{ item.semanticPriorityLabel }}
                        </span>
                    </div>
                    <span class="text-[11px] text-slate-400 font-normal">
                        {{ item.timeAgo }}
                    </span>
                </div>

                <!-- Line 2: Patient Name + RM Code -->
                <div class="flex items-baseline justify-between gap-1">
                    <h3 class="font-bold text-slate-900 text-xs truncate">
                        {{ item.survivorName }}
                    </h3>
                    <span class="font-mono text-[10px] text-slate-400 shrink-0">
                        {{ item.rmCode }}
                    </span>
                </div>

                <!-- Line 3: Posko + Status description -->
                <div
                    class="flex items-center justify-between text-[11px] text-slate-500 pt-0.5"
                >
                    <span class="truncate">{{ item.shelterName }}</span>
                    <span
                        class="font-medium text-[10px] shrink-0"
                        :class="
                            item.status === 'PENDING'
                                ? 'text-rose-600 font-semibold'
                                : 'text-slate-500'
                        "
                    >
                        {{
                            item.status === "PENDING"
                                ? "Perlu diakui"
                                : item.statusLabel
                        }}
                    </span>
                </div>
            </button>

            <!-- Empty Queue State -->
            <div
                v-if="items.length === 0"
                class="p-8 text-center text-xs text-slate-400 space-y-1"
            >
                <p class="font-bold text-slate-600">
                    {{ hasEmergencies ? "Tidak ada antrean yang cocok" : "Belum ada insiden darurat" }}
                </p>
                <p class="text-slate-400 text-[11px]">
                    {{ hasEmergencies ? "Ubah filter prioritas atau kata kunci pencarian." : "Insiden baru akan muncul di antrean ini." }}
                </p>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
    HealthcareEmergencyFilter,
    HealthcareEmergencyQueueItem,
} from "@/lib/healthcareEmergency";

const props = defineProps<{
    items: HealthcareEmergencyQueueItem[];
    selectedKey: string | null;
    searchQuery: string;
    selectedFilter: HealthcareEmergencyFilter;
    hasEmergencies: boolean;
}>();

const emit = defineEmits<{
    "update:searchQuery": [value: string];
    "update:selectedFilter": [value: HealthcareEmergencyFilter];
    select: [item: HealthcareEmergencyQueueItem];
}>();

const searchModel = computed({
    get: () => props.searchQuery,
    set: (value: string) => emit("update:searchQuery", value),
});
</script>
