# Research AI: Machine Learning Module

Project ini adalah pusat riset dan pengembangan AI untuk **Portal Mahasiswa PTIK**. 
Dirancang khusus untuk mendukung publikasi jurnal ilmiah (Sinta 1/2).

## 📁 Struktur Folder
- `notebooks/`: File eksperimen `.ipynb` (Jupyter).
- `src/`: Modul Python untuk preprocessing dan deteksi.
- `api/`: Gateway FastAPI (Bridge ke Golang).
- `models/`: Tempat penyimpanan model yang sudah dilatih (.pkl, .h5).
- `data/`: Penyimpanan dataset offline.

## 🚀 Persiapan (Setup)
1. Pastikan Python 3.9+ sudah terinstall.
2. Buat Virtual Environment: `python -m venv venv`.
3. Aktifkan Venv: `venv\Scripts\activate` (Windows).
4. Install library awal: `pip install pandas scikit-learn fastapi uvicorn`.

## 🧪 Roadmap Riset
1. Eksperimen di folder `notebooks/`.
2. Jika sudah akurat, pindahkan logika ke `src/`.
3. Jalankan API lewat `api/main.py`.
