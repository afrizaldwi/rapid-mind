import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

/** Keyboard behavior for the existing Admin/Healthcare navigation, with no route or permission logic. */
export function useWorkspaceNavigation(browser: Window = window) {
    const sidebarOpen = ref(false);
    const profileOpen = ref(false);
    const compact = ref(false);
    const drawer = ref<HTMLElement | null>(null);
    const menuTrigger = ref<HTMLElement | null>(null);
    const profileTrigger = ref<HTMLElement | null>(null);

    function resize() {
        compact.value = (browser.innerWidth ?? 1440) < 1024;
        if (!compact.value) sidebarOpen.value = false;
    }
    function closeSidebar() {
        sidebarOpen.value = false;
        menuTrigger.value?.focus();
    }
    function closeProfile() {
        if (!profileOpen.value) return;
        profileOpen.value = false;
        profileTrigger.value?.focus();
    }
    function drawerKeydown(event: KeyboardEvent) {
        if (!compact.value || !sidebarOpen.value) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            closeSidebar();
        }
        if (event.key !== 'Tab') return;
        const controls = [...(drawer.value?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)') ?? [])]
            .filter(e => e.getClientRects().length > 0);
        const first = controls[0], last = controls.at(-1);
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === drawer.value)) {
            event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === drawer.value)) {
            event.preventDefault(); first.focus();
        }
    }
    watch(sidebarOpen, async open => {
        if (!open || !compact.value) return;
        profileOpen.value = false;
        await nextTick();
        if (sidebarOpen.value) drawer.value?.focus();
    });
    onMounted(() => { resize(); browser.addEventListener('resize', resize); });
    onUnmounted(() => browser.removeEventListener('resize', resize));
    return { sidebarOpen, profileOpen, compact, drawer, menuTrigger, profileTrigger, closeSidebar, closeProfile, drawerKeydown };
}
