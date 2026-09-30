export function formatReferralStatus(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'Aktif Terbit';
    case 'EN_ROUTE': return 'Ambulans Menuju Posko';
    case 'ON_SITE': return 'Tiba di Posko';
    case 'TRANSPORT': return 'Perjalanan ke RS';
    case 'COMPLETED': return 'Selesai di RS';
    default: return status;
  }
}
