import streamlit as st
import pandas as pd
import json
import zipfile
import os
import datetime
import plotly.express as px
from pathlib import Path
import textwrap

st.set_page_config(page_title="SmartCoach AI - Garmin Analyzer", layout="wide")

# Inject Tailwind CSS and Custom Fonts
st.markdown("""
<head>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Outfit', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    <style>
        .main {
            background-color: #0e1117;
            font-family: 'Outfit', sans-serif;
        }
        div[data-testid="stSidebar"] {
            background-color: #161922;
        }
        h1, h2, h3, h4, h5, h6, p, label {
            font-family: 'Outfit', sans-serif !important;
        }
    </style>
</head>
""", unsafe_allow_html=True)

st.markdown('<h1 class="text-4xl font-extrabold text-white tracking-tight">🏃‍♂️ SmartCoach AI</h1>', unsafe_allow_html=True)
st.markdown('<p class="text-slate-400 text-lg mb-6">Ubah Data Lari & Tidur Lo Jadi Rencana Latihan Personal</p>', unsafe_allow_html=True)

# --- Helper Functions ---
def ms_to_date(ms):
    return datetime.datetime.fromtimestamp(ms / 1000.0).strftime('%Y-%m-%d')

def get_pace_recommendations(target_pace):
    base_secs = target_pace * 60
    
    # Ngepush (Interval/Tempo): -30s to -10s
    push_min = (base_secs - 30) / 60
    push_max = (base_secs - 10) / 60
    
    # Sedang (Steady/Long Run): +30s to +60s
    steady_min = (base_secs + 30) / 60
    steady_max = (base_secs + 60) / 60
    
    # Santai (Easy/Recovery): +90s to +120s
    easy_min = (base_secs + 90) / 60
    easy_max = (base_secs + 120) / 60
    
    def format_p(p):
        mins = int(p)
        secs = int(round((p - mins) * 60))
        if secs >= 60:
            mins += 1
            secs -= 60
        return f"{mins}:{secs:02d}"
        
    return {
        "ngepush": f"{format_p(push_min)} - {format_p(push_max)}",
        "sedang": f"{format_p(steady_min)} - {format_p(steady_max)}",
        "santai": f"{format_p(easy_min)} - {format_p(easy_max)}"
    }
DATA_FILE = Path("data_store.json")

def load_local_data():
    if DATA_FILE.exists():
        try:
            with open(DATA_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "running_activities": [],
        "sleep_records": {},
        "max_hr": 0
    }

def save_local_data(data):
    try:
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        st.error(f"Error saving data: {e}")

def merge_garmin_data(new_data):
    local_data = load_local_data()
    
    # Merge activities based on startTimeLocal
    existing_times = {a.get('startTimeLocal') for a in local_data["running_activities"] if 'startTimeLocal' in a}
    merged_acts = list(local_data["running_activities"])
    for act in new_data["running_activities"]:
        t = act.get('startTimeLocal')
        if t not in existing_times:
            merged_acts.append(act)
            existing_times.add(t)
            
    # Merge sleep records
    merged_sleep = dict(local_data["sleep_records"])
    merged_sleep.update(new_data["sleep_records"])
    
    # Update max HR
    max_hr = max(local_data.get("max_hr", 0), new_data.get("max_hr", 0))
    
    merged = {
        "running_activities": merged_acts,
        "sleep_records": merged_sleep,
        "max_hr": max_hr
    }
    save_local_data(merged)
    return merged

