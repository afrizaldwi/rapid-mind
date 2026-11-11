export type ReferralStatus = 'ACTIVE' | 'EN_ROUTE' | 'ON_SITE' | 'TRANSPORT' | 'COMPLETED';

export function formatReferralStatus(
  status: string,
  locale: string = 'id',
): string {
  if (locale === 'en') {
    switch (status) {
      case 'ACTIVE': return 'Active';
      case 'EN_ROUTE': return 'En route';
      case 'ON_SITE': return 'On site';
      case 'TRANSPORT': return 'Transporting';
      case 'COMPLETED': return 'Completed';
      default: return status;
    }
  }
  switch (status) {
    case 'ACTIVE': return 'Aktif';
    case 'EN_ROUTE': return 'Menuju lokasi';
    case 'ON_SITE': return 'Tiba di lokasi';
    case 'TRANSPORT': return 'Transportasi';
    case 'COMPLETED': return 'Selesai';
    default: return status;
  }
}

export function nextReferralActions(
  status: ReferralStatus,
  locale: string = 'id',
): { status: ReferralStatus; label: string }[] {
  const isEn = locale === 'en';
  switch (status) {
    case 'ACTIVE': return [{ status: 'EN_ROUTE', label: isEn ? 'Start en route' : 'Mulai menuju lokasi' }];
    case 'EN_ROUTE': return [{ status: 'ON_SITE', label: isEn ? 'Mark arrived on site' : 'Tandai tiba di lokasi' }];
    case 'ON_SITE': return [
      { status: 'TRANSPORT', label: isEn ? 'Start transport' : 'Mulai transportasi' },
      { status: 'COMPLETED', label: isEn ? 'Complete' : 'Selesaikan' },
    ];
    case 'TRANSPORT': return [{ status: 'COMPLETED', label: isEn ? 'Complete' : 'Selesaikan' }];
    case 'COMPLETED': return [];
  }
}
