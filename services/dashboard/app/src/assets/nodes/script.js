class OverpassNodeFilter extends HTMLElement {
  constructor() {
    super();
    this.colors = {
      red: "#e74c3c",
      blue: "#3498db",
      green: "#27ae60",
    };

    this.layerConfig = {
      original: {
        name: "Original",
        color: this.colors.red,
        layer: null,
        icon: null,
      },
      filtered: {
        name: "Filtered",
        color: this.colors.blue,
        layer: null,
        icon: null,
      },
      difference: {
        name: "Difference",
        color: this.colors.green,
        layer: null,
        icon: null,
      },
    };

    this.layers = Object.values(this.layerConfig);
    this.nodes = {
      original: [],
      filtered: [],
      difference: [],
    };
    this.currentLayerIndex = 0;
    this.toggleControl = null;
    this.map = null;
  }

  connectedCallback() {
    this.bindEvents();
    this.waitForLeaflet();
  }

  async waitForLeaflet() {
    // Wait for Leaflet to be loaded
    while (typeof L === "undefined") {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    this.initializeMap();
  }

  bindEvents() {
    const cityName = this.querySelector("#cityName");
    const fetchBtn = this.querySelector("#fetchBtn");
    const copyBtn = this.querySelector(".copy-btn");

    cityName.addEventListener("input", () => {
      this.updateQueryPreview();
    });

    fetchBtn.addEventListener("click", () => {
      this.fetchAndFilterNodes();
    });

    copyBtn.addEventListener("click", () => {
      this.copyCode();
    });

    this.updateQueryPreview();
  }

  initializeMap() {
    const mapElement = this.querySelector("#map");
    this.map = L.map(mapElement);

    this.setViewByCity(this.querySelector("#cityName").value);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    for (const layer of this.layers) {
      layer.icon = this.createPushpinIcon(layer.color);
      layer.layer = L.layerGroup().addTo(this.map);
    }
  }

  createPushpinIcon(color = this.colors.red) {
    const darkerColor = this.darkenColor(color, 20);

    return L.divIcon({
      html: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="6" r="4" fill="${color}" stroke="${darkerColor}" stroke-width="1"/>
          <line x1="12" y1="10" x2="12" y2="20" stroke="#34495e" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="20" r="1" fill="#2c3e50"/>
          <ellipse cx="11" cy="5" rx="1.5" ry="1" fill="#ffffff" opacity="0.6"/>
        </svg>
      `,
      className: "pushpin-icon",
      iconSize: [24, 24],
      iconAnchor: [12, 20],
      popupAnchor: [0, -20],
    });
  }

  darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = ((num >> 8) & 0x00ff) - amt;
    const B = (num & 0x0000ff) - amt;
    return (
      "#" +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  }

  async cityHandler(cityName, callback, zoom = 13) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          cityName
        )}&limit=1`
      );
      const data = await response.json();

      if (0 >= data.length) console.log("City not found");

      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      callback([lat, lon], zoom);
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  }

  async setViewByCity(cityName) {
    this.cityHandler(cityName, this.map.setView.bind(this.map));
  }

  async flyToCity(cityName) {
    this.cityHandler(cityName, this.map.flyTo.bind(this.map));
  }

  setPreContent(preElement, content) {
    const escapeHtml = (text) => {
      const div = document.createElement("div");
      div.textContent = text.trim();
      return div.innerHTML;
    };

    const lines = content.split("\n");
    preElement.style.counterReset = "line-number";
    preElement.innerHTML = lines
      .map((line) => {
        const escapedLine = escapeHtml(line);
        return `<div class="line">${escapedLine || "&nbsp;"}</div>`;
      })
      .join("");
  }

  getQuery(cityName) {
    return `[out:json][timeout:90];
      area["admin_level"=8]["name"="${cityName.trim()}"]["boundary"="administrative"]->.bologna;
      way(area.bologna)[highway~"^(motorway|trunk|primary|secondary|tertiary|(motorway|trunk|primary|secondary)_link)$"]->.major;
      way(area.bologna)[highway~"^(unclassified|residential|living_street|service|pedestrian|track)$"]->.minor;
      node(w.major)(w.minor);
      out;`;
  }

  updateQueryPreview() {
    const cityName = this.querySelector("#cityName").value;
    const queryPreview = this.querySelector("#queryPreview");
    this.setPreContent(queryPreview, this.getQuery(cityName));
  }

  copyCode() {
    const button = this.querySelector(".copy-btn");
    const preElement = this.querySelector("#queryPreview");

    const lines = preElement.querySelectorAll(".line");
    const textToCopy = Array.from(lines)
      .map((line) => line.textContent)
      .join("\n");

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        const originalText = button.textContent;
        button.textContent = "Copied!";
        button.style.backgroundColor = "#48bb78";
        setTimeout(() => {
          button.textContent = originalText;
          button.style.backgroundColor = "#4a5568";
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
        button.textContent = "Copy failed";
        setTimeout(() => {
          button.textContent = "Copy";
        }, 2000);
      });
  }

  /**
   * Function to calculate the distance between two geographic points (Haversine formula)
   * @see https://en.wikipedia.org/wiki/Haversine_formula
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  filterNodesByDistance(nodes, minDistance) {
    if (nodes.length === 0) return [];

    const filtered = [nodes[0]]; // Always keep the first node

    for (let i = 1; i < nodes.length; i++) {
      const currentNode = nodes[i];
      let tooClose = false;

      // Check if the current node is too close to any already filtered nodes
      for (const filteredNode of filtered) {
        const distance = this.calculateDistance(
          currentNode.lat,
          currentNode.lon,
          filteredNode.lat,
          filteredNode.lon
        );

        if (distance < minDistance) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) filtered.push(currentNode);
    }

    return filtered;
  }

  showLoading(msg) {
    const loadingDiv = this.querySelector("#loading");
    loadingDiv.classList.remove("hidden");
    loadingDiv.querySelector("[data-msg]").textContent = msg;
  }

  hideLoading() {
    const loadingDiv = this.querySelector("#loading");
    loadingDiv.classList.add("hidden");
  }

  toggleLayers() {
    // Trick to show "filtered nodes" first
    this.currentLayerIndex = (this.currentLayerIndex + 1) % this.layers.length;
    const activeLayer = this.layers[this.currentLayerIndex];

    for (const layer of this.layers) {
      if (layer.name !== activeLayer.name) {
        this.map.removeLayer(layer.layer);
      }
    }

    this.map.addLayer(activeLayer.layer);
    this.updateToggleButton();
  }

  updateToggleButton() {
    const button = this.querySelector(".leaflet-current-layer");
    if (!button) return;

    button.textContent = this.layers[this.currentLayerIndex].name;
    button.style.backgroundColor = this.layers[this.currentLayerIndex].color;
    button.style.color = "white";
  }

  downloadJSON(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `filtered_nodes_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async fetchAndFilterNodes() {
    const cityName = this.querySelector("#cityName").value;
    const minDistance = parseInt(this.querySelector("#minDistance").value);
    const resultsDiv = this.querySelector("#results");
    const fetchBtn = this.querySelector("#fetchBtn");

    resultsDiv.innerHTML = "";
    this.currentLayerIndex = 0;

    if (!cityName || cityName.trim() === "") {
      resultsDiv.innerHTML = '<div class="error">Insert valid city name</div>';
      return;
    }

    fetchBtn.disabled = true;
    this.showLoading("Downloading data from Overpass API...");

    try {
      // Overpass query
      const query = this.getQuery(cityName);

      /** @see https://wiki.openstreetmap.org/wiki/Overpass_API */
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "data=" + encodeURIComponent(query),
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();

      this.showLoading("Filtering nodes by distance...");

      this.nodes.original = data.elements.filter((el) => el.type === "node");
      this.nodes.filtered = this.filterNodesByDistance(
        this.nodes.original,
        minDistance
      );
      this.nodes.difference = this.nodes.original.filter(
        (node) => !this.nodes.filtered.includes(node)
      );

      const stats = `
        <div class="stats">
          <div class="stat-item">
            <div class="stat-number">${this.nodes.original.length}</div>
            <div>Original nodes</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${this.nodes.filtered.length}</div>
            <div>Filtered nodes</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${Math.round(
              (1 - this.nodes.filtered.length / this.nodes.original.length) *
                100
            )}%</div>
            <div>Reduction</div>
          </div>
        </div>
      `;

      if (!this.toggleControl) {
        this.toggleControl = L.Control.extend({
          onAdd: (map) => {
            const button = L.DomUtil.create(
              "div",
              "leaflet-bar leaflet-control leaflet-current-layer"
            );

            button.textContent = this.layers[this.currentLayerIndex].name;
            button.style.backgroundColor =
              this.layers[this.currentLayerIndex].color;
            button.style.color = "white";

            L.DomEvent.disableClickPropagation(button);
            L.DomEvent.on(button, "click", () => this.toggleLayers());

            return button;
          },
        });

        new this.toggleControl({ position: "topright" }).addTo(this.map);
      }

      for (const layer of this.layers) {
        layer.layer.clearLayers();
        for (const node of this.nodes[layer.name.toLowerCase()]) {
          L.marker([node.lat, node.lon], {
            icon: layer.icon,
          }).addTo(layer.layer);
        }
      }

      this.toggleLayers();

      const filteredData = {
        version: data.version,
        generator: data.generator,
        elements: this.nodes.filtered,
      };

      const downloadBtn = `
        <button onclick="document.querySelector('overpass-node-filter').downloadJSON(${JSON.stringify(
          filteredData
        ).replace(/"/g, "&quot;")})">
          Download filtered JSON
        </button>
      `;

      this.hideLoading();
      resultsDiv.innerHTML = `
        <div class="success">
          <h3>Filtering completed!</h3>
          ${stats}
          ${downloadBtn}
        </div>
      `;
    } catch (error) {
      this.hideLoading();
      resultsDiv.innerHTML = `
        <div class="error">
          <strong>Error:</strong> ${error.message}
        </div>
      `;
    } finally {
      fetchBtn.disabled = false;
    }
  }
}

// Register the custom element
customElements.define("overpass-node-filter", OverpassNodeFilter);