def process_garmin_data(zip_file):
    extract_path = Path("temp_garmin")
    with zipfile.ZipFile(zip_file, 'r') as zip_ref:
        zip_ref.extractall(extract_path)

    results = {
        "running_activities": [],
        "sleep_records": {},
        "max_hr": 0
    }

    for path in extract_path.rglob("*summarizedActivities.json"):
        with open(path, 'r') as f:
            try:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    acts = data[0].get('summarizedActivitiesExport', [])
                    for a in acts:
                        if a.get('activityType') == 'running':
                            results["running_activities"].append(a)
                            if a.get('maxHr', 0) > results["max_hr"]:
                                results["max_hr"] = a['maxHr']
            except Exception as e:
                st.error(f"Error reading {path}: {e}")

    for path in extract_path.rglob("*sleepData.json"):
        with open(path, 'r') as f:
            try:
                data = json.load(f)
                for entry in data:
                    if 'calendarDate' in entry and 'sleepScores' in entry:
                        date = entry['calendarDate']
                        total_sec = (
                            entry.get('deepSleepSeconds', 0) +
                            entry.get('lightSleepSeconds', 0) +
                            entry.get('remSleepSeconds', 0) +
                            entry.get('awakeSleepSeconds', 0)
                        )
                        results["sleep_records"][date] = {
                            'score': entry['sleepScores']['overallScore'],
                            'duration': total_sec / 3600
                        }
            except Exception as e:
                st.error(f"Error reading {path}: {e}")

    import shutil
    if extract_path.exists():
        shutil.rmtree(extract_path)

    return results

# --- Sidebar Inputs ---
st.sidebar.header("User Profile")
age = st.sidebar.number_input("Umur", min_value=1, max_value=120, value=31)
goal = st.sidebar.selectbox("Goal Utama", ["Maintenance", "Weight Loss", "10K Race", "Marathon", "General Health"])
program_style = st.sidebar.selectbox(
    "Target Program Latihan",
    ["Ngepush Banget (Progres Cepat/Target Dekat)", "Sedang (Bertahap/Seimbang)", "Santai (Konsisten/Jangka Panjang)"],
    index=1
)
work_type = st.sidebar.selectbox("Pola Kerja", ["Kantoran (Weekend Free)", "Shift", "Freelance"])
target_pace = st.sidebar.number_input("Target Pace (min/km)", value=5.0, step=0.1)

# --- Local Database Initialization ---
data_store = load_local_data()

st.sidebar.markdown("---")
st.sidebar.subheader("📥 Impor / Tambah Data")

# 1. Garmin Upload
uploaded_file = st.sidebar.file_uploader("Upload Garmin Export (.zip)", type="zip")
if uploaded_file:
    with st.spinner("Menganalisis & menggabungkan data Garmin..."):
        new_data = process_garmin_data(uploaded_file)
        if new_data["running_activities"]:
            data_store = merge_garmin_data(new_data)
            st.sidebar.success(f"Berhasil mengimpor {len(new_data['running_activities'])} lari!")
        else:
            st.sidebar.warning("Tidak ditemukan data lari di zip.")

# 2. Add Manual Run
with st.sidebar.expander("📝 Tambah Sesi Lari Manual"):
    with st.form("manual_run_form", clear_on_submit=True):
        m_date = st.date_input("Tanggal Lari", datetime.date.today())
        m_distance_km = st.number_input("Jarak Lari (km)", min_value=0.1, value=5.0, step=0.1)
        m_duration_min = st.number_input("Durasi Lari (menit)", min_value=1, value=30)
        m_avg_hr_val = st.number_input("Rata-rata HR (bpm)", min_value=40, max_value=220, value=145)
        m_max_hr_val = st.number_input("Max HR Aktual (bpm)", min_value=100, max_value=250, value=180)
        
        submitted_run = st.form_submit_button("Simpan Lari")
        if submitted_run:
            epoch_ms = int(datetime.datetime.combine(m_date, datetime.time.min).timestamp() * 1000)
            new_run = {
                "startTimeLocal": epoch_ms,
                "distance": int(m_distance_km * 100000),
                "avgHr": m_avg_hr_val,
                "maxHr": m_max_hr_val,
                "activityType": "running"
            }
            data_store["running_activities"].append(new_run)
            if m_max_hr_val > data_store.get("max_hr", 0):
                data_store["max_hr"] = m_max_hr_val
            save_local_data(data_store)
            st.sidebar.success("Lari manual berhasil disimpan!")
            st.rerun()

