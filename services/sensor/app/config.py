SENSOR_CONFIG = {
    'sampling_rate': 1,  # seconds (def. 60)
    'data_file': '/data/air_quality_data.csv',

    # Sensor ranges
    'temperature_range': (-15, 35), # °C
    'humidity_range': (30, 100),    # %
    'pressure_range': (980, 1020),  # hPa
    'pm25_range': (0, 50),          # µg/m³
    'pm10_range': (0, 100),         # µg/m³
    'voc_range': (0, 3),            # ppm
    'co2_range': (400, 2000),       # ppm
}