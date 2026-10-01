import type { Component } from "vue";
import { assessmentRepository } from "@/offline/assessmentRepository";
import { patientRepository } from "@/offline/patientRepository";
import { emergencyRepository } from "@/offline/emergencyRepository";
import type { ServerAssessment } from "@/offline/assessmentWorkflow";
import { requireOwner } from "@/offline/db";

type Route = { component: Component; props: Record<string, unknown> };
export type OfflineRouteResult = Route | { unavailable: string };

export async function resolveOfflineRoute(
    ownerInput: number,
    pathname: string,
): Promise<OfflineRouteResult> {
    const owner = requireOwner(ownerInput);
    const path = pathname.replace(/\/+$/, "") || "/";
    if (path === "/relawan/home")
        return {
            component: (await import("@/Pages/Relawan/Home.vue")).default,
            props: {},
        };
    if (path === "/relawan/pfa")
        return {
            component: (await import("@/Pages/Relawan/Pfa.vue")).default,
            props: {},
        };
    if (path === "/relawan/data")
        return {
            component: (await import("@/Pages/Relawan/Data.vue")).default,
            props: {},
        };
    if (path === "/relawan/assessment")
        return {
            component: (await import("@/Pages/Relawan/Assessment/Index.vue"))
                .default,
            props: {},
        };
    const assessmentPath = path.match(
        /^\/relawan\/assessment\/([^/]+)\/(identity|srq|risk|function|review|result)$/,
    );
    if (assessmentPath) {
        const [, id, stage] = assessmentPath;
        const assessment = await assessmentRepository.get(
            owner,
            decodeURIComponent(id),
        );
        if (!assessment)
            return { unavailable: "Asesmen ini belum tersedia di perangkat." };
        const patient = await patientRepository.get(
            owner,
            assessment.patient_id,
        );
        if (!patient)
            return {
                unavailable: "Data penyintas belum tersedia di perangkat.",
            };
        const props = {
            assessment: { ...assessment, user_id: owner } as ServerAssessment,
            patient,
        };
        const component = await (
            {
                identity: () =>
                    import("@/Pages/Relawan/Assessment/Identity.vue"),
                srq: () => import("@/Pages/Relawan/Assessment/Srq.vue"),
                risk: () => import("@/Pages/Relawan/Assessment/Risk.vue"),
                function: () =>
                    import("@/Pages/Relawan/Assessment/Function.vue"),
                review: () => import("@/Pages/Relawan/Assessment/Review.vue"),
                result: () => import("@/Pages/Relawan/Assessment/Result.vue"),
            } as Record<string, () => Promise<{ default: Component }>>
        )[stage]();
        return { component: component.default, props };
    }
    const emergencyPath = path.match(/^\/relawan\/emergencies\/([^/]+)$/);
    if (emergencyPath) {
        const emergency = await emergencyRepository.get(
            owner,
            decodeURIComponent(emergencyPath[1]),
        );
        if (!emergency)
            return { unavailable: "Insiden ini belum tersedia di perangkat." };
        return {
            component: (await import("@/Pages/Relawan/Emergency.vue")).default,
            props: { localEmergency: emergency },
        };
    }
    return {
        unavailable: "Halaman ini belum tersedia dalam mode lapangan offline.",
    };
}
