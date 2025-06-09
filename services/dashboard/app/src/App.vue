<template>
    <div class="app">
        <h1>Dashboard</h1>

        <div class="dashboard">
            <div class="dashboard-component map-component-container">
                <div class="component-header">
                    <h2>Map</h2>
                    <div>
                        <button @click="refreshMap" class="btn">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                </div>
                <MapComponent
                    @marker-click="handleMarkerClick"
                />
            </div>

            <div class="dashboard-component table-component-container">
                <div class="component-header">
                    <h2>Last {{ this.maxMessages }} measurements received</h2>
                    <div>
                        <button @click="refreshTable" class="btn">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                </div>
                <TableComponent
                    :data="tableData"
                    :columns="tableColumns"
                    @row-click="handleRowClick"
                />
            </div>

            <div class="dashboard-component log-component-container">
                <div class="component-header">
                    <h2>System Log</h2>
                    <div>
                        <button @click="clearLog" class="btn btn-danger">
                            <i class="fas fa-trash"></i> Clear
                        </button>
                    </div>
                </div>
                <LogComponent :entries="logEntries" />
            </div>
        </div>
    </div>
</template>

<script>
import io from "socket.io-client";

import MapComponent from "./assets/components/MapComponent.vue";
import TableComponent from "./assets/components/TableComponent.vue";
import LogComponent from "./assets/components/LogComponent.vue";

export default {
    name: "App",
    components: {
        MapComponent,
        TableComponent,
        LogComponent,
    },
    data() {
        return {
            socket: null,
            maxMessages: 50,
            tableColumns: [
                { key: "sensor_id", label: "Sensor ID" },
                { key: "timestamp", label: "Timestamp" },
                { key: "temperature", label: "Temperature (°C)" },
                { key: "humidity", label: "Humidity (%)" },
                { key: "pressure", label: "Pressure (hPa)" },
                { key: "pm25", label: "PM25 (µg/m³)" },
                { key: "pm10", label: "PM10 (µg/m³)" },
                { key: "voc", label: "VOC (ppm)" },
                { key: "co2", label: "CO2 (ppm)" },
            ],
            tableData: [],
            logEntries: []
        };
    },
    created() {
        this.connectSocket();
    },
    beforeDestroy() {
        this.disconnectSocket();
    },
    methods: {
        connectSocket() {
            const serverUrl = import.meta.env.VITE_SOCKET_SERVER_URL;
            this.socket = io(serverUrl);

            this.socket.on("kafka-message", (message) => {
                this.addInfo("Received new measurement");

                message.timestamp = this.formatTimestamp(
                    message.timestamp || new Date()
                );
                this.tableData.unshift(message);

                if (this.tableData.length > this.maxMessages)
                    this.tableData = this.tableData.slice(0, this.maxMessages);
            });

            this.socket.on("connect", () => {
                this.addInfo("Connected to server");
            });

            this.socket.on("disconnect", () => {
                this.addInfo("Disconnected from server");
            });
        },
        disconnectSocket() {
            if (!this.socket) return;

            this.socket.disconnect();
            this.socket = null;
        },
        formatTimestamp(timestamp) {
            const date = new Date(timestamp);
            return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        },
        handleMarkerClick(marker) {
            // TODO Highlight cursor on table and center on it
        },
        handleRowClick(row) {
            // TODO Highlight cursor on map and center on it
        },
        addInfo(msg) {
            this.addLogEntry("info", msg);
        },
        addWarning(msg) {
            this.addLogEntry("warning", msg);
        },
        addError(msg) {
            this.addLogEntry("error", msg);
        },
        clearLog() {
            this.logEntries = [];
        },
        addLogEntry(type, message) {
            const now = new Date();
            const timestamp = `${now.getHours()}:${String(
                now.getMinutes()
            ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
            this.logEntries.unshift({
                type,
                timestamp,
                message,
            });
        },
    },
};
</script>

<style lang="scss">
body {
    font-family: "Arial", sans-serif;
    margin: 0;
    padding: 0;
    background-color: #f5f5f5;
}

.app {
    max-width: 1280px;
    margin: 0 auto;
    padding: 20px;
}

.dashboard {
    display: grid;
    grid-template-areas:
        "map map map"
        "map map map"
        "measurements measurements log"
        "measurements measurements log";
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;

    &-component {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        padding: 15px;
    }
}

.map-component-container {
    grid-area: map;
    min-height: 80vh;
    display: flex;
    flex-direction: column;
}

.table-component-container {
    grid-area: measurements;
    min-width: 0;
}

.log-component-container {
    grid-area: log;
    overflow-y: hidden;
}

.component-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #eee;
}

.btn {
    background-color: #4caf50;
    color: white;
    border: none;
    padding: 0.5rem 0.75rem;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background-color 0.3s;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &:hover {
        background-color: #45a049;
    }

    &-danger {
        background-color: #f44336;

        &:hover {
            background-color: #d32f2f;
        }
    }
}

@media (max-width: 768px) {
    .dashboard {
        grid-template-columns: 1fr;
    }

    .map-component-container,
    .table-component-container,
    .log-component-container {
        grid-column: 1;
    }

    .map-component-container {
        grid-row: 1;
    }

    .table-component-container {
        grid-row: 2;
    }

    .log-component-container {
        grid-row: 3;
    }
}
</style>