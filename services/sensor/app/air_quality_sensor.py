# air_quality_sensor.py
from datetime import datetime
import numpy as np
import random

class AirQualitySensor:
    def __init__(self, sensor, config):
        self.sensor = sensor
        self.config = config
        self.last_reading = None

    def get_name(self):
        return self.sensor['name']

    def hello(self):
        print(f"Hello, my name is “{self.sensor['name']}” and I am located at «{self.sensor['location']['coordinates']}»")

    def generate_reading(self):
        """Generate a realistic sensor reading with some correlation between values
        and small random changes (1-5%) from previous readings if available"""

        if self.last_reading is None:
            # First reading - generate baseline values

            # Base temperature affects humidity
            temp = random.uniform(*self.config['temperature_range'])

            # Higher temperature generally means lower humidity
            humidity_max = self.config['humidity_range'][1] - (temp - self.config['temperature_range'][0])
            humidity = random.uniform(self.config['humidity_range'][0], humidity_max)

            # Initial pressure
            pressure = np.mean(self.config['pressure_range'])

            # VOC levels
            voc = random.uniform(*self.config['voc_range'])

            # CO2 levels - starting with typical outdoor CO2 level
            co2 = 400

            # PM2.5 and PM10 are correlated
            pm25 = random.uniform(*self.config['pm25_range'])
            pm10 = pm25 + random.uniform(0, self.config['pm10_range'][1] - pm25)

            # Gas pollutants - NO2, O3, SO2
            no2 = random.uniform(*self.config['no2_range'])
            o3 = random.uniform(*self.config['o3_range'])
            so2 = random.uniform(*self.config['so2_range'])
        else:
            # Apply random change of 1-5% to previous values
            def random_change(value):
                percent_change = random.uniform(0.01, 0.05)  # 1-5%
                direction = random.choice([-1, 1])  # Increase or decrease
                return value * (1 + direction * percent_change)

            # Get values from last reading with random changes
            temp = random_change(self.last_reading['temperature'])
            temp = np.clip(temp, *self.config['temperature_range'])

            # Keep humidity correlation with temperature
            humidity_max = self.config['humidity_range'][1] - (temp - self.config['temperature_range'][0])
            humidity = random_change(self.last_reading['humidity'])
            humidity = np.clip(humidity, self.config['humidity_range'][0], humidity_max)

            # Pressure with random change
            pressure = random_change(self.last_reading['pressure'])
            pressure = np.clip(pressure, *self.config['pressure_range'])

            # VOC levels
            voc = random_change(self.last_reading['voc'])
            voc = np.clip(voc, *self.config['voc_range'])

            # CO2 levels
            co2 = random_change(self.last_reading['co2'])
            co2 = np.clip(co2, *self.config['co2_range'])

            # Gas pollutants with random changes #

            # PM2.5 and PM10 with correlation maintained
            pm25 = random_change(self.last_reading['pm25'])
            pm25 = np.clip(pm25, *self.config['pm25_range'])

            pm10 = max(pm25 + random_change(self.last_reading['pm10'] - self.last_reading['pm25']), pm25)
            pm10 = np.clip(pm10, pm25, self.config['pm10_range'][1])


            # Nitrogen dioxide levels
            no2 = random_change(self.last_reading['no2'])
            no2 = np.clip(no2, *self.config['no2_range'])

            # Ozone levels
            o3 = random_change(self.last_reading['o3'])
            o3 = np.clip(o3, *self.config['o3_range'])

            # Sulfur dioxide levels
            so2 = random_change(self.last_reading['so2'])
            so2 = np.clip(so2, *self.config['so2_range'])

        # Create the new reading
        new_reading = {
            'sensor_id': self.sensor['sensor_id'],
            'timestamp': datetime.now().isoformat(),
            'temperature': round(temp, 2),
            'humidity': round(humidity, 2),
            'pressure': round(pressure, 2),
            'voc': round(voc, 3),
            'co2': round(co2, 1),
            'pm25': round(pm25, 2),
            'pm10': round(pm10, 2),
            'no2': round(no2, 2),
            'o3': round(o3, 2),
            'so2': round(so2, 2)
        }

        # Store this as the last reading for next time
        self.last_reading = new_reading

        return new_reading