# 3. Add Manual Sleep
with st.sidebar.expander("🌙 Catat Tidur Semalam"):
    with st.form("manual_sleep_form", clear_on_submit=True):
        s_date = st.date_input("Tanggal Tidur", datetime.date.today())
        s_quality = st.selectbox(
            "Kualitas Tidur",
            ["Sangat Pulas & Segar", "Cukup Baik", "Kurang Nyenyak", "Begadang / Sangat Kurang"],
            index=1
        )
        s_duration = st.number_input("Durasi Tidur (jam)", min_value=1.0, max_value=24.0, value=7.0, step=0.5)
        
        submitted_sleep = st.form_submit_button("Simpan Tidur")
        if submitted_sleep:
            if s_quality == "Sangat Pulas & Segar":
                score = 90
            elif s_quality == "Cukup Baik":
                score = 75
            elif s_quality == "Kurang Nyenyak":
                score = 55
            else:
                score = 30
                
            date_str = s_date.strftime('%Y-%m-%d')
            data_store["sleep_records"][date_str] = {
                "score": score,
                "duration": s_duration
            }
            save_local_data(data_store)
            st.sidebar.success("Data tidur berhasil disimpan!")
            st.rerun()

# 4. Reset Data
st.sidebar.markdown("---")
if st.sidebar.button("🗑️ Reset & Hapus Semua Data"):
    if DATA_FILE.exists():
        DATA_FILE.unlink()
    st.cache_data.clear()
    st.sidebar.success("Semua data lokal berhasil dihapus!")
    st.rerun()

# Extract database contents for visualization and logic
run_acts = data_store.get("running_activities", [])
sleep_recs = data_store.get("sleep_records", {})
actual_max_hr = data_store.get("max_hr", 0)

if not run_acts:
    st.info("👋 **Selamat datang di SmartCoach AI!**\n\nDatabase lokal lo masih kosong. Untuk memulai rekomendasi jadwal dan analitik, silakan:\n1. **Upload Garmin (.zip)** di sidebar sebelah kiri jika punya ekspor data Garmin Connect.\n2. Atau, **Tambah Sesi Lari Manual** & **Catat Tidur Semalam** di sidebar untuk mengisi data secara berkala.\n\n*Semua data yang lo upload/ketik akan tersimpan aman di komputer lokal lo sendiri (`data_store.json`)!*")
