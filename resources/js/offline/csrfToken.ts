let recoveredToken: string | null = null;
export function clearCsrfToken(): void { recoveredToken = null; }

export function installCsrfToken(token: unknown): boolean {
    if (typeof token !== "string" || !token || token.length > 512) return false;
    recoveredToken = token;
    return true;
}

export function currentCsrfToken(): string | undefined {
    return recoveredToken ?? (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content;
}
