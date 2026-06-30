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

// Bentuk objek config dari data Settings (mengisi default bila kosong).
export function buildWaktuConfig(settings) {
  const s = settings || {};
  const num = (v, d) => (v === undefined || v === null || v === '' ? d : Number(v));
  return {
    jpMenit: num(s.jp_menit, DEFAULTS.jp_menit),
    istirahatMenit: num(s.istirahat_menit, DEFAULTS.istirahat_menit),
    jamMulaiPagi: s.jam_mulai_pagi || DEFAULTS.jam_mulai_pagi,
    jamMulaiSiang: s.jam_mulai_siang || DEFAULTS.jam_mulai_siang,
    istirahatSetelah: {
      dua_sesi: num(s.istirahat_setelah_dua_sesi, DEFAULTS.istirahat_setelah_dua_sesi),
      satu_sesi: num(s.istirahat_setelah_satu_sesi, DEFAULTS.istirahat_setelah_satu_sesi),
    },
  };
}

const toMin = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const toStr = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

function sesiInfo(mode, shift, cfg) {
  const mulai = shift === 'Siang' ? cfg.jamMulaiSiang : cfg.jamMulaiPagi;
  const istSetelah = cfg.istirahatSetelah[mode] ?? cfg.istirahatSetelah.dua_sesi;
  return { base: toMin(mulai), istSetelah };
}

// Rentang waktu untuk satu JP (slot), memperhitungkan istirahat sebelumnya.
export function rentangWaktu(mode, shift, slot, cfg) {
  const { base, istSetelah } = sesiInfo(mode, shift, cfg);
  const menitSebelum = (slot - 1) * cfg.jpMenit + (slot > istSetelah ? cfg.istirahatMenit : 0);
  const mulai = base + menitSebelum;
  return { mulai: toStr(mulai), selesai: toStr(mulai + cfg.jpMenit) };
}

// True bila tepat setelah `slot` ada istirahat.
export function istirahatSetelah(mode, shift, slot, cfg) {
  return sesiInfo(mode, shift, cfg).istSetelah === slot;
}

// Rentang waktu istirahat (setelah slot istSetelah).
export function rentangIstirahat(mode, shift, cfg) {
  const { base, istSetelah } = sesiInfo(mode, shift, cfg);
  const mulai = base + istSetelah * cfg.jpMenit;
  return { mulai: toStr(mulai), selesai: toStr(mulai + cfg.istirahatMenit) };
}