else:
    # --- Calculate overall stats ---
    total_dist = sum(a.get('distance', 0) / 100000 for a in run_acts)
    avg_hr = sum(a.get('avgHr', 0) for a in run_acts) / len(run_acts) if run_acts else 0
    total_sessions = len(run_acts)
    
    # Get latest sleep score
    sorted_sleep_dates = sorted(sleep_recs.keys(), reverse=True)
    if sorted_sleep_dates:
        latest_date = sorted_sleep_dates[0]
        latest_score = sleep_recs[latest_date]['score']
    else:
        latest_score = None
       # --- Metrics Dashboard ---
    est_max_hr = 220 - age
    st.markdown(textwrap.dedent(f"""
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
        <div class="bg-slate-900/50 backdrop-blur-md border border-slate-800 hover:border-indigo-500/50 transition-all duration-300 rounded-2xl p-5 shadow-xl">
            <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Jarak</span>
            <div class="text-3xl font-extrabold text-white mt-2">{total_dist:.2f} <span class="text-lg font-medium text-slate-500">km</span></div>
        </div>
        <div class="bg-slate-900/50 backdrop-blur-md border border-slate-800 hover:border-pink-500/50 transition-all duration-300 rounded-2xl p-5 shadow-xl">
            <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Sesi</span>
            <div class="text-3xl font-extrabold text-white mt-2">{total_sessions} <span class="text-lg font-medium text-slate-500">kali</span></div>
        </div>
        <div class="bg-slate-900/50 backdrop-blur-md border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 rounded-2xl p-5 shadow-xl">
            <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Avg Heart Rate</span>
            <div class="text-3xl font-extrabold text-white mt-2">{int(avg_hr)} <span class="text-lg font-medium text-slate-500">bpm</span></div>
        </div>
        <div class="bg-slate-900/50 backdrop-blur-md border border-slate-800 hover:border-orange-500/50 transition-all duration-300 rounded-2xl p-5 shadow-xl">
            <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Actual Max HR</span>
            <div class="text-3xl font-extrabold text-white mt-2">{actual_max_hr} <span class="text-lg font-medium text-slate-500">bpm</span></div>
        </div>
    </div>
    
    <div class="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-4 text-slate-300 text-sm my-4">
        💡 <strong>Insight Detak Jantung:</strong> Estimasi Max HR berdasarkan umur ({age} tahun) adalah {est_max_hr} bpm, tapi data mencatat hingga {actual_max_hr} bpm. Zona latihan lo dikalkulasi berdasarkan Max HR aktual ({actual_max_hr} bpm) agar lebih akurat.
    </div>
    """), unsafe_allow_html=True)

    # --- Trend Chart ---
    st.subheader("📈 Tren Jarak Lari")
    trend_data = []
    for a in run_acts:
        date = ms_to_date(a['startTimeLocal'])
        month = date[:7]
        trend_data.append({"Month": month, "Distance": a.get('distance', 0) / 100000})

    df_trend = pd.DataFrame(trend_data).groupby("Month").sum().reset_index()
    fig = px.line(df_trend, x="Month", y="Distance", title="Total Distance per Month (km)", markers=True)
    st.plotly_chart(fig, use_container_width=True)

    # --- Sleep Correlation ---
    st.subheader("🌙 Korelasi Tidur & Lari")
    run_dates = {ms_to_date(a.get('startTimeLocal')) for a in run_acts if a.get('startTimeLocal')}
    run_day_scores = [v['score'] for k, v in sleep_recs.items() if k in run_dates]
    non_run_day_scores = [v['score'] for k, v in sleep_recs.items() if k not in run_dates]

    if run_day_scores and non_run_day_scores:
        avg_run_sleep = sum(run_day_scores) / len(run_day_scores)
        avg_non_run_sleep = sum(non_run_day_scores) / len(non_run_day_scores)
        diff = avg_run_sleep - avg_non_run_sleep
        
        diff_text = f"Lari meningkatkan kualitas tidur lo sebesar <b>{diff:.1f} poin</b>! 🏃‍♂️💤" if diff > 0 else f"Tidur lo cenderung lebih baik saat hari tidak lari (selisih {abs(diff):.1f} poin)."
        diff_bg = "bg-emerald-950/30 border-emerald-900/50 text-emerald-300" if diff > 0 else "bg-slate-950/30 border-slate-900/50 text-slate-300"
        
        st.markdown(textwrap.dedent(f"""
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
            <div class="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-4 text-center">
                <div class="text-xs text-indigo-300 uppercase tracking-wider font-semibold">Tidur Setelah Lari (Run Day)</div>
                <div class="text-3xl font-bold text-white mt-1">{avg_run_sleep:.1f} <span class="text-sm font-normal text-slate-400">/100</span></div>
            </div>
            <div class="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                <div class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Tidur Tanpa Lari (Non-Run Day)</div>
                <div class="text-3xl font-bold text-slate-300 mt-1">{avg_non_run_sleep:.1f} <span class="text-sm font-normal text-slate-400">/100</span></div>
            </div>
        </div>
        <div class="{diff_bg} border rounded-xl p-4 text-sm font-medium my-2">
            📊 {diff_text}
        </div>
        """), unsafe_allow_html=True)
    else:
        st.info("Data tidur tidak cukup untuk korelasi.")

    # --- Dynamic Adjustment (The "Smart" Part) ---
    st.subheader("🤖 Smart Adjustment Hari Ini")
    
    if latest_score is not None:
        st.write(f"Skor tidur terakhir lo ({latest_date}): **{latest_score}**")

        if latest_score < 60:
            st.markdown("""
            <div class="bg-rose-950/30 border border-rose-900/50 rounded-xl p-4 my-2 text-rose-300 text-sm">
                <strong>🚨 Saran AI (Kondisi Drop):</strong> Tidur lo kurang banget semalam. Kalau jadwal lo hari ini adalah latihan intensitas tinggi (Interval/Tempo), <b>sangat disarankan ganti jadi Easy Run atau Rest</b> untuk mencegah cedera otot dan jantung.
            </div>
            """, unsafe_allow_html=True)
        elif latest_score < 80:
            st.markdown("""
            <div class="bg-amber-950/30 border border-amber-900/50 rounded-xl p-4 my-2 text-amber-300 text-sm">
                <strong>⚠️ Saran AI (Kondisi Sedang):</strong> Tidur lo cukup, tapi belum optimal untuk push limit. Lo bisa jalankan latihan sesuai jadwal hari ini, tapi jaga intensitas agar tetap terkontrol. Jangan dipaksa sampai limit terbawah.
            </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown("""
            <div class="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-4 my-2 text-emerald-300 text-sm">
                <strong>✅ Saran AI (Kondisi Prima!):</strong> Skor tidur lo sangat baik! Tubuh lo dalam kondisi recovery maksimal. Hari ini waktu yang sangat pas untuk push latihan intensitas tinggi (Tempo/Interval).
            </div>
            """, unsafe_allow_html=True)
    else:
        st.info("Tidak ada data tidur terbaru untuk penyesuaian otomatis.")

    # --- Training Plan ---
    st.subheader("📅 Rekomendasi Pola Latihan")

    if work_type == "Kantoran (Weekend Free)":
        st.markdown("Karena lo cuma bisa *push* di weekend, gue saranin pake pola **\"Maintenance-Push\"**. Jangan terlalu maksain di hari kerja biar nggak *burnout* mental karena kerjaan.")
        
        # Hitung target pace berdasarkan input
        paces = get_pace_recommendations(target_pace)
        
        st.markdown(textwrap.dedent(f"""
        <div class="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 my-4">
            <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">🎯 Target Pace Lo Berdasarkan Intensitas</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="bg-rose-950/10 border border-rose-900/30 rounded-xl p-3">
                    <div class="text-xs text-rose-400 font-semibold uppercase">🔥 Ngepush (Interval/Tempo)</div>
                    <div class="text-xl font-bold text-white mt-1">{paces['ngepush']} <span class="text-xs font-normal text-slate-400">min/km</span></div>
                </div>
                <div class="bg-sky-950/10 border border-sky-900/30 rounded-xl p-3">
                    <div class="text-xs text-sky-400 font-semibold uppercase">🏃 Sedang (Steady/Long Run)</div>
                    <div class="text-xl font-bold text-white mt-1">{paces['sedang']} <span class="text-xs font-normal text-slate-400">min/km</span></div>
                </div>
                <div class="bg-emerald-950/10 border border-emerald-900/30 rounded-xl p-3">
                    <div class="text-xs text-emerald-400 font-semibold uppercase">🚶 Santai (Easy/Recovery)</div>
                    <div class="text-xl font-bold text-white mt-1">{paces['santai']} <span class="text-xs font-normal text-slate-400">min/km</span></div>
                </div>
            </div>
        </div>
        """), unsafe_allow_html=True)
        
        st.markdown("📆 **Jadwal Mingguan:**")
        
        if program_style == "Ngepush Banget (Progres Cepat/Target Dekat)":
            plan = [
                {"Hari": "Senin", "Jenis Latihan": "Rest / Stretching", "Durasi/Intensitas": "-", "Tujuan": "Pemulihan setelah weekend push."},
                {"Hari": "Selasa", "Jenis Latihan": "Easy Run", "Durasi/Intensitas": f"30-45 menit (Pace Santai: {paces['santai']})", "Tujuan": "Membangun volume lari dasar."},
                {"Hari": "Rabu", "Jenis Latihan": "Rest / Core & Leg Stabilizer", "Durasi/Intensitas": "20-30 menit (Detail di bawah)", "Tujuan": "Perkuat otot inti & penstabil kaki agar lari stabil & cegah cedera."},
                {"Hari": "Kamis", "Jenis Latihan": "Interval/Tempo", "Durasi/Intensitas": f"30-40 menit (Pace Ngepush: {paces['ngepush']})", "Tujuan": "Melatih jantung, VO2 Max, & kecepatan (Speed)."},
                {"Hari": "Jumat", "Jenis Latihan": "Rest / Walk", "Durasi/Intensitas": "Jalan santai", "Tujuan": "Persiapan buat Long Run weekend."},
                {"Hari": "Sabtu", "Jenis Latihan": "Long Run", "Durasi/Intensitas": f"90-120 menit (Pace Sedang: {paces['sedang']})", "Tujuan": "Membangun stamina (Endurance) & mental lari jauh."},
                {"Hari": "Minggu", "Jenis Latihan": "Active Recovery", "Durasi/Intensitas": f"30 menit (Pace Santai: {paces['santai']}) atau Yoga", "Tujuan": "Buang asam laktat biar Senin nggak pegel."}
            ]
        elif program_style == "Sedang (Bertahap/Seimbang)":
            plan = [
                {"Hari": "Senin", "Jenis Latihan": "Rest / Stretching", "Durasi/Intensitas": "-", "Tujuan": "Pemulihan setelah weekend push."},
                {"Hari": "Selasa", "Jenis Latihan": "Easy Run", "Durasi/Intensitas": f"20-30 menit (Pace Santai: {paces['santai']})", "Tujuan": "Menjaga konsistensi & aliran darah."},
                {"Hari": "Rabu", "Jenis Latihan": "Rest / Core & Leg Stabilizer", "Durasi/Intensitas": "15-20 menit (Detail di bawah)", "Tujuan": "Perkuat otot inti & penstabil kaki agar lari stabil & cegah cedera."},
                {"Hari": "Kamis", "Jenis Latihan": "Interval/Tempo", "Durasi/Intensitas": f"20-30 menit (Pace Ngepush: {paces['ngepush']})", "Tujuan": "Melatih jantung & kecepatan (Speed)."},
                {"Hari": "Jumat", "Jenis Latihan": "Rest / Walk", "Durasi/Intensitas": "Jalan santai", "Tujuan": "Persiapan buat Long Run weekend."},
                {"Hari": "Sabtu", "Jenis Latihan": "Long Run", "Durasi/Intensitas": f"60-90 menit (Pace Sedang: {paces['sedang']})", "Tujuan": "Membangun stamina (Endurance)."},
                {"Hari": "Minggu", "Jenis Latihan": "Active Recovery", "Durasi/Intensitas": "Jalan santai atau Yoga", "Tujuan": "Buang asam laktat biar Senin nggak pegel."}
            ]
        else: # Santai (Konsisten/Jangka Panjang)
            plan = [
                {"Hari": "Senin", "Jenis Latihan": "Rest / Stretching", "Durasi/Intensitas": "-", "Tujuan": "Pemulihan total."},
                {"Hari": "Selasa", "Jenis Latihan": "Easy Run / Jog", "Durasi/Intensitas": f"20 menit (Pace Santai: {paces['santai']})", "Tujuan": "Membangun konsistensi & kebiasaan lari."},
                {"Hari": "Rabu", "Jenis Latihan": "Rest / Core & Leg Stabilizer", "Durasi/Intensitas": "10-15 menit (Detail di bawah)", "Tujuan": "Perkuat otot stabilizer kaki secara bertahap."},
                {"Hari": "Kamis", "Jenis Latihan": "Easy Run / Walk", "Durasi/Intensitas": f"20-30 menit (Pace Santai: {paces['santai']})", "Tujuan": "Melatih jantung ringan tanpa stres tinggi."},
                {"Hari": "Jumat", "Jenis Latihan": "Rest / stretching ringan", "Durasi/Intensitas": "-", "Tujuan": "Menjaga kebugaran otot."},
                {"Hari": "Sabtu", "Jenis Latihan": "Easy Long Run", "Durasi/Intensitas": f"45-60 menit (Pace Santai: {paces['santai']})", "Tujuan": "Membangun ketahanan fisik secara aman."},
                {"Hari": "Minggu", "Jenis Latihan": "Rest / Restorative Yoga", "Durasi/Intensitas": "-", "Tujuan": "Istirahat total agar siap untuk minggu depan."}
            ]
        
        # Modify plan based on Goal (Only if not Santai)
        if program_style != "Santai (Konsisten/Jangka Panjang)":
            if goal == "10K Race":
                plan[3]["Durasi/Intensitas"] = f"Interval 400m x 8 (Pace Ngepush: {paces['ngepush']})"
                plan[5]["Durasi/Intensitas"] = f"8-12km (Pace Sedang: {paces['sedang']})"
            elif goal == "Marathon":
                plan[1]["Durasi/Intensitas"] = f"40-50 menit (Pace Santai: {paces['santai']})"
                plan[5]["Durasi/Intensitas"] = f"15-30km (Pace Sedang: {paces['sedang']})"
            elif goal == "Weight Loss":
                plan[3]["Jenis Latihan"] = "HIIT / Tempo Run"
                plan[3]["Durasi/Intensitas"] = f"20-30 menit (Pace Ngepush: {paces['ngepush']})"
                plan[6]["Jenis Latihan"] = "Brisk Walk / Light Jog"
                plan[6]["Durasi/Intensitas"] = f"30-45 menit (Pace Santai: {paces['santai']})"

        # Render custom HTML Table with Badges
        rows_html = ""
        for item in plan:
            jenis = item["Jenis Latihan"]
            if "Rest" in jenis:
                badge = f'<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-400">{jenis}</span>'
            elif "Easy" in jenis or "Active" in jenis:
                badge = f'<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900">{jenis}</span>'
            elif "Interval" in jenis or "HIIT" in jenis:
                badge = f'<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-950 text-rose-400 border border-rose-900">{jenis}</span>'
            elif "Long Run" in jenis:
                badge = f'<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-sky-950 text-sky-400 border border-sky-900">{jenis}</span>'
            else:
                badge = f'<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-950 text-indigo-400 border border-indigo-900">{jenis}</span>'
            
            rows_html += textwrap.dedent(f"""
            <tr class="border-b border-slate-800 hover:bg-slate-900/30 transition-colors">
                <td class="px-4 py-3.5 text-sm font-semibold text-slate-300">{item['Hari']}</td>
                <td class="px-4 py-3.5 text-sm">{badge}</td>
                <td class="px-4 py-3.5 text-sm font-medium text-white">{item['Durasi/Intensitas']}</td>
                <td class="px-4 py-3.5 text-sm text-slate-400">{item['Tujuan']}</td>
            </tr>
            """)
        
        table_html = textwrap.dedent(f"""
        <div class="overflow-x-auto border border-slate-800 rounded-xl my-4">
            <table class="min-w-full divide-y divide-slate-800 bg-slate-950/20 text-left">
                <thead>
                    <tr class="bg-slate-900/50">
                        <th class="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Hari</th>
                        <th class="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Jenis Latihan</th>
                        <th class="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Durasi / Intensitas</th>
                        <th class="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tujuan</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-800">
                    {rows_html}
                </tbody>
            </table>
        </div>
        """)
        st.markdown(table_html, unsafe_allow_html=True)
        
        sleep_tip = f"Skor tidur {latest_score} itu tanda lo butuh istirahat lebih. Coba tidur 30 menit lebih awal, terutama setelah hari Kamis (Interval) dan Sabtu (Long Run)." if latest_score and latest_score < 80 else "Tidur lo cukup bagus. Pastikan lo tetap jaga waktu istirahat, terutama setelah hari Kamis (Interval) dan Sabtu (Long Run)."
        
        st.markdown(f"""
💡 **Tips Tambahan buat Lo:**
1. **Jangan "Balas Dendam" di Weekend:** Karena Senin-Jumat intensitasnya rendah, jangan tiba-tiba lari 20km di hari Sabtu kalau badan belum siap. Naikkan jarak pelan-pelan (maksimal 10% per minggu).
2. **Fokus di Tidur:** {sleep_tip}
3. **Manfaatkan Waktu Kerja:** Kalau memungkinkan, coba jalan kaki lebih banyak di kantor atau naik tangga untuk menjaga metabolisme sebelum weekend push.

Kira-kira pola ini masuk nggak sama jam kerja lo, bro? Kalau keberatan di hari tertentu, billing ya, nanti gue sesuaikan lagi!
        """)

        with st.expander("🛠️ **Detail Latihan Core & Leg Stabilizer (Alternatif Squat & Lunges)**"):
                st.markdown("""
                Bagi pelari, kekuatan otot penstabil pinggul (*hip stabilizers*), pantat (*glutes*), dan engkel jauh lebih penting untuk mencegah cedera lutut/ITB band. **Semua gerakan di bawah ini 100% menggunakan berat tubuh sendiri (bodyweight) dan bisa dilakukan di rumah tanpa alat sama sekali!**
                
                Berikut gerakan terbaik yang fokus ke stabilitas kaki tanpa butuh squat atau lunges:
                
                1. **Glute Bridges (Fokus Pantat & Hamstring)**
                   - *Cara:* Rebahan, tekuk lutut, angkat pantat ke atas hingga sejajar paha dan dada. Kencangkan pantat di atas selama 2 detik baru turun.
                   - *Variasi:* Angkat satu kaki lurus ke depan saat memosisikan pantat ke atas (*Single-Leg Glute Bridge*).
                
                2. **Clamshells (Fokus Gluteus Medius / Samping Bokong)**
                   - *Cara:* Tidur miring, tekuk lutut 90 derajat. Buka lutut atas ke atas seperti kerang terbuka tanpa menggeser pinggul. 
                   - *Manfaat:* Mencegah lutut menekuk ke dalam (*knee valgus*) saat mendarat ketika lari.
                
                3. **Calf Raises / Jinjit (Fokus Betis & Achilles)**
                   - *Cara:* Jinjit perlahan lalu turunkan tumit perlahan. Lebih bagus dilakukan di ujung tangga agar tumit bisa turun sedikit lebih rendah dari jari kaki.
                   - *Manfaat:* Mencegah sakit tulang kering (*shin splints*) dan menguatkan dorongan kaki (*push-off*).
                
                4. **Single-Leg Romanian Deadlift (RDL - Tanpa Beban)**
                   - *Cara:* Berdiri satu kaki, dorong pinggul ke belakang sambil membungkuk ke depan (badan sejajar lantai) dan kaki satunya lurus ke belakang. Jaga punggung tetap lurus.
                   - *Manfaat:* Melatih stabilitas engkel kaki dan kekuatan otot paha belakang (*hamstring*).
                
                5. **Fire Hydrants (Fokus Sendi Pinggul)**
                   - *Cara:* Posisi merangkak, angkat satu lutut ke arah samping luar tanpa memutar punggung/pinggul.
                   - *Manfaat:* Membuka mobilitas pinggul biar langkah lari lebih lebar dan luwes.
                   
                *Rekomendasi:* Lakukan gerakan-gerakan ini sebanyak **2-3 set x 10-15 repetisi** setiap hari Rabu untuk menjaga kaki bebas cedera.
                """)
    else:
        st.info("Pola latihan kustom untuk jadwal selain Kantoran sedang dalam pengembangan.")
