import time
import random
import csv
from datetime import datetime
import numpy as np
from config import SENSOR_CONFIG
import os

class AirQualitySensor:
    def __init__(self, config):
        self.config = config
        self.ensure_data_directory()
        self.initialize_csv()

    def ensure_data_directory(self):
        os.makedirs(os.path.dirname(self.config['data_file']), exist_ok=True)

    def initialize_csv(self):
        headers = [
            'timestamp',
            'temperature',
            'humidity',
            'pressure',
            'pm25',
            'pm10',
            'voc',
            'co2'
        ]

        with open(self.config['data_file'], 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(headers)

    def generate_reading(self):
        """Generate a realistic sensor reading with some correlation between values"""

        # Base temperature affects humidity
        temp = random.uniform(*self.config['temperature_range'])

        # Higher temperature generally means lower humidity
        humidity_max = self.config['humidity_range'][1] - (temp - self.config['temperature_range'][0])
        humidity = random.uniform(self.config['humidity_range'][0], humidity_max)

        # Pressure varies slowly over time
        if not hasattr(self, 'last_pressure'):
            self.last_pressure = np.mean(self.config['pressure_range'])

        pressure = self.last_pressure + random.uniform(-1, 1)
        pressure = np.clip(pressure, *self.config['pressure_range'])
        self.last_pressure = pressure

        # PM2.5 and PM10 are correlated
        pm25 = random.uniform(*self.config['pm25_range'])
        pm10 = pm25 + random.uniform(0, self.config['pm10_range'][1] - pm25)

        # VOC levels
        voc = random.uniform(*self.config['voc_range'])

        # CO2 levels - tends to build up and then decrease
        if not hasattr(self, 'last_co2'):
            self.last_co2 = 400  # Starting with typical outdoor CO2 level

        # CO2 changes more dramatically in enclosed spaces
        co2_change = random.uniform(-50, 100)
        new_co2 = self.last_co2 + co2_change
        new_co2 = np.clip(new_co2, *self.config['co2_range'])
        self.last_co2 = new_co2

        return {
            'timestamp': datetime.now().isoformat(),
            'temperature': round(temp, 2),
            'humidity': round(humidity, 2),
            'pressure': round(pressure, 2),
            'pm25': round(pm25, 2),
            'pm10': round(pm10, 2),
            'voc': round(voc, 3),
            'co2': round(new_co2, 1)
        }

    def save_reading(self, reading):
        with open(self.config['data_file'], 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(reading.values())

    def run(self):
        print(f"Starting air quality sensor simulation...")
        print(f"Data will be saved to: {self.config['data_file']}")

        try:
            while True:
                reading = self.generate_reading()
                self.save_reading(reading)
                print(f"Recorded: Temp: {reading['temperature']}°C, "
                      f"Humidity: {reading['humidity']}%, "
                      f"CO2: {reading['co2']} ppm, "
                      f"PM2.5: {reading['pm25']} µg/m³")
                time.sleep(self.config['sampling_rate'])
        except KeyboardInterrupt:
            print("\nStopping sensor simulation...")

if __name__ == "__main__":
    sensor = AirQualitySensor(SENSOR_CONFIG)
    sensor.run()