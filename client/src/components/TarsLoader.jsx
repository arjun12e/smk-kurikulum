// Loader animasi robot TARS (Interstellar) yang berputar — dipakai saat algoritma berjalan.
export default function TarsLoader({ jumlahKontrak, generasi = 0, fitness = null }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="tars-stage">
        <div className="tars">
          <span className="slab" />
          <span className="slab"><i className="led" /></span>
          <span className="slab" />
          <span className="slab" />
        </div>
        <div className="tars-shadow" />
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700">TARS sedang menyusun jadwal…</p>
        <p className="text-xs text-gray-500 mt-1">
          Memproses <strong className="text-orange-600">{jumlahKontrak ?? '…'}</strong> kontrak mengajar
          <span className="text-gray-400"> · Generasi {generasi}</span>
        </p>
        {fitness !== null && <p className="text-[11px] text-gray-400 mt-0.5">Fitness terbaik: {Number(fitness).toFixed(2)}</p>}
      </div>

      <style>{`
        .tars-stage {
          position: relative;
          width: 140px; height: 140px;
          display: flex; align-items: center; justify-content: center;
          animation: tars-bob 1.8s ease-in-out infinite;
        }
        .tars {
          display: flex; gap: 3px;
          transform-origin: 50% 50%;
          animation: tars-spin 2.6s cubic-bezier(.65,.05,.36,1) infinite;
          filter: drop-shadow(0 6px 6px rgba(0,0,0,.25));
        }
        .tars .slab {
          position: relative;
          width: 15px; height: 92px; border-radius: 4px;
          background: linear-gradient(180deg, #6b7280 0%, #374151 45%, #1f2937 80%, #111827 100%);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,.10),
            inset -3px 0 6px rgba(0,0,0,.45),
            inset 3px 0 4px rgba(255,255,255,.06);
        }
        /* garis-garis panel horizontal khas TARS */
        .tars .slab::before, .tars .slab::after {
          content: ''; position: absolute; left: 2px; right: 2px; height: 1px;
          background: rgba(0,0,0,.45);
          box-shadow: 0 1px 0 rgba(255,255,255,.06);
        }
        .tars .slab::before { top: 30%; }
        .tars .slab::after  { top: 62%; }
        .tars .slab:nth-child(1), .tars .slab:nth-child(4) { height: 80px; }
        .tars .led {
          position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
          width: 5px; height: 5px; border-radius: 50%;
          background: #f97316; box-shadow: 0 0 8px 2px rgba(249,115,22,.8);
          animation: tars-blink 1.1s steps(1,end) infinite;
        }
        .tars-shadow {
          position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
          width: 70px; height: 10px; border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(0,0,0,.28), rgba(0,0,0,0) 70%);
          animation: tars-shadow 1.8s ease-in-out infinite;
        }
        @keyframes tars-spin { to { transform: rotate(360deg); } }
        @keyframes tars-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes tars-shadow { 0%,100% { transform: translateX(-50%) scale(1); opacity: .8; } 50% { transform: translateX(-50%) scale(.8); opacity: .5; } }
        @keyframes tars-blink { 0%,60% { opacity: 1; } 61%,100% { opacity: .25; } }
      `}</style>
    </div>
  );
}
