# config.py
SENSOR_CONFIG = {
    'sampling_rate': 10,  # seconds (def. 60)

    # Sensor ranges
    'temperature_range': (-15, 35), # °C
    'humidity_range': (30, 100),    # %
    'pressure_range': (980, 1020),  # hPa
    'voc_range': (0, 3),            # ppm
    'co2_range': (400, 2000),       # ppm
    'pm25_range': (0, 150),         # µg/m³
    'pm10_range': (0, 300),         # µg/m³
    'no2_range': (0, 200),          # µg/m³
    'o3_range': (0, 200),           # µg/m³
    'so2_range': (0, 300),          # µg/m³
}