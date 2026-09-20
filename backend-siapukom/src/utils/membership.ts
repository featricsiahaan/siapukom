export function isAksesPenuhActive(
  m: { plan: string; expiryDate: Date | null } | null | undefined
): boolean {
  return !!m && m.plan === 'Akses Penuh' && m.expiryDate != null && m.expiryDate > new Date();
}

export function isMateriAccessActive(m: { materiExpiryDate: Date | null } | null | undefined): boolean {
  return !!m && m.materiExpiryDate != null && m.materiExpiryDate > new Date();
}
