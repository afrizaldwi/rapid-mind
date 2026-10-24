<template>
    <section
        class="space-y-2 text-xs"
        aria-label="Riwayat rujukan dan respons lapangan"
    >
        <h3 class="font-bold text-slate-900">
            Riwayat Rujukan & Respons Lapangan
        </h3>
        <p v-if="!operations?.available" class="text-amber-800">
            Riwayat respons belum tersedia: skema Dispatch belum siap.
        </p>
        <p v-else-if="!rows.length" class="text-slate-500">
            Belum ada peristiwa rujukan atau respons tercatat.
        </p>
        <ol class="space-y-2">
            <li
                v-for="row in rows"
                :key="row.key"
                class="border-l-2 border-slate-200 pl-3"
            >
                <strong>{{ row.domain }} — {{ row.label }}</strong>
                <p>
                    {{ row.actor?.name || "Pelaku tidak tercatat" }} •
                    {{ formatDateTime(row.created_at) }}
                </p>
                <p v-if="row.referral_id">Rujukan: {{ row.referral_id }}</p>
                <p v-if="row.notes" class="text-slate-600">{{ row.notes }}</p>
            </li>
        </ol>
    </section>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { timeline, type Operations } from "@/lib/healthcareOperations";
import { formatDateTime } from "@/lib/healthcareEmergency";
const props = defineProps<{ operations?: Operations }>();
const rows = computed(() => timeline(props.operations));
</script>
