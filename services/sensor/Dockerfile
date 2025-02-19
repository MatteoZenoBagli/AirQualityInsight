FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY sensor_simulation.py .
COPY config.py .

CMD ["python", "sensor_simulation.py"]