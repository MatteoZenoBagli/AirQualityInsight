<template>
    <div class="p-6 max-w-7xl mx-auto">
        <div class="mb-6">
            <h1 class="text-3xl font-bold mb-4">Sensor Dashboard</h1>

            <div class="flex gap-4 mb-6">
                <select class="p-2 border rounded" v-model="selectedSensor">
                    <option
                        v-for="sensor in sensors"
                        :key="sensor"
                        :value="sensor"
                    >
                        Sensor {{ sensor }}
                    </option>
                </select>

                <input
                    type="date"
                    v-model="dateRange.start"
                    class="p-2 border rounded"
                />
                <input
                    type="date"
                    v-model="dateRange.end"
                    class="p-2 border rounded"
                />
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Temperature Chart -->
            <div class="bg-white p-4 rounded-lg shadow">
                <h2 class="text-xl font-semibold mb-4">Temperature (°C)</h2>
                <div class="h-64">
                    <VueApexCharts
                        type="line"
                        :options="chartOptions('Temperature')"
                        :series="[
                            {
                                name: 'Temperature',
                                data: data.map((d) => ({
                                    x: new Date(d.timestamp).getTime(),
                                    y: d.temperature,
                                })),
                            },
                        ]"
                    />
                </div>
            </div>

            <!-- Humidity Chart -->
            <div class="bg-white p-4 rounded-lg shadow">
                <h2 class="text-xl font-semibold mb-4">Humidity (%)</h2>
                <div class="h-64">
                    <VueApexCharts
                        type="line"
                        :options="chartOptions('Humidity')"
                        :series="[
                            {
                                name: 'Humidity',
                                data: data.map((d) => ({
                                    x: new Date(d.timestamp).getTime(),
                                    y: d.humidity,
                                })),
                            },
                        ]"
                    />
                </div>
            </div>

            <!-- Air Quality Chart -->
            <div class="bg-white p-4 rounded-lg shadow">
                <h2 class="text-xl font-semibold mb-4">
                    Air Quality (PM2.5 & PM10)
                </h2>
                <div class="h-64">
                    <VueApexCharts
                        type="line"
                        :options="chartOptions('Air Quality')"
                        :series="[
                            {
                                name: 'PM2.5',
                                data: data.map((d) => ({
                                    x: new Date(d.timestamp).getTime(),
                                    y: d.pm25,
                                })),
                            },
                            {
                                name: 'PM10',
                                data: data.map((d) => ({
                                    x: new Date(d.timestamp).getTime(),
                                    y: d.pm10,
                                })),
                            },
                        ]"
                    />
                </div>
            </div>

            <!-- CO2 & VOC Chart -->
            <div class="bg-white p-4 rounded-lg shadow">
                <h2 class="text-xl font-semibold mb-4">
                    CO2 (ppm) & VOC (ppb)
                </h2>
                <div class="h-64">
                    <VueApexCharts
                        type="line"
                        :options="chartOptions('CO2 & VOC')"
                        :series="[
                            {
                                name: 'CO2',
                                data: data.map((d) => ({
                                    x: new Date(d.timestamp).getTime(),
                                    y: d.co2,
                                })),
                            },
                            {
                                name: 'VOC',
                                data: data.map((d) => ({
                                    x: new Date(d.timestamp).getTime(),
                                    y: d.voc,
                                })),
                            },
                        ]"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, onMounted, watch } from "vue";
import VueApexCharts from "vue3-apexcharts";

export default {
    components: {
        VueApexCharts,
    },
    setup() {
        const data = ref([]);
        const sensors = ref([]);
        const selectedSensor = ref("");
        const dateRange = ref({
            start: new Date(Date.now() - 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
            end: new Date().toISOString().split("T")[0],
        });

        const fetchSensors = async () => {
            try {
                const response = await fetch("/api/sensors");
                sensors.value = await response.json();
                if (sensors.value.length > 0 && !selectedSensor.value) {
                    selectedSensor.value = sensors.value[0];
                }
            } catch (error) {
                console.error("Error fetching sensors:", error);
            }
        };

        const fetchData = async () => {
            if (!selectedSensor.value) return;

            try {
                const response = await fetch(
                    `http://localhost:3001/api/measurements?sensor_id=${selectedSensor.value}&startDate=${dateRange.value.start}&endDate=${dateRange.value.end}`
                );
                data.value = await response.json();
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        const chartOptions = (title) => ({
            chart: {
                type: "line",
                height: 350,
                toolbar: {
                    show: false,
                },
            },
            title: {
                text: title,
            },
            xaxis: {
                type: "datetime",
            },
            tooltip: {
                x: {
                    format: "dd MMM yyyy HH:mm",
                },
            },
            stroke: {
                curve: "smooth",
                width: 2,
            },
        });

        onMounted(() => {
            fetchSensors();
            fetchData();
        });

        watch([selectedSensor, dateRange], () => {
            fetchData();
        });

        return {
            data,
            sensors,
            selectedSensor,
            dateRange,
            chartOptions,
        };
    },
};
</script>