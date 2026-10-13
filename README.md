# Smart LPG Monitor – Gas Usage & Depletion Forecaster

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Recharts](https://img.shields.io/badge/Recharts-2.15-orange.svg)](https://recharts.org/)
[![Vercel Deploy](https://img.shields.io/badge/Deploy-Vercel-black.svg)](https://vercel.com/)

A modern, responsive dashboard designed to monitor Liquefied Petroleum Gas (LPG) cylinder consumption in real-time, compute net gas reserves based on tare weight mechanics, and project intelligent depletion dates using measured historical burn rates.

Built entirely as a client-side single-page application with **React, TypeScript, Tailwind CSS, Recharts, and Lucide React**. Operates 100% locally with `localStorage` persistence—requiring **no Flask, Node.js server, or external database hosting**—and deploys directly to **Vercel** with zero configuration.

---

## 🎯 Key Features

### 1. Cylinder Overview & Volumetric Gauge
- **Total Scale Weight**: Displays gross scale reading in kilograms with high precision.
- **Configurable Tare Weight**: Accommodates standard empty cylinder tare weights (stamped on the metal cylinder collar) with quick-edit presets (15.3 kg domestic, 18.5 kg commercial, 4.8 kg mini, or custom).
- **Physical Net Gas Calculation**: Strictly enforces `Net Remaining LPG = Total Weight - Tare Weight`, eliminating false measurements.
- **3D Cylinder Liquid Indicator**: Custom SVG graphic illustrating physical gas liquid level, metallic specular reflections, valve nozzle, and color transitions:
  - 🟢 **Emerald Green**: Healthy capacity (> 20%)
  - 🟠 **Amber Orange**: Low reserve alert (10% - 20%)
  - 🔴 **Crimson Red**: Critical depletion warning (< 10%)

### 2. Scientific Gas Depletion Forecaster
- **Historical Burn Rate Estimation**: Calculates average daily gas consumption ($kg/\text{day}$) across timestamped intervals.
- **Detailed Countdown**: Displays estimated days and hours remaining before cylinder exhaustion.
- **Depletion Date & Time**: Projects the exact calendar date of depletion.
- **Strict Data Honesty**: Shows **"Collecting usage data"** when insufficient readings are available. Does not fabricate artificial measurements.
- **Refill Detection**: Automatically detects cylinder swaps/refills (weight increases $> 0.5\text{ kg}$) and isolates consumption calculations to the active cylinder cycle.

### 3. Usage History & Interactive Charting
- **Recharts Visualization**:
  - **Weight Line & Projection**: Plots historical scale weights connected to a dashed linear forecast line pointing down to the red Tare Baseline (empty mark).
  - **Usage Bar Chart**: Breaks down gas consumed between consecutive readings.
- **Time Window Filters**: Toggle between **All Time**, **Last 30 Days**, and **Last 7 Days**.
- **Historical Weight Log Table**: Searchable, timestamped table displaying date, total weight, net gas, delta change ($\pm kg$), source badge (`Manual` vs `ESP32`), notes, and delete capability.

### 4. ESP32 Hardware Integration & Offline Fallback
- **Dual Operating Modes**:
  - **Manual Mode (Default)**: Immediate functionality without physical hardware. Enter scale readings manually anytime.
  - **ESP32 Hardware Mode**: Connects to an ESP32 microcontroller with an HX711 load cell amplifier over local Wi-Fi.
- **Configurable REST Endpoint**: Set via `VITE_ESP32_API_URL` or directly in the settings UI.
- **Honest Connection State**: Verifies network connectivity, reports timeouts, and never fakes connection when hardware is offline.
- **Built-in Arduino C++ Firmware Sketch**: Includes a copy-pasteable Arduino sketch for ESP32 + HX711 with CORS enabled.

### 5. Supabase Cloud Sync & Offline-First Hybrid Architecture
- **Real-Time Cloud Persistence**: Back up and synchronize all logged scale readings and cylinder specs to your private Supabase PostgreSQL database.
- **Offline-First Resilience**: Automatically falls back to browser `localStorage` if offline or if Supabase credentials are not yet configured.
- **Dynamic Configuration**: Enter your Supabase Project URL & Anon Public Key in `.env` or paste them on-the-fly directly in the in-app **Settings → Supabase Cloud** panel.
- **Includes SQL Schema**: Ready-to-run database schema with Row Level Security (RLS) policies included in `supabase/schema.sql` and copyable with 1-click in the UI.

### 6. Multi-Level Alert System
- **Critical Low Gas Warning**: Triggers when gas falls below 10%.
- **Low Gas Warning**: Triggers when gas falls below 20%.
- **Approaching Depletion Notice**: Alerts when predicted exhaustion is within 3 days.
- **Tare Misconfiguration Warning**: Flags scale readings that are lower than the tare weight.
- **Data Collection Guidance**: Recommends logging readings when fewer than 2 valid points exist.

---

## 🧮 Mathematical Formulas

The forecaster adheres to standard physical metrology:

$$\text{Remaining LPG (kg)} = \max(0, \text{Gross Scale Weight} - \text{Tare Weight})$$

$$\text{Remaining Percentage (\%)} = \min\left(100, \left(\frac{\text{Remaining LPG}}{\text{Nominal Capacity}}\right) \times 100\right)$$

$$\Delta\text{Elapsed Days} = \frac{t_i - t_{i-1}}{86,400,000\text{ ms}}$$

$$\text{Average Daily Consumption} = \frac{\sum \Delta\text{Gas Consumed}}{\sum \Delta\text{Elapsed Days}}$$

$$\text{Days Remaining} = \frac{\text{Remaining LPG}}{\text{Average Daily Consumption}}$$

$$\text{Predicted Depletion Timestamp} = t_{\text{latest}} + (\text{Days Remaining} \times 86,400\text{ s})$$

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19 + TypeScript |
| **Build Tool** | Vite 8 |
| **Styling** | Tailwind CSS v4 (Dark Charcoal `#0c0f14` theme) |
| **Charts** | Recharts 2.15 |
| **Icons** | Lucide React |
| **Storage** | LocalStorage API |
| **Deployment** | Vercel (Zero-config static hosting) |

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js `v18.0.0` or higher
- npm `v9.0.0` or higher

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/smart-lpg-monitor.git
   cd smart-lpg-monitor
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configure environment variables (optional):**
   ```bash
   cp .env.example .env
   ```
   Add your Supabase credentials to `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-api-key
   ```

4. **Initialize Supabase Database:**
   - In your Supabase Dashboard, go to **SQL Editor**.
   - Copy the schema from `supabase/schema.sql` (or click **Copy SQL** in the app's Settings modal).
   - Run the query to create the tables `lpg_readings` and `lpg_config`.

5. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173/`.

6. **Build for production:**
   ```bash
   npm run build
   ```

---

## ☁️ Deploying to Vercel

The application contains a pre-configured `vercel.json` file and builds into a pure static SPA bundle.

### Option A: Deploy via Vercel Dashboard (Recommended)
1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Visit [Vercel](https://vercel.com/) and click **"Add New Project"**.
3. Import your repository.
4. Keep the default build settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install --legacy-peer-deps`
5. Click **"Deploy"**.

### Option B: Deploy via Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## 📡 ESP32 Hardware Integration Guide

To connect an automated load cell scale:

### Hardware Components
- 1× ESP32 Development Board (e.g. ESP32 WROOM-32)
- 1× HX711 24-bit ADC Load Cell Amplifier Module
- 4× 50kg Load Cells (with 3-wire combiner) or 1× Heavy-duty 40kg/50kg Bar Load Cell

### Pinout Connections
| HX711 Pin | ESP32 GPIO |
|---|---|
| **DT (Data)** | GPIO 21 |
| **SCK (Clock)** | GPIO 22 |
| **VCC** | 5V / 3.3V |
| **GND** | GND |

### Arduino C++ Sketch
A complete firmware sketch with WiFi configuration and CORS-enabled HTTP REST server is available directly inside the app under **Settings → ESP32 Hardware → Copy Sketch**.

---

## 🛡️ License
MIT License. Open-source for personal and commercial usage.
