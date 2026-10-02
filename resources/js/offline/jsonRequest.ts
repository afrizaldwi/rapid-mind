export class MissingCsrfTokenError extends Error {
    constructor() {
        super("Missing CSRF token");
        this.name = "MissingCsrfTokenError";
    }
}

export function jsonRequest(url: string, payload: unknown): Promise<Response> {
    if (!url.startsWith("/") || url.startsWith("//"))
        throw new Error("Only same-origin paths are allowed");
    const token = (
        document.querySelector(
            'meta[name="csrf-token"]',
        ) as HTMLMetaElement | null
    )?.content;
    if (!token) throw new MissingCsrfTokenError();
    return fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRF-TOKEN": token,
        },
        body: JSON.stringify(payload),
    });
}
