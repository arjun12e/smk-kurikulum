// Perhitungan waktu jam pelajaran untuk kalender akademik.
// Parameter waktu diambil dari Settings (lihat buildWaktuConfig).

const DEFAULTS = {
  jp_menit: 40,
  istirahat_menit: 25,
  jam_mulai_pagi: '06:30',
  jam_mulai_siang: '12:00',
  istirahat_setelah_dua_sesi: 4,
  istirahat_setelah_satu_sesi: 5,
};

// Profil hari khusus bawaan (Senin upacara, Jumat sholat) — bisa diubah di Settings.
export const JADWAL_KHUSUS_DEFAULT = {
  'Senin-Pagi': { aktif: true, label: 'Upacara', jam_mulai: '08:00', jp_menit: 30, istirahat_menit: 30, istirahat_setelah: 4, max_jp: 7 },
  'Jumat-Siang': { aktif: true, label: 'Sholat Jumat', jam_mulai: '13:00', jp_menit: 30, istirahat_menit: 35, istirahat_setelah: 4, max_jp: 7 },
};

// Daftar istirahat bawaan (mengikuti jadwal SMK Pasundan 2).
export const ISTIRAHAT_DEFAULT = [
  { setelah: 4, label: 'MBG', menit: 20 },
  { setelah: 4, label: 'Istirahat', menit: 20 },
  { setelah: 8, label: 'Sholat Dzuhur Berjamaah', menit: 30 },
  { setelah: 12, label: 'Istirahat', menit: 20 },
  { setelah: 12, label: 'MBG', menit: 10 },
];

// Bentuk objek config dari data Settings (mengisi default bila kosong).
export function buildWaktuConfig(settings) {
  const s = settings || {};
  const num = (v, d) => (v === undefined || v === null || v === '' ? d : Number(v));
  let khusus = s.jadwal_khusus;
  if (typeof khusus === 'string') { try { khusus = JSON.parse(khusus); } catch { khusus = null; } }
  let breaks = s.istirahat_list;
  if (typeof breaks === 'string') { try { breaks = JSON.parse(breaks); } catch { breaks = null; } }
  return {
    jpMenit: num(s.jp_menit, DEFAULTS.jp_menit),
    istirahatMenit: num(s.istirahat_menit, DEFAULTS.istirahat_menit),
    jamMulai: s.jam_mulai_pagi || DEFAULTS.jam_mulai_pagi,
    jamMulaiPagi: s.jam_mulai_pagi || DEFAULTS.jam_mulai_pagi,
    jamMulaiSiang: s.jam_mulai_siang || DEFAULTS.jam_mulai_siang,
    total: num(s.jumlah_jp, 14),
    breaks: Array.isArray(breaks) && breaks.length ? breaks : ISTIRAHAT_DEFAULT,
    istirahatSetelah: {
      dua_sesi: num(s.istirahat_setelah_dua_sesi, DEFAULTS.istirahat_setelah_dua_sesi),
      satu_sesi: num(s.istirahat_setelah_satu_sesi, DEFAULTS.istirahat_setelah_satu_sesi),
    },
    khusus: khusus || JADWAL_KHUSUS_DEFAULT,
  };
}

// Timeline kontinu SATU HARI: daftar baris JP 1..total + baris istirahat bernama,
// dengan jam dihitung berurutan (mengikuti jadwal SMK Pasundan: MBG, Sholat, dll.).
export function timelineKontinu(cfg, totalOverride) {
  const breaks = (cfg.breaks || []).map(b => ({ setelah: Number(b.setelah), label: b.label || 'Istirahat', menit: Number(b.menit) || 0 }));
  const rows = [];
  let t = toMin(cfg.jamMulai);
  const total = totalOverride || cfg.total || 14;
  for (let n = 1; n <= total; n++) {
    rows.push({ tipe: 'jp', no: n, mulai: toStr(t), selesai: toStr(t + cfg.jpMenit) });
    t += cfg.jpMenit;
    for (const b of breaks.filter(x => x.setelah === n)) {
      rows.push({ tipe: 'istirahat', label: b.label, menit: b.menit, mulai: toStr(t), selesai: toStr(t + b.menit) });
      t += b.menit;
    }
  }
  return rows;
}

// Profil khusus aktif untuk (hari, shift) — null bila hari itu normal.
export function profilKhusus(cfg, hari, shift) {
  const p = cfg?.khusus?.[`${hari}-${shift}`];
  return p && p.aktif ? p : null;
}

const toMin = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const toStr = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// Info sesi. Bila `hari` diberikan dan (hari,shift) punya profil khusus aktif
// (upacara/sholat jumat), pakai jam mulai/durasi/istirahat profil itu.
function sesiInfo(mode, shift, cfg, hari) {
  const p = hari ? profilKhusus(cfg, hari, shift) : null;
  if (p) {
    return {
      base: toMin(p.jam_mulai),
      istSetelah: Number(p.istirahat_setelah) || 4,
      jpMenit: Number(p.jp_menit) || cfg.jpMenit,
      istMenit: Number(p.istirahat_menit) || cfg.istirahatMenit,
    };
  }
  const mulai = shift === 'Siang' ? cfg.jamMulaiSiang : cfg.jamMulaiPagi;
  const istSetelah = cfg.istirahatSetelah[mode] ?? cfg.istirahatSetelah.dua_sesi;
  return { base: toMin(mulai), istSetelah, jpMenit: cfg.jpMenit, istMenit: cfg.istirahatMenit };
}

// Rentang waktu untuk satu JP (slot). `hari` opsional (untuk profil khusus per hari).
export function rentangWaktu(mode, shift, slot, cfg, hari) {
  const { base, istSetelah, jpMenit, istMenit } = sesiInfo(mode, shift, cfg, hari);
  const menitSebelum = (slot - 1) * jpMenit + (slot > istSetelah ? istMenit : 0);
  const mulai = base + menitSebelum;
  return { mulai: toStr(mulai), selesai: toStr(mulai + jpMenit) };
}

// True bila tepat setelah `slot` ada istirahat.
export function istirahatSetelah(mode, shift, slot, cfg, hari) {
  return sesiInfo(mode, shift, cfg, hari).istSetelah === slot;
}

// Rentang waktu istirahat (setelah slot istSetelah).
export function rentangIstirahat(mode, shift, cfg, hari) {
  const { base, istSetelah, jpMenit, istMenit } = sesiInfo(mode, shift, cfg, hari);
  const mulai = base + istSetelah * jpMenit;
  return { mulai: toStr(mulai), selesai: toStr(mulai + istMenit) };
}
