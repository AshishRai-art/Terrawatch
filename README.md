
# TerraWatch — Mine Subsidence Monitoring & Early Warning System

TerraWatch is a low-cost IoT-based mine subsidence monitoring and early warning prototype designed to help identify measurable indicators of ground instability.

The project combines multi-sensor monitoring, local alerts, data logging, and wireless communication to support safety-focused mine monitoring.

> **Project Status:** Prototype / Research Concept
>
> The proposed Adaptive Precursor Convergence Index (APCI) is a research hypothesis that requires literature review, field testing, calibration, and validation before any real-world deployment claims.

## 🚀 Key Features

- Multi-sensor monitoring for ground instability indicators
- Ground tilt monitoring using MPU6050
- Crack-width monitoring using a linear potentiometer / crack meter
- Surface settlement monitoring using an ultrasonic sensor
- Soil moisture monitoring for potential water ingress indicators
- Vibration detection using SW-420
- ESP32-based sensor node
- Local buzzer and LED alerts
- SD card data logging with timestamps
- LoRa-based wireless communication concept
- Dashboard for monitoring sensor values and node status
- Research-oriented APCI risk scoring concept

## 💡 Proposed Innovation: APCI

**Adaptive Precursor Convergence Index (APCI)** is a proposed research concept for combining multiple monitoring indicators into an interpretable risk score.

The concept explores:

1. Baseline deviation
2. Trend changes
3. Persistence of unusual readings
4. Cross-sensor convergence

The objective is to investigate whether combining multiple indicators can provide more useful context than relying only on fixed single-sensor thresholds.

APCI is not a validated prediction model. Its reliability must be established through research, site-specific calibration, historical data analysis, and field validation.

## 🏗️ System Architecture

Sensors → ESP32 → Data Processing → Local Alert + SD Logging
                          ↓
                    LoRa Communication
                          ↓
                    Monitoring Dashboard

## 🔧 Hardware Components

| Component | Purpose |
|---|---|
| ESP32 | Main processing unit |
| MPU6050 | Tilt and motion monitoring |
| Ultrasonic Sensor | Surface settlement measurement concept |
| Linear Potentiometer | Crack-width measurement prototype |
| Soil Moisture Sensor | Water ingress indicator |
| SW-420 | Vibration detection |
| DS3231 RTC | Timestamping |
| SD Card | Local data storage |
| LoRa Module | Wireless communication |
| Buzzer + LED | Local warning indicators |

## 🖥️ Software & Technologies

- HTML, CSS, JavaScript
- Vite
- Node.js / npm
- ESP32 Arduino framework (hardware prototype)
- LoRa communication concept
- Git & GitHub

## 📂 Project Setup

### Clone the Repository

```bash
git clone https://github.com/AshishRai-art/Terrawatch.git
cd Terrawatch
```

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

Open the local URL displayed in the terminal.

### Build for Production

```bash
npm run build
```

### Run Lint

```bash
npm run lint
```

## 📊 Monitoring Workflow

1. Sensors collect environmental and ground movement indicators.
2. ESP32 processes the sensor readings.
3. Data is timestamped and stored locally.
4. The system evaluates configured warning conditions.
5. Local alerts can operate independently of network availability.
6. LoRa communication can transmit data to a gateway when available.
7. The dashboard displays monitoring information and node status.

## 🌐 Intended Applications

- Mine subsidence monitoring research
- Open-pit slope monitoring research
- Underground mine safety technology prototypes
- Remote environmental and structural monitoring
- Multi-node IoT monitoring experiments

## ⚠️ Limitations & Safety

- This project is a prototype and is not a certified mine safety system.
- Sensor readings require calibration and environmental testing.
- Wireless performance depends on mine conditions and infrastructure.
- Sensor failure, dust, moisture, and power limitations must be considered.
- Risk scores must not be treated as confirmed collapse predictions.
- Real-world deployment requires expert review, appropriate testing, and regulatory compliance.

## 🔬 Future Improvements

- Site-specific baseline calibration
- Sensor fault detection
- Improved data visualization
- Offline-first dashboard functionality
- Multi-node monitoring
- Historical trend analysis
- APCI research and validation
- Field testing with domain experts
- Ruggedized hardware enclosure
- Solar and battery power options

## 👨‍💻 Project Information

**Project Name:** TerraWatch

**Category:** IoT · Mine Safety · Environmental Monitoring · Early Warning Research

**Project Type:** Prototype / Research Concept

**Repository:** https://github.com/AshishRai-art/Terrawatch

## 📜 License

Add an appropriate open-source license after deciding how you want your project to be used and shared.

---

Built as a technology prototype exploring affordable and multi-sensor approaches to mine safety monitoring.
