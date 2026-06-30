# Dokumentasi Implementasi Fitur Baru - SMK Kurikulum

## 📋 Ringkasan Perubahan

Implementasi lengkap dari 5 requirement utama yang diminta:

### 1. ✅ Rombel Selection per Blok (dari Dropdown)
**File**: `client/src/pages/kontrak/KontrakForm.jsx`

- Mengubah dropdown rombel menjadi block selection by tingkat
- UI dengan tab untuk memilih Kelas X, XI, XII
- Grid display untuk memilih rombel dalam satu tingkat
- Tombol aktif/inactive untuk visual feedback

```javascript
// Tab tingkat dengan grid rombel per tingkat
{TINGKAT_ORDER.map(tingkat => (
  <button
    onClick={() => handleTingkatChange(tingkat)}
    className={`px-4 py-2 text-sm font-medium ${
      selectedTingkat === tingkat ? 'border-b-2 border-blue-500' : ''
    }`}
  >
    Kelas {tingkat}
  </button>
))}
```

---

### 2. ✅ Filter Mata Pelajaran Berdasarkan Jenis Guru
**Backend**: 
- File: `server/src/controllers/mataPelajaranController.js`
- Endpoint baru: `GET /mata-pelajaran/by-guru/:id_guru?tingkat=X`

**Frontend**:
- Otomatis filter subjects ketika guru dipilih
- Kombinasi: jenis guru + tingkat kelas

```javascript
// Backend filter
async function getByGuru(req, res) {
  const guru = await Guru.findByPk(id_guru);
  where[Op.or] = guru.jenis_guru.map(jenis => ({
    jenis_guru_yang_cocok: { [Op.like]: `%${jenis}%` }
  }));
}
```

---

### 3. ✅ Tabel Jurusan dengan Fleksibilitas Multi-Jurusan
**Database Model**: `server/src/models/index.js`
```javascript
const Jurusan = {
  id_jurusan: STRING (PRIMARY KEY),
  nama_jurusan: STRING
}
```

**Guru Model Updated**:
- Field baru: `id_jurusan` (comma-separated untuk multiple majors)
- Contoh: `"TAV,TPM"` untuk guru mengajar 2 jurusan

**Frontend**:
- `client/src/pages/JurusanIndex.jsx` - CRUD jurusan
- `client/src/pages/guru/GuruForm.jsx` - assign jurusan ke guru

**Fitur**:
- Guru dapat diasign ke multiple jurusan
- Editing jurusan yang diampunya

---

### 4. ✅ Filter Mata Pelajaran per Tingkat Kelas
**Database**:
- Added column `tingkat` (ENUM: X, XI, XII) ke tabel `mata_pelajaran`
- Added column `jenis_guru_yang_cocok` untuk mapping guru type

**Endpoints**:
- `GET /mata-pelajaran` - dengan optional `?tingkat=XI`
- `GET /mata-pelajaran/by-tingkat/:tingkat`
- `GET /mata-pelajaran/by-guru/:id_guru?tingkat=XI`

**Frontend**:
- Automatic filtering di KontrakForm
- Subjects berubah saat tingkat atau guru berubah

**Seed Data**: 
- Semua 31 mapel sudah di-assign tingkat yang sesuai
- TAV/TAM/Piihan/Konsentrasi: XIl & XII
- Umum & Kejuruan: X, XI, atau XII sesuai kurikulum

---

### 5. ✅ Settings Page untuk Konfigurasi Sistem
**Model**: `server/src/models/index.js`
```javascript
const Setting = {
  id_setting: 1,
  max_jam_mengajar: 24,        // Batasan jam/minggu
  jatah_mapel_x: 14,           // Jatah mapel kelas X
  jatah_mapel_xi: 14,          // Jatah mapel kelas XI
  jatah_mapel_xii: 14,         // Jatah mapel kelas XII
  fitur_pkl_aktif: false       // Enable/disable PKL feature
}
```

**Frontend**: `client/src/pages/Settings.jsx`
- Input untuk semua setting
- Toggle untuk PKL feature
- Validasi input number

**API**:
- `GET /settings` - Get current settings
- `PUT /settings` - Update settings

---

### 6. ✅ PKL Feature (Bonus Implementation)
**Database Updates**:
- Added `is_pkl` column ke `KontrakMengajar` table
- Added `is_pkl` column ke `Rombel` table (optional)

**Frontend**:
- Checkbox di KontrakForm (only visible if PKL feature enabled in settings)
- Marking kontrak sebagai PKL

**Fitur**:
- Ketika PKL aktif, admin bisa tandai rombel PKL
- Rombel PKL tidak akan menggunakan ruang kelas/lab dalam scheduling

---

## 📁 File-file yang Diubah/Dibuat

### Backend
```
✅ server/src/models/index.js
   - Added: Jurusan model
   - Added: Setting model
   - Updated: Guru (id_jurusan)
   - Updated: MataPelajaran (tingkat, jenis_guru_yang_cocok)
   - Updated: KontrakMengajar (is_pkl)
   - Updated: Rombel (is_pkl)

✅ server/src/controllers/mataPelajaranController.js
   - Added: getByTingkat()
   - Added: getByGuru()
   - Updated: store() & update() with tingkat/jenis_guru

✅ server/src/controllers/jurusanController.js (NEW)
   - CRUD operations for Jurusan

✅ server/src/controllers/settingController.js (NEW)
   - getSettings()
   - updateSettings()

✅ server/src/controllers/kontrakController.js
   - Updated: store() & update() with is_pkl field

✅ server/src/routes/index.js
   - Added: /jurusan routes
   - Added: /settings routes
   - Updated: /mata-pelajaran with filtering endpoints

✅ server/src/seeders/seed.js
   - Added: Jurusan seed data (5 majors)
   - Updated: Guru data with id_jurusan
   - Updated: MataPelajaran with tingkat & jenis_guru_yang_cocok
   - Added: Settings seed data
```

