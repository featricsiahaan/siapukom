export interface ReadinessLevel {
  level: 'Siap' | 'Cukup' | 'Perlu Latihan';
  badgeBg: string;
  badgeText: string;
}

// Ambang & warna disamakan persis dengan `levelFor()` di prototipe frontend
// (SiapUKOM.dc.html) supaya tampilan dashboard konsisten begitu API disambungkan.
export function levelFor(score: number): ReadinessLevel {
  if (score >= 80) {
    return { level: 'Siap', badgeBg: 'rgba(46,139,87,0.12)', badgeText: '#2E8B57' };
  }
  if (score >= 60) {
    return { level: 'Cukup', badgeBg: 'rgba(229,186,115,0.22)', badgeText: '#B8860B' };
  }
  return { level: 'Perlu Latihan', badgeBg: 'rgba(192,57,43,0.1)', badgeText: '#C0392B' };
}

export function percentage(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}
