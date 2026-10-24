import { computed, onMounted, ref, watch } from "vue";
import {
    emergencyQueueCounts,
    filterEmergencyQueue,
    normalizeEmergencyQueue,
    type HealthcareEmergencyFilter,
    type HealthcareEmergencyQueueItem,
} from "../lib/healthcareEmergency.ts";

export function useEmergencyQueue(
    emergencies: () => any[] | undefined,
    onSelectionReset: () => void,
) {
    const searchQuery = ref("");
    const selectedFilter = ref<HealthcareEmergencyFilter>("ALL");
    const queueList = computed(() =>
        normalizeEmergencyQueue(emergencies() ?? []),
    );
    const counts = computed(() =>
        emergencyQueueCounts(queueList.value, emergencies() ?? []),
    );
    const totalSurvivorsCount = computed(
        () => counts.value.totalSurvivorsCount,
    );
    const criticalT0Count = computed(() => counts.value.criticalT0Count);
    const pendingValidationCount = computed(
        () => counts.value.pendingValidationCount,
    );
    const referralsIssuedCount = computed(
        () => counts.value.referralsIssuedCount,
    );
    const filteredQueue = computed(() =>
        filterEmergencyQueue(
            queueList.value,
            selectedFilter.value,
            searchQuery.value,
        ),
    );
    const selectedItem = ref<HealthcareEmergencyQueueItem | null>(null);

    function selectItem(item: HealthcareEmergencyQueueItem | null) {
        selectedItem.value = item;
        onSelectionReset();
    }

    watch(
        queueList,
        (newList) => {
            if (newList.length === 0) {
                if (selectedItem.value) selectItem(null);
            } else if (!selectedItem.value) {
                selectedItem.value = newList[0];
            } else if (selectedItem.value) {
                const refreshed = newList.find(
                    (item) => item.key === selectedItem.value?.key,
                );
                if (refreshed) selectedItem.value = refreshed;
            }
        },
        { immediate: true },
    );

    watch(filteredQueue, (visibleItems) => {
        if (
            selectedItem.value &&
            !visibleItems.some((item) => item.key === selectedItem.value?.key)
        ) {
            selectItem(visibleItems[0] ?? null);
        }
    });

    onMounted(() => {
        if (!selectedItem.value && queueList.value.length > 0) {
            selectedItem.value = queueList.value[0];
        }
    });

    return {
        searchQuery,
        selectedFilter,
        queueList,
        totalSurvivorsCount,
        criticalT0Count,
        pendingValidationCount,
        referralsIssuedCount,
        filteredQueue,
        selectedItem,
        selectItem,
    };
}
