import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const SHIFT = ['Pagi', 'Siang'];
const defaultPreferensi = () => ({
  hari: Object.fromEntries(HARI.map(h => [h, 3])),
  shift: Object.fromEntries(SHIFT.map(s => [s, 3]))
});

export default function KontrakForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ id_guru: '', id_mapel: '', id_rombel: [], jumlah_jp: 2, max_jam_harian: 4, is_pkl: false, preferensi_hari: defaultPreferensi() });
  const [guruList, setGuruList] = useState([]);
  const [mapelList, setMapelList] = useState([]);
  const [rombelList, setRombelList] = useState([]);
  const [filteredMapelList, setFilteredMapelList] = useState([]);
  const [kontrakGuru, setKontrakGuru] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGuruModal, setShowGuruModal] = useState(false);
  const [selectedTingkat, setSelectedTingkat] = useState('XI');
  const [newGuru, setNewGuru] = useState({ id_guru: '', nama_guru: '', status_kepegawaian: 'PNS', jenis_guru: ['Jurusan'], id_jurusan: '' });
  const [jurusanList, setJurusanList] = useState([]);
  const [settings, setSettings] = useState(null);

 // 1. Ambil semua data master terlebih dahulu saat komponen pertama kali dimuat
  useEffect(() => {
    Promise.all([
      api.get('/guru'),
      api.get('/mata-pelajaran'),
      api.get('/rombel'),
      api.get('/settings'),
      api.get('/jurusan')
    ]).then(([g, m, r, s, j]) => {
      setGuruList(g.data);
      setMapelList(m.data);
      setRombelList(r.data);
      setSettings(s.data);
      setJurusanList(j.data || []);

      // Jika dalam mode EDIT, ambil data kontrak SETELAH master data siap
      if (isEdit) {
        api.get(`/kontrak-mengajar/${id}`).then(res => {
          // Backward compatibility: if preferensi_hari is old format (flat object), convert to new format
          let preferensi = res.data.preferensi_hari || defaultPreferensi();
          if (preferensi && !preferensi.hari) {
            // Old format: convert flat object to new format
            preferensi = {
              hari: preferensi,
              shift: Object.fromEntries(SHIFT.map(s => [s, 3]))
            };
          }
          
          setForm({
            id_guru: res.data.id_guru,
            id_mapel: res.data.id_mapel,
            id_rombel: res.data.id_rombel,
            jumlah_jp: res.data.jumlah_jp,
            max_jam_harian: res.data.max_jam_harian,
            is_pkl: res.data.is_pkl || false,
            preferensi_hari: preferensi,
          });
          
          // Cari tingkat berdasarkan rombel dari data yang baru saja dimuat
          const rombel = r.data.find(item => item.id_rombel === res.data.id_rombel);
          if (rombel) {
            setSelectedTingkat(rombel.tingkat);
          }
        }).catch(err => console.error('Error loading kontrak:', err));
      }
    }).catch(err => console.error('Error loading master data:', err));
  }, [id, isEdit]); // Hapus rombelList dari dependensi untuk mencegah loop

  // 2. Efek Filter Mata Pelajaran berdasarkan Guru dan Tingkat
  useEffect(() => {
    if (mapelList.length === 0) return;

  if (form.id_guru) {
    // KITA JANGAN mengirimkan params tingkat ke API agar backend menyemburkan semua mapel guru tersebut
    api.get(`/mata-pelajaran/by-guru/${form.id_guru}`)
      .then(res => {
        // res.data berisi semua mapel guru tersebut (bisa berupa string SET seperti "X,XI,XII")
        // Kita filter di front-end: apakah tingkat yang aktif ada di dalam data SET tersebut?
        const mapelCocokTingkat = res.data.filter(m => {
          if (!m.tingkat) return false;
          // Pecah string "X,XI,XII" menjadi array ['X', 'XI', 'XII'] lalu cek ketersediaannya
          return m.tingkat.split(',').includes(selectedTingkat);
        });

        setFilteredMapelList(mapelCocokTingkat);
        
        // Pengaman dropdown mapel
        if (form.id_mapel && !mapelCocokTingkat.find(m => m.id_mapel === form.id_mapel)) {
          setForm(f => ({ ...f, id_mapel: '' }));
        }
      })
      .catch(err => console.error('Error filtering mapel:', err));
      } else {
    // Jika guru belum dipilih, filter langsung dari master data menggunakan logika .includes()
    const filtered = mapelList.filter(m => {
      if (!m.tingkat) return false;
      return m.tingkat.split(',').includes(selectedTingkat);
    });
    setFilteredMapelList(filtered);
  }
    
  }, [form.id_guru, selectedTingkat, mapelList, form.id_mapel]);

  // 3. Ambil kontrak yang SUDAH dimiliki guru ini, untuk menandai rombel yang sudah dikontrak
  useEffect(() => {
    if (!form.id_guru) { setKontrakGuru([]); return; }
    api.get('/kontrak-mengajar', { params: { id_guru: form.id_guru } })
      .then(res => setKontrakGuru(res.data.data || []))
      .catch(() => setKontrakGuru([]));
  }, [form.id_guru]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setBobot = (key, value, val) => {
    setForm(f => ({
      ...f,
      preferensi_hari: {
        ...f.preferensi_hari,
        [key]: {
          ...f.preferensi_hari[key],
          [value]: Number(val)
        }
      }
    }));
  };

  // Rombel yang SUDAH dikontrak guru ini untuk mapel yang sedang dipilih.
  // Saat edit, kontrak yang sedang diedit sendiri dikecualikan.
  const rombelTerkontrak = new Map(
    kontrakGuru
      .filter(k => k.id_mapel === form.id_mapel && (!isEdit || String(k.id_kontrak) !== String(id)))
      .map(k => [k.id_rombel, k.jumlah_jp])
  );
  const totalJpTerkontrak = [...rombelTerkontrak.values()].reduce((s, jp) => s + (jp || 0), 0);

  // Proyeksi beban JP guru bila kontrak ini disimpan.
  // Patokan = jatah JP guru tsb (Guru.total_jam_mengajar).
  const guruDipilih = guruList.find(g => g.id_guru === form.id_guru);
  const batasJpGuru = guruDipilih?.total_jam_mengajar || 0;
  const jpGuruSekarang = kontrakGuru
    .filter(k => !isEdit || String(k.id_kontrak) !== String(id))
    .reduce((s, k) => s + (k.jumlah_jp || 0), 0);
  const jumlahRombelDipilih = Array.isArray(form.id_rombel) ? form.id_rombel.length : (form.id_rombel ? 1 : 0);
  const jpTambahan = (parseInt(form.jumlah_jp) || 0) * jumlahRombelDipilih;
  const jpProyeksi = jpGuruSekarang + jpTambahan;
  const lewatBatasJp = Boolean(form.id_guru) && batasJpGuru > 0 && jpProyeksi > batasJpGuru;

  const handleTingkatChange = (tingkat) => {
    setSelectedTingkat(tingkat);
    setForm(f => ({ ...f, id_rombel: [] }));
  };

  const handleRombelSelect = (id_rombel) => {
  // Cegah memilih rombel yang sudah dikontrak (akan jadi duplikat)
  if (rombelTerkontrak.has(id_rombel)) return;
  let currentRombel = [...form.id_rombel];

  if (currentRombel.includes(id_rombel)) {
    // Jika sudah dipilih, maka hapus dari list (uncheck)
    currentRombel = currentRombel.filter(id => id !== id_rombel);
  } else {
    // Jika belum dipilih, masukkan ke array
    currentRombel.push(id_rombel);
  }

  set('id_rombel', currentRombel);
};

// Fungsi Pintas untuk memilih semua rombel di tingkat yang aktif
const handleSelectAllRombel = () => {
  const rombelDiTingkatIni = groupedRombel[selectedTingkat] || [];
  // Abaikan rombel yang sudah dikontrak (tidak ikut dipilih massal)
  const idRombelDiTingkatIni = rombelDiTingkatIni
    .map(r => r.id_rombel)
    .filter(id => !rombelTerkontrak.has(id));

  // Cek apakah semua rombel di tingkat ini sudah terpilih semuanya
  const apakahSudahSemua = idRombelDiTingkatIni.every(id => form.id_rombel.includes(id));

  let hasilRombel = [];
  if (apakahSudahSemua) {
    // Jika sudah terpilih semua, lepas semua pilihan khusus tingkat ini
    hasilRombel = form.id_rombel.filter(id => !idRombelDiTingkatIni.includes(id));
  } else {
    // Jika belum semua, gabungkan rombel yang sudah ada dengan semua rombel di tingkat ini (hindari duplikat)
    hasilRombel = Array.from(new Set([...form.id_rombel, ...idRombelDiTingkatIni]));
  }

  set('id_rombel', hasilRombel);
  };
  

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/kontrak-mengajar/${id}`, form);
        toast.success('Kontrak berhasil diperbarui');
      } else {
        await api.post('/kontrak-mengajar', form);
        toast.success('Kontrak berhasil ditambahkan');
      }
      navigate('/kontrak-mengajar');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  };

  const toggleJenisBaru = (val) => setNewGuru(g => {
    const has = g.jenis_guru.includes(val);
    const jenis_guru = has ? g.jenis_guru.filter(x => x !== val) : [...g.jenis_guru, val];
    return { ...g, jenis_guru };
  });

  const simpanGuruBaru = async () => {
    if (newGuru.jenis_guru.length === 0) return toast.error('Pilih minimal satu jenis guru');
    if (newGuru.jenis_guru.includes('Jurusan') && !newGuru.id_jurusan) return toast.error('Pilih jurusan untuk guru jurusan');
    try {
      const res = await api.post('/guru', newGuru);
      setGuruList(l => [...l, res.data]);
      set('id_guru', res.data.id_guru);
      setShowGuruModal(false);
      setNewGuru({ id_guru: '', nama_guru: '', status_kepegawaian: 'PNS', jenis_guru: ['Jurusan'], id_jurusan: '' });
      toast.success('Guru baru berhasil ditambahkan');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menambah guru');
    }
  };

  const BADGE = { PNS: '🔵', GTY: '🟢', GTT: '⚪' };
  const TINGKAT_ORDER = ['X', 'XI', 'XII'];
  const groupedRombel = TINGKAT_ORDER.reduce((acc, t) => {
    acc[t] = rombelList.filter(r => r.tingkat === t);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-gray-800 mb-6">{isEdit ? 'Edit Kontrak Mengajar' : 'Tambah Kontrak Mengajar'}</h2>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        {/* Guru */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Guru</label>
          <div className="flex gap-2">
            <select value={form.id_guru} onChange={e => set('id_guru', e.target.value)} required
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Pilih guru...</option>
              {[...guruList]
                .sort((a, b) => a.nama_guru.localeCompare(b.nama_guru))
                .map(g => (<option key={g.id_guru} value={g.id_guru}>{BADGE[g.status_kepegawaian] || ''} {g.nama_guru} ({g.status_kepegawaian})</option>))
              }
            </select>
            <button type="button" onClick={() => setShowGuruModal(true)}
              className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">
              + Baru
            </button>
          </div>
        </div>

        {/* Mata Pelajaran */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran</label>
          <select value={form.id_mapel} onChange={e => { const selectedId = e.target.value; set('id_mapel', selectedId);
            const mapelTerpilih = filteredMapelList.find(m => m.id_mapel === selectedId);
            if (mapelTerpilih) {
            set('jumlah_jp', mapelTerpilih.alokasi_per_minggu || 2);}}} 
            required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Pilih mapel...</option>
            {filteredMapelList.map(m => <option key={m.id_mapel} value={m.id_mapel}>{m.nama_mapel}</option>)}
          </select>
        </div>

        
        {/* Info rombel yang sudah dikontrak guru ini untuk mapel terpilih */}
        {form.id_mapel && rombelTerkontrak.size > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
            ✓ Guru ini sudah mengontrak <strong>{rombelTerkontrak.size} rombel</strong> ({totalJpTerkontrak} JP total) untuk mapel ini — ditandai hijau & tidak bisa dipilih lagi.
          </div>
        )}

        {/* Rombel Selection by Tingkat */}
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-medium text-gray-700">Pilih Rombel per Kelas</label>
    
        {/* TOMBOL PINTAS PILIH SEMUA */}
          {groupedRombel[selectedTingkat]?.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAllRombel}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded border border-blue-200"
            >
              {groupedRombel[selectedTingkat] .every(r => form.id_rombel.includes(r.id_rombel)) 
                ? '❌ Lepas Semua Pilihan' 
                : '✅ Pilih Semua Rombel'}
            </button>
          )}
        </div>
  
        {/* Tingkat Tabs */}
        <div className="flex gap-2 mb-4 border-b border-b-gray-200">
          {TINGKAT_ORDER.map(tingkat => (
            <button
              key={tingkat}
              type="button"
              onClick={() => handleTingkatChange(tingkat)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                selectedTingkat === tingkat
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Kelas {tingkat}
            </button>
          ))}
        </div>

        {/* Rombel Grid */}
        <div className="grid grid-cols-3 gap-2">
          {groupedRombel[selectedTingkat]?.map(r => {
            // Cek apakah ID Rombel ada di dalam Array form.id_rombel
            const isSelected = form.id_rombel.includes(r.id_rombel);
            // Rombel yang sudah dikontrak guru ini untuk mapel terpilih
            const sudahDikontrak = rombelTerkontrak.has(r.id_rombel);
            const jpSudah = rombelTerkontrak.get(r.id_rombel);

            return (
              <button
                key={r.id_rombel}
                type="button"
                disabled={sudahDikontrak}
                title={sudahDikontrak ? `Guru ini sudah punya kontrak untuk rombel & mapel ini (${jpSudah} JP)` : undefined}
                onClick={() => handleRombelSelect(r.id_rombel)}
                className={`p-3 rounded-lg text-sm font-medium transition text-left flex justify-between items-center ${
                  sudahDikontrak
                    ? 'bg-green-50 text-green-700 border-2 border-green-300 cursor-not-allowed'
                    : isSelected
                    ? 'bg-blue-600 text-white border-2 border-blue-700 shadow-sm'
                    : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {r.nama_rombel}
                  {r.is_pkl && <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${isSelected && !sudahDikontrak ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'}`}>PKL</span>}
                </span>
                {sudahDikontrak ? <span className="text-[10px] font-semibold whitespace-nowrap">✓ {jpSudah} JP</span> : isSelected && <span className="text-xs">✓</span>}
              </button>
            );
          })}
          {(!groupedRombel[selectedTingkat] || groupedRombel[selectedTingkat].length === 0) && (
            <p className="text-gray-500 text-sm col-span-3">Tidak ada rombel untuk kelas {selectedTingkat}</p>
          )}
        </div>
        

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah JP / Minggu</label>
            <input type="number" min={1} max={40} value={form.jumlah_jp} onChange={e => set('jumlah_jp', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maks Jam Harian</label>
            <input type="number" min={1} max={8} value={form.max_jam_harian} onChange={e => set('max_jam_harian', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Preferensi Hari */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Preferensi Hari (bobot 1–5)</label>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600">Hari</th>
                  {[1,2,3,4,5].map(n => <th key={n} className="px-3 py-2 text-center text-gray-500">{n}</th>)}
                </tr>
              </thead>
              <tbody>
                {HARI.map(hari => (
                  <tr key={hari} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-700">{hari}</td>
                    {[1, 2, 3, 4, 5].map(n => (
                      <td key={n} className="px-3 py-2 text-center">
                        <input
                          type="radio"
                          name={`pref-hari-${hari}`}
                          checked={form.preferensi_hari.hari?.[hari] === n}
                          onChange={() => setBobot('hari', hari, n)}
                          className="accent-blue-600"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Preferensi Sesi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Preferensi Sesi (bobot 1–5)</label>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600">Sesi</th>
                  {[1,2,3,4,5].map(n => <th key={n} className="px-3 py-2 text-center text-gray-500">{n}</th>)}
                </tr>
              </thead>
              <tbody>
                {SHIFT.map(shift => (
                  <tr key={shift} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-700">{shift}</td>
                    {[1, 2, 3, 4, 5].map(n => (
                      <td key={n} className="px-3 py-2 text-center">
                        <input
                          type="radio"
                          name={`pref-shift-${shift}`}
                          checked={form.preferensi_hari.shift?.[shift] === n}
                          onChange={() => setBobot('shift', shift, n)}
                          className="accent-blue-600"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Peringatan batas JP guru */}
        {lewatBatasJp && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800">
            ⚠️ Beban mengajar guru ini akan menjadi <strong>{jpProyeksi} JP/minggu</strong>, melebihi jatah JP guru tsb (<strong>{batasJpGuru} JP</strong>) — sudah {jpGuruSekarang} JP + {jpTambahan} JP dari kontrak ini. Kontrak tetap bisa disimpan, namun mohon dicek kembali.
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#1e3a5f] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#162d4a] disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/kontrak-mengajar')} 
            className="px-5 py-2 text-sm text-gray-600"
          >
            Batal
          </button>
        </div>
      </form>

      {/* Modal Quick Add Guru */}
      {showGuruModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-800 mb-4">Tambah Guru Baru</h3>
            <div className="space-y-3">
              <input 
                placeholder="ID Guru (misal: G019)" 
                value={newGuru.id_guru} 
                onChange={e => setNewGuru(g => ({ ...g, id_guru: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
              <input 
                placeholder="Nama Guru" 
                value={newGuru.nama_guru} 
                onChange={e => setNewGuru(g => ({ ...g, nama_guru: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
              <select 
                value={newGuru.status_kepegawaian} 
                onChange={e => setNewGuru(g => ({ ...g, status_kepegawaian: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>PNS</option>
                <option>GTY</option>
                <option>GTT</option>
              </select>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jenis Guru (bisa pilih dua)</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={newGuru.jenis_guru.includes('Jurusan')} onChange={() => toggleJenisBaru('Jurusan')} className="accent-blue-600" />
                    Jurusan
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={newGuru.jenis_guru.includes('Umum')} onChange={() => toggleJenisBaru('Umum')} className="accent-blue-600" />
                    Umum
                  </label>
                </div>
              </div>
              {newGuru.jenis_guru.includes('Jurusan') && (
                <select
                  value={newGuru.id_jurusan || ''}
                  onChange={e => setNewGuru(g => ({ ...g, id_jurusan: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih Jurusan...</option>
                  {jurusanList.map(j => <option key={j.id_jurusan} value={j.id_jurusan}>{j.nama_jurusan} ({j.id_jurusan})</option>)}
                </select>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={simpanGuruBaru} className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm hover:bg-orange-600">Simpan</button>
              <button onClick={() => setShowGuruModal(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
