export type ReferralStatus = 'ACTIVE' | 'EN_ROUTE' | 'ON_SITE' | 'TRANSPORT' | 'COMPLETED';

export function formatReferralStatus(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'Aktif';
    case 'EN_ROUTE': return 'Menuju lokasi';
    case 'ON_SITE': return 'Tiba di lokasi';
    case 'TRANSPORT': return 'Transportasi';
    case 'COMPLETED': return 'Selesai';
    default: return status;
  }
}

export function nextReferralActions(status: ReferralStatus): { status: ReferralStatus; label: string }[] {
  switch (status) {
    case 'ACTIVE': return [{ status: 'EN_ROUTE', label: 'Mulai menuju lokasi' }];
    case 'EN_ROUTE': return [{ status: 'ON_SITE', label: 'Tandai tiba di lokasi' }];
    case 'ON_SITE': return [
      { status: 'TRANSPORT', label: 'Mulai transportasi' },
      { status: 'COMPLETED', label: 'Selesaikan' },
    ];
    case 'TRANSPORT': return [{ status: 'COMPLETED', label: 'Selesaikan' }];
    case 'COMPLETED': return [];
  }
}