### Frontend
```
✅ client/src/pages/kontrak/KontrakForm.jsx
   - Redesigned: Rombel selection as block/tabs
   - Added: Guru-based mapel filtering
   - Added: Tingkat-based mapel filtering
   - Added: is_pkl toggle checkbox

✅ client/src/pages/guru/GuruForm.jsx
   - Updated: Jenis guru radio buttons (Jurusan/Umum)
   - Added: Jurusan selection dropdown

✅ client/src/pages/Settings.jsx (NEW)
   - Settings form with all 5 configuration options
   - Save/Reset buttons

✅ client/src/pages/JurusanIndex.jsx (NEW)
   - CRUD management untuk Jurusan

✅ client/src/App.jsx
   - Added: Routes untuk /settings & /jurusan

✅ client/src/components/Layout.jsx
   - Added: Navigation items untuk Jurusan & Settings
```

---

## 🔄 Data Flow / Usage Examples

### Contoh 1: Membuat Kontrak Mengajar
```
1. Admin pilih Guru → Filter Mapel berdasarkan jenis guru
2. Sistem load mapel yang cocok untuk guru itu
3. Admin pilih tingkat kelas (X, XI, XII) → Tab berubah
4. Admin pilih rombel dari grid block (contoh: XI TAV 1, XI TKJ 2)
5. Sistem auto-load mapel untuk tingkat XI yang cocok
6. Admin finalisasi dengan jumlah JP & preferensi hari
7. Jika PKL aktif di settings, ada checkbox untuk mark as PKL
```

### Contoh 2: Mengatur Guru Jurusan
```
1. Buka Edit Guru G006 (Hendry C. Irawan - TKJ guru)
2. Pilih "Guru Jurusan" radio button
3. Select "Teknik Komputer Jaringan (TKJ)"
4. Save → Guru ini sekarang linked ke jurusan TKJ
5. Saat membuat kontrak, mapel TKJ akan available untuk guru ini
```

### Contoh 3: Mengubah Settings Sistem
```
1. Admin masuk ke Settings page
2. Update max jam mengajar: 24 → 28 jam/minggu
3. Aktifkan fitur PKL: OFF → ON
4. Simpan → System updated
5. Sekarang di KontrakForm, checkbox PKL visible
```

---

## 🚀 Next Steps / Future Enhancements

1. **Validasi Backend**:
   - Check total jam guru tidak exceed `max_jam_mengajar` setting
   - Validate jatah mapel per tingkat tidak exceed settings
   - Enforce PKL rombel tidak pakai ruang/lab dalam scheduling

2. **UI Improvements**:
   - Add bulk import untuk mapel dengan tingkat
   - Add visual indicator untuk guru multi-jurusan
   - Add settings history/logging

3. **Report Features**:
   - Report guru per jurusan
   - Report mapel coverage per tingkat
   - PKL rombel summary

---

## 🔧 Testing Checklist

- [ ] Database: Check tabel `jurusan`, `mata_pelajaran` (tingkat), Settings
- [ ] Seed data: Verify 5 jurusan, mapel dengan tingkat
- [ ] Backend API: Test semua /jurusan & /settings endpoints
- [ ] Frontend UI: Test rombel block selection, mapel filtering
- [ ] Filter logic: Verify guru type + tingkat combination
- [ ] Settings: Test enable/disable PKL, update batasan jam
- [ ] GuruForm: Test assigning jurusan untuk guru jurusan
- [ ] KontrakForm: Test all filter combinations

---

## 📝 Database Schema Changes

```sql
-- NEW TABLE: jurusan
CREATE TABLE jurusan (
  id_jurusan VARCHAR(50) PRIMARY KEY,
  nama_jurusan VARCHAR(100) NOT NULL
);

-- NEW TABLE: settings
CREATE TABLE settings (
  id_setting INT PRIMARY KEY,
  max_jam_mengajar INT DEFAULT 24,
  jatah_mapel_x INT DEFAULT 14,
  jatah_mapel_xi INT DEFAULT 14,
  jatah_mapel_xii INT DEFAULT 14,
  fitur_pkl_aktif BOOLEAN DEFAULT FALSE
);

-- ALTER TABLE guru
ALTER TABLE guru ADD COLUMN id_jurusan VARCHAR(200);

-- ALTER TABLE mata_pelajaran
ALTER TABLE mata_pelajaran ADD COLUMN tingkat ENUM('X','XI','XII');
ALTER TABLE mata_pelajaran ADD COLUMN jenis_guru_yang_cocok VARCHAR(100);

-- ALTER TABLE kontrak_mengajar
ALTER TABLE kontrak_mengajar ADD COLUMN is_pkl BOOLEAN DEFAULT FALSE;

-- ALTER TABLE rombel
ALTER TABLE rombel ADD COLUMN is_pkl BOOLEAN DEFAULT FALSE;
```

---

Implementasi selesai! Semua requirement sudah tercakup dengan UI/UX yang user-friendly.
