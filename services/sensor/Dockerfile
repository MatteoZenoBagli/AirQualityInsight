FROM python:3.9-slim

WORKDIR /app

COPY ./app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app/sensor_simulation.py .
COPY ./app/config.py .

CMD ["python", "sensor_simulation.py"]