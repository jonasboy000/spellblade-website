const HEX_COLS = 94;
const HEX_ROWS = 81;
let HEX_DATA = {};

const map = L.map("map", {
  crs: L.CRS.Simple,
  zoomSnap: 0.1,
  zoomDelta: 0.5,
  wheelPxPerZoomLevel: 160,
  maxBoundsViscosity: 1.0,
  maxBounds: [
    [0, 0],
    [6196, 8192],
  ],
  minZoom: -10,
});

const img = new Image();
img.src = "The-Western-Provinces.jpg";
img.onload = function () {
  const IMG_W = img.naturalWidth;
  const IMG_H = img.naturalHeight;
  const IMG_BOUNDS = [
    [0, 0],
    [IMG_H, IMG_W],
  ];

  L.imageOverlay(img.src, IMG_BOUNDS).addTo(map);
  setTimeout(() => {
    map.invalidateSize();
    map.fitBounds(IMG_BOUNDS);
    const minZ = map.getBoundsZoom(IMG_BOUNDS, true);
    map.setMinZoom(minZ);
    map.setMaxZoom(minZ + 6);
    map.setZoom(minZ);
  }, 100);

  const HEX_R = 51.1;
  const COL_STEP = Math.sqrt(3) * HEX_R * 1.002;
  const ROW_STEP = 1.5 * HEX_R * 1.002;
  const ORIGIN_X = -COL_STEP + 0.15;
  const ORIGIN_Y = IMG_H - HEX_R + 51;

  function hexToPixel(col, row) {
    const x = ORIGIN_X + col * COL_STEP + (row & 1 ? COL_STEP / 2 : 0);
    const y = ORIGIN_Y - row * ROW_STEP;
    return [y, x];
  }

  function hexCorners(cx, cy) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (90 - 60 * i);
      pts.push([cy + HEX_R * Math.sin(a), cx + HEX_R * Math.cos(a)]);
    }
    return pts;
  }

  const hexLayer = L.layerGroup().addTo(map);
  const hexPolygons = [];
  let currentOpacity = 0.0;

  function buildHexGrid() {
    hexLayer.clearLayers();
    hexPolygons.length = 0;
    for (let row = 0; row < HEX_ROWS; row++) {
      for (let col = 0; col < HEX_COLS; col++) {
        const key = `${col},${row}`;
        const data = HEX_DATA[key] || null;
        const [latC, lngC] = hexToPixel(col, row);
        const corners = hexCorners(lngC, latC);
        const poly = L.polygon(corners, {
          color: "#1a1a1a",
          fillColor: "#000000",
          fillOpacity: currentOpacity,
          weight: 0.4,
          opacity: 0.55,
          className: "hex-cell",
        });
        poly._hexKey = key;
        poly._hexData = data;
        poly._col = col;
        poly._row = row;
        poly.on("click", onHexClick);
        poly.on("mouseover", onHexHover);
        poly.on("mouseout", onHexOut);
        poly.addTo(hexLayer);
        hexPolygons.push(poly);
      }
    }
  }

  // ── panel elements ──
  const overlay = document.getElementById("info-overlay");
  const panelName = document.getElementById("info-name");
  const panelDesc = document.getElementById("info-desc");
  const panelBody = document.getElementById("info-body");
  const panelCoords = document.getElementById("info-coords");

  function row(label, value, full = false) {
    if (!value && value !== 0) return "";
    return `<div class="row${full ? " full" : ""}"><span class="label">${label}</span><span class="value">${value}</span></div>`;
  }

  function dangerBar(level) {
    return `<div class="row"><span class="label">Danger</span><div class="danger-bar">
    ${[1, 2, 3, 4, 5].map((i) => `<span ${i <= level ? `class="filled" data-level="${i}"` : ""}></span>`).join("")}
  </div></div>`;
  }

  function renderPanel(data, col, r) {
    panelName.textContent = data.name;
    panelDesc.textContent = data.description;
    panelCoords.textContent = `${col},${r}`;
    const s = data.settlement;
    const ru = data.ruler;
    let html = "";

    // column 1 — general
    html += row("Type", data.type);
    html += row("Geography", data.geography);
    html += row("Climate", data.climate);
    html += dangerBar(data.danger);
    html += row("Allegiance", data.allegiance);
    html += row("Religion", data.religion);

    // column 2 — settlement
    if (ru) html += row("Ruler", `${ru.title} ${ru.name}`);
    if (ru?.house) html += row("House", ru.house);
    if (s) {
      html += row("Government", s.government);
      html += row("Population", s.population?.toLocaleString());
      html += row("Size", s.size);
      html += row("Economy", s.economy);
      html += row("Military", s.military);
    }

    // full-width sections
    if (data.landmarks?.length) {
      html += `<hr class="divider">`;
      html += row("Landmarks", data.landmarks.join(", "), true);
    }
    if (data.natural_landmarks?.length) {
      html += row("Nature", data.natural_landmarks.join(", "), true);
    }

    if (data.roads?.length) {
      html += `<hr class="divider">`;
      html += `<div class="row full"><span class="label">Roads</span></div>`;
      data.roads.forEach((road) => {
        html += `<div class="road-entry full">
          <span class="road-to">${road.to}</span>
          <span class="road-meta">${road.km}km · ${road.travel_days} days · ${road.type} · ${road.state}</span>
        </div>`;
      });
    }

    if (data.notes) {
      html += `<hr class="divider">`;
      html += row("Notes", data.notes, true);
    }

    panelBody.innerHTML = html;
    overlay.classList.add("open");
  }

  function onHexClick(e) {
    const data = e.target._hexData;
    const col = e.target._col;
    const r = e.target._row;
    if (data) {
      renderPanel(data, col, r);
    } else {
      panelName.textContent = "Uncharted Territory";
      panelDesc.textContent =
        "No information has been recorded for this region.";
      panelBody.innerHTML = "";
      panelCoords.textContent = `${col},${r}`;
      overlay.classList.add("open");
    }
    L.DomEvent.stopPropagation(e);
  }

  function onHexHover(e) {
    e.target.setStyle({
      fillColor: "#ffffff",
      fillOpacity: 0.25,
      weight: 0.8,
      color: "#ffffff",
    });
  }

  function onHexOut(e) {
    e.target.setStyle({
      fillColor: "#000000",
      color: "#1a1a1a",
      weight: 0.4,
      fillOpacity: currentOpacity,
    });
  }

  document.getElementById("info-close").addEventListener("click", () => {
    overlay.classList.remove("open");
  });
  map.on("click", () => {
    overlay.classList.remove("open");
  });

  document.getElementById("hex-opacity").addEventListener("input", function () {
    currentOpacity = this.value / 100;
    hexPolygons.forEach((p) => p.setStyle({ fillOpacity: currentOpacity }));
  });

  document.getElementById("hex-toggle").addEventListener("change", function () {
    this.checked ? hexLayer.addTo(map) : map.removeLayer(hexLayer);
  });

  const coordDisplay = document.getElementById("coords");
  map.on("mousemove", function (e) {
    coordDisplay.textContent = `lat: ${e.latlng.lat.toFixed(1)}  lng: ${e.latlng.lng.toFixed(1)}`;
  });

  document.getElementById("fs-btn").addEventListener("click", () => {
    const box = document.getElementById("map-box");
    box.classList.toggle("fullscreen");
    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(IMG_BOUNDS);
    }, 50);
  });

  fetch("hexdata.json")
    .then((r) => r.json())
    .then((data) => {
      HEX_DATA = data;
      buildHexGrid();
    });
  // ── mobile ──
  const mobileBtn = document.getElementById("mobile-map-btn");
  const mobileCloseBtn = document.getElementById("mobile-close-map");

  mobileBtn.addEventListener("click", () => {
    const box = document.getElementById("map-box");
    box.classList.add("mobile-open");
    mobileCloseBtn.style.display = "flex";
    mobileBtn.style.display = "none";
    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(IMG_BOUNDS);
    }, 50);
  });

  mobileCloseBtn.addEventListener("click", () => {
    const box = document.getElementById("map-box");
    box.classList.remove("mobile-open");
    mobileCloseBtn.style.display = "none";
    mobileBtn.style.display = "block";
    overlay.classList.remove("open");
  });
};
