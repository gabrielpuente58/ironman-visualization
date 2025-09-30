const file = "ironman.csv";

// starting athlete for Chart 1
const athleteName = "Reed, Tim";

// helper functions
function hmsToSeconds(t) {
  if (!t) return null;
  const [h, m, s] = t.split(":").map(Number);
  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
}
function secondsToHMS(sec) {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function shortHMS(sec) {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    : `${m}:${String(ss).padStart(2, "0")}`;
}

function labelPlacementY(d, y, height) {
  const yTop = y(d.value);
  const barH = height - yTop;
  if (barH >= 18) {
    return { y: yTop + 12, inside: true };
  } else {
    return { y: yTop - 6, inside: false };
  }
}

d3.csv(file).then((data) => {
  const names = Array.from(new Set(data.map((d) => d.Name))).sort(d3.ascending);

  const selectA = d3.select("#athleteSelect");
  selectA
    .selectAll("option")
    .data(names)
    .enter()
    .append("option")
    .attr("value", (d) => d)
    .text((d) => d);

  const defaultName =
    typeof athleteName !== "undefined" && names.includes(athleteName)
      ? athleteName
      : names[0];
  selectA.property("value", defaultName);

  let compareToggleEl = document.getElementById("compareToggle");
  let selectBEl = document.getElementById("athleteSelectB");

  if (!compareToggleEl || !selectBEl) {
    const selAEl = document.getElementById("athleteSelect");

    const wrap = document.createElement("span");
    wrap.className = "controls controls--split";

    const label = document.createElement("label");
    label.className = "toggle";
    label.setAttribute("for", "compareToggle");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = "compareToggle";

    const txt = document.createElement("span");
    txt.textContent = "Compare";

    label.appendChild(cb);
    label.appendChild(txt);

    const selB = document.createElement("select");
    selB.id = "athleteSelectB";
    selB.className = "select select--sm";
    selB.disabled = true;
    selB.setAttribute("aria-label", "Comparison athlete");

    wrap.appendChild(label);
    wrap.appendChild(selB);

    selAEl.insertAdjacentElement("afterend", wrap);

    compareToggleEl = cb;
    selectBEl = selB;
  }

  // Populate Select B
  const selectB = d3.select(selectBEl);
  selectB
    .selectAll("option")
    .data(names)
    .enter()
    .append("option")
    .attr("value", (d) => d)
    .text((d) => d);

  // Default B: first different from A if possible
  const defaultB =
    names.find((n) => n !== selectA.property("value")) || names[0];
  selectB.property("value", defaultB);

  // --- Chart scaffolding ---
  const svg = d3.select("#chart1");
  const margin = { top: 30, right: 30, bottom: 70, left: 110 };
  const width = 600 - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // x0 = categories (Swim/Bike/Run/Overall), x1 = inner band for athlete A/B
  const x0 = d3.scaleBand().range([0, width]).padding(0.35);
  const x1 = d3.scaleBand().padding(0.3);
  const y = d3.scaleLinear().range([height, 0]);

  const xAxisG = g.append("g").attr("transform", `translate(0,${height})`);
  const yAxisG = g.append("g");

  // Title & axes labels
  const title1 = svg
    .append("text")
    .attr("x", margin.left + width / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-weight", 600);

  svg
    .append("text")
    .attr("x", margin.left + width / 2)
    .attr("y", margin.top + height + 50)
    .attr("text-anchor", "middle")
    .text("Split");

  svg
    .append("text")
    .attr(
      "transform",
      `translate(${margin.left - 80}, ${margin.top + height / 2}) rotate(-90)`
    )
    .attr("text-anchor", "middle")
    .text("Time (H:MM:SS)");

  // Colors for athlete comparison
  const COLOR_A = "#1f77b4";
  const COLOR_B = "#e377c2";
  const nameColor = (n, nA, nB) => (n === nA ? COLOR_A : COLOR_B);

  // Convert a data row to an array of {category, value, label}
  function rowToSplits(row) {
    if (!row) return [];
    return [
      { category: "Swim", value: hmsToSeconds(row.Swim), label: row.Swim },
      { category: "Bike", value: hmsToSeconds(row.Bike), label: row.Bike },
      { category: "Run", value: hmsToSeconds(row.Run), label: row.Run },
      {
        category: "Overall",
        value: hmsToSeconds(row.Overall),
        label: row.Overall,
      },
    ].filter((d) => d.value != null);
  }

  // Main render
  function renderAthletes() {
    const nA = selectA.property("value");
    const compare = d3.select(compareToggleEl).property("checked");
    const nB = compare ? selectB.property("value") : null;

    // enable/disable button
    selectB.property("disabled", !compare);

    const rowA = data.find((d) => d.Name === nA);
    const rowB = nB ? data.find((d) => d.Name === nB) : null;

    const A = rowToSplits(rowA).map((d) => ({ ...d, name: nA }));
    const B = rowB ? rowToSplits(rowB).map((d) => ({ ...d, name: nB })) : [];
    const all = [...A, ...B];

    const categories = ["Swim", "Bike", "Run", "Overall"].filter((c) =>
      all.some((d) => d.category === c)
    );
    x0.domain(categories);

    const namesUsed = Array.from(new Set(all.map((d) => d.name)));
    x1.domain(namesUsed).range([0, x0.bandwidth()]);

    y.domain([0, d3.max(all, (d) => d.value) || 0]).nice();

    // Category groups
    const groups = g.selectAll("g.cat").data(categories, (d) => d);

    const groupsEnter = groups
      .enter()
      .append("g")
      .attr("class", "cat")
      .attr("transform", (d) => `translate(${x0(d)},0)`);

    groups
      .merge(groupsEnter)
      .transition()
      .duration(400)
      .attr("transform", (d) => `translate(${x0(d)},0)`);

    groups.exit().remove();

    // Bars (grouped by category, keyed by athlete name)
    const bars = g
      .selectAll("g.cat")
      .selectAll("rect.bar")
      .data(
        (cat) => all.filter((d) => d.category === cat),
        (d) => d.name
      );

    bars
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x1(d.name))
      .attr("y", y(0))
      .attr("width", x1.bandwidth())
      .attr("height", 0)
      .attr("fill", (d) => nameColor(d.name, nA, nB))
      .merge(bars)
      .transition()
      .duration(400)
      .attr("x", (d) => x1(d.name))
      .attr("y", (d) => y(d.value))
      .attr("width", x1.bandwidth())
      .attr("height", (d) => height - y(d.value))
      .attr("fill", (d) => nameColor(d.name, nA, nB));

    bars.exit().remove();

    // Value labels (adaptive: inside if tall, above if short)
    const labels = g
      .selectAll("g.cat")
      .selectAll("text.label")
      .data(
        (cat) => all.filter((d) => d.category === cat),
        (d) => d.name
      );

    labels
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("text-anchor", "middle")
      .attr("x", (d) => x1(d.name) + x1.bandwidth() / 2)
      .attr("y", (d) => labelPlacementY(d, y, height).y)
      .text((d) => shortHMS(d.value))
      .style("pointer-events", "none")
      .merge(labels)
      .transition()
      .duration(400)
      .attr("x", (d) => x1(d.name) + x1.bandwidth() / 2)
      .attr("y", (d) => labelPlacementY(d, y, height).y)
      .tween("fill-based-on-placement", function (d) {
        const text = d3.select(this);
        const p = labelPlacementY(d, y, height);
        text.style(
          "fill",
          p.inside
            ? "#000"
            : getComputedStyle(document.documentElement).getPropertyValue(
                "--text"
              ) || "#0b172a"
        );
        return () => {};
      })
      .text((d) => shortHMS(d.value));

    labels.exit().remove();

    // Axes
    xAxisG.transition().duration(400).call(d3.axisBottom(x0));
    yAxisG
      .transition()
      .duration(400)
      .call(d3.axisLeft(y).tickFormat(secondsToHMS));

    // Title
    title1.text(
      compare && nB
        ? `${nA} vs ${nB} — Split vs Overall`
        : `${nA} — Split vs Overall`
    );
  }

  // Wire up listeners and initial render
  d3.select(compareToggleEl).on("change", renderAthletes);
  selectA.on("change", renderAthletes);
  selectB.on("change", renderAthletes);

  renderAthletes();

  // Chart 2: Scatter plot

  let zoomed = false;

  const svg2 = d3.select("#chart2");
  const margin2 = { top: 30, right: 30, bottom: 70, left: 100 };
  const width2 = 700 - margin2.left - margin2.right;
  const height2 = 460 - margin2.top - margin2.bottom;

  const g2 = svg2
    .append("g")
    .attr("transform", `translate(${margin2.left},${margin2.top})`);

  const x2 = d3.scaleLinear().range([0, width2]);
  const y2 = d3.scaleLinear().range([height2, 0]);

  const xAxisG2 = g2.append("g").attr("transform", `translate(0,${height2})`);
  const yAxisG2 = g2.append("g");

  // Title
  const title2 = svg2
    .append("text")
    .attr("x", margin2.left + width2 / 2)
    .attr("y", 22)
    .attr("text-anchor", "middle")
    .style("font-weight", 600);

  // Metrics
  const METRICS = ["Swim", "Bike", "Run"];
  let xMetric = "Bike";
  let yMetric = "Run";

  const labelText = (m) => `${m} time (H:MM:SS) ▾`;
  const metricValue = (row, m) => hmsToSeconds(row[m]);

  // regression toggle
  let trendToggleEl = document.getElementById("trendToggle");
  if (!trendToggleEl) {
    const wrap = document.createElement("div");
    wrap.className = "controls";
    wrap.style.margin = "6px 0 0";

    const label = document.createElement("label");
    label.className = "toggle";
    label.setAttribute("for", "trendToggle");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = "trendToggle";

    const txt = document.createElement("span");
    txt.textContent = "Trend line";

    label.appendChild(cb);
    label.appendChild(txt);
    wrap.appendChild(label);

    // insert just before the SVG
    const node = svg2.node();
    node.parentNode.insertBefore(wrap, node);

    trendToggleEl = cb;
  }
  const trendToggle = d3.select(trendToggleEl);

  // axis labels
  const xLabelGroup = svg2
    .append("g")
    .attr(
      "transform",
      `translate(${margin2.left + width2 / 2}, ${margin2.top + height2 + 50})`
    )
    .style("cursor", "pointer")
    .attr("data-axis", "x");
  const xLabelBg = xLabelGroup
    .append("rect")
    .attr("class", "axis-label-bg")
    .attr("x", -60)
    .attr("y", -12)
    .attr("width", 120)
    .attr("height", 24)
    .attr("fill", "#ffffff")
    .attr("stroke", "#d9e1ec")
    .attr("rx", 6)
    .attr("ry", 6);
  const xLabel2 = xLabelGroup
    .append("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .style("font-size", "13px")
    .style("font-weight", "500")
    .style(
      "fill",
      getComputedStyle(document.documentElement).getPropertyValue("--text") ||
        "#0b172a"
    )
    .text(labelText(xMetric));

  const yLabelGroup = svg2
    .append("g")
    .attr(
      "transform",
      `translate(${margin2.left - 70}, ${
        margin2.top + height2 / 2
      }) rotate(-90)`
    )
    .style("cursor", "pointer")
    .attr("data-axis", "y");
  const yLabelBg = yLabelGroup
    .append("rect")
    .attr("class", "axis-label-bg")
    .attr("x", -60)
    .attr("y", -12)
    .attr("width", 120)
    .attr("height", 24)
    .attr("fill", "#ffffff")
    .attr("stroke", "#d9e1ec")
    .attr("rx", 6)
    .attr("ry", 6);
  const yLabel2 = yLabelGroup
    .append("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .style("font-size", "13px")
    .style("font-weight", "500")
    .style(
      "fill",
      getComputedStyle(document.documentElement).getPropertyValue("--text") ||
        "#0b172a"
    )
    .text(labelText(yMetric));

  // layers
  const points = g2.append("g").attr("class", "points");
  const trendLayer = g2.append("g").attr("class", "trend");

  g2.append("defs")
    .append("clipPath")
    .attr("id", "plot-clip")
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width2)
    .attr("height", height2);
  points.attr("clip-path", "url(#plot-clip)");
  trendLayer.attr("clip-path", "url(#plot-clip)");

  // helper functios
  function ensureDistinct(changedAxis) {
    if (xMetric === yMetric) {
      const alt =
        METRICS.find((m) => m !== (changedAxis === "x" ? xMetric : yMetric)) ||
        "Swim";
      if (changedAxis === "x") yMetric = alt;
      else xMetric = alt;
    }
  }
  function resizeLabelBg(lbl, bg) {
    const padX = 12,
      padY = 6;
    const bbox = lbl.node().getBBox();
    bg.attr("x", bbox.x - padX / 2)
      .attr("y", bbox.y - padY / 2)
      .attr("width", bbox.width + padX)
      .attr("height", bbox.height + padY);
  }
  function buildPoints() {
    return data
      .map((row) => ({
        x: metricValue(row, xMetric),
        y: metricValue(row, yMetric),
      }))
      .filter((d) => d.x != null && d.y != null);
  }

  function ols(pts) {
    const n = pts.length;
    let sx = 0,
      sy = 0,
      sxx = 0,
      syy = 0,
      sxy = 0;
    for (const { x, y } of pts) {
      sx += x;
      sy += y;
      sxx += x * x;
      syy += y * y;
      sxy += x * y;
    }
    const denom = n * sxx - sx * sx;
    if (denom === 0) return { m: 0, b: d3.mean(pts, (d) => d.y), r: 0 };
    const m = (n * sxy - sx * sy) / denom;
    const b = (sy - m * sx) / n;
    const rDen = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
    const r = rDen === 0 ? 0 : (n * sxy - sx * sy) / rDen;
    return { m, b, r };
  }
  function drawTrend(pts) {
    trendLayer.selectAll("*").remove();
    const on = trendToggle.property("checked");
    if (!on || pts.length < 2) return;
    const { m, b, r } = ols(pts);
    const [xMin, xMax] = x2.domain();
    const yMin = m * xMin + b;
    const yMax = m * xMax + b;
    const accent2 =
      getComputedStyle(document.documentElement).getPropertyValue(
        "--accent-2"
      ) || "#b5179e";

    trendLayer
      .append("line")
      .attr("x1", x2(xMin))
      .attr("y1", y2(yMin))
      .attr("x2", x2(xMax))
      .attr("y2", y2(yMax))
      .attr("stroke", accent2.trim())
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "6,5")
      .attr("opacity", 0)
      .transition()
      .duration(350)
      .attr("opacity", 1);

    trendLayer
      .append("text")
      .attr("x", 6)
      .attr("y", 14)
      .attr("fill", accent2.trim())
      .style("font-size", "12px")
      .style("font-weight", "600")
      .text(`r = ${d3.format(".2f")(r)}`);
  }

  // Brush-zoom
  const PAD_FRAC = 0.2;
  const MIN_FRACTION = 0.25;

  function paddedDomain(selMin, selMax, fullMin, fullMax) {
    const selSpan = Math.max(selMax - selMin, 1e-9);
    const fullSpan = Math.max(fullMax - fullMin, 1e-9);
    const desired = Math.max(
      selSpan * (1 + PAD_FRAC * 2),
      fullSpan * MIN_FRACTION
    );
    const c = (selMin + selMax) / 2;
    let lo = c - desired / 2;
    let hi = c + desired / 2;
    if (lo < fullMin) {
      hi += fullMin - lo;
      lo = fullMin;
    }
    if (hi > fullMax) {
      lo -= hi - fullMax;
      hi = fullMax;
    }
    return [Math.max(fullMin, lo), Math.min(fullMax, hi)];
  }

  // Brush
  const brushG = g2.append("g").attr("class", "brush");
  const brush = d3
    .brush()
    .extent([
      [0, 0],
      [width2, height2],
    ])
    .on("end", brushed);
  brushG.call(brush);

  // Reset button
  let resetBtn = document.getElementById("scatterReset");
  if (!resetBtn) {
    const btn = document.createElement("button");
    btn.id = "scatterReset";
    btn.textContent = "Reset zoom";
    btn.className = "expand-btn";
    btn.style.margin = "6px 0 0 0";
    btn.style.display = "none";
    svg2.node().parentNode.insertBefore(btn, svg2.node());
    resetBtn = btn;
  }
  resetBtn.addEventListener("click", () => {
    zoomed = false;
    const pts = buildPoints();
    x2.domain(d3.extent(pts, (d) => d.x)).nice();
    y2.domain(d3.extent(pts, (d) => d.y)).nice();
    brushG.call(brush.move, null);
    updateScatter();
    resetBtn.style.display = "none";
  });

  function brushed({ selection }) {
    if (!selection) return;
    const [[x0, y0], [x1, y1]] = selection;

    if (Math.abs(x1 - x0) < 4 || Math.abs(y1 - y0) < 4) {
      brushG.call(brush.move, null);
      return;
    }

    const selX = [x2.invert(x0), x2.invert(x1)].sort((a, b) => a - b);
    const selY = [y2.invert(y1), y2.invert(y0)].sort((a, b) => a - b); // y inverted

    const [xFullLo, xFullHi] = x2.domain();
    const [yFullLo, yFullHi] = y2.domain();

    const xNew = paddedDomain(selX[0], selX[1], xFullLo, xFullHi);
    const yNew = paddedDomain(selY[0], selY[1], yFullLo, yFullHi);

    x2.domain(xNew);
    y2.domain(yNew);

    zoomed = true;
    brushG.call(brush.move, null);
    updateScatter();
    resetBtn.style.display = "inline-block";
  }

  function updateScatter() {
    const pts = buildPoints();

    if (!zoomed) {
      x2.domain(d3.extent(pts, (d) => d.x)).nice();
      y2.domain(d3.extent(pts, (d) => d.y)).nice();
    }

    const [xLo, xHi] = x2.domain();
    const [yLo, yHi] = y2.domain();
    const visible = pts.filter(
      (d) => d.x >= xLo && d.x <= xHi && d.y >= yLo && d.y <= yHi
    );

    xAxisG2
      .transition()
      .duration(400)
      .call(d3.axisBottom(x2).tickFormat(secondsToHMS));
    yAxisG2
      .transition()
      .duration(400)
      .call(d3.axisLeft(y2).tickFormat(secondsToHMS));

    const sel = points
      .selectAll("circle")
      .data(visible, (d) => `${d.x},${d.y}`);
    sel
      .enter()
      .append("circle")
      .attr("r", 3)
      .attr("opacity", 0.7)
      .attr("fill", "#1f77b4")
      .attr("cx", (d) => x2(d.x))
      .attr("cy", (d) => y2(d.y))
      .merge(sel)
      .transition()
      .duration(300)
      .attr("cx", (d) => x2(d.x))
      .attr("cy", (d) => y2(d.y));
    sel.exit().remove();

    drawTrend(visible);

    title2.text(`${xMetric} vs ${yMetric} (All Athletes)`);
    xLabel2.text(labelText(xMetric));
    yLabel2.text(labelText(yMetric));
    resizeLabelBg(xLabel2, xLabelBg);
    resizeLabelBg(yLabel2, yLabelBg);
  }

  function showAxisMenu(evt, axis) {
    d3.selectAll(".axis-menu").remove();
    const card = document.getElementById("chart2-card") || document.body;
    const menu = document.createElement("div");
    menu.className = "axis-menu";
    menu.style.position = "absolute";
    menu.style.zIndex = "1000";
    menu.style.background = "#ffffff";
    menu.style.border =
      "1px solid " +
      (getComputedStyle(document.documentElement).getPropertyValue(
        "--border"
      ) || "#d9e1ec");
    menu.style.borderRadius = "8px";
    menu.style.boxShadow =
      getComputedStyle(document.documentElement).getPropertyValue("--shadow") ||
      "0 6px 24px rgba(0,0,0,0.1)";
    menu.style.padding = "4px";
    menu.style.minWidth = "140px";

    METRICS.forEach((opt) => {
      const btn = document.createElement("button");
      btn.textContent =
        opt + ((axis === "x" ? xMetric : yMetric) === opt ? " ✓" : "");
      btn.style.width = "100%";
      btn.style.textAlign = "left";
      btn.style.background = "transparent";
      btn.style.border = "0";
      btn.style.padding = "8px 10px";
      btn.style.fontSize = "14px";
      btn.style.cursor = "pointer";
      btn.style.color =
        getComputedStyle(document.documentElement).getPropertyValue("--text") ||
        "#0b172a";
      btn.onmouseenter = () => (btn.style.background = "#f1f5ff");
      btn.onmouseleave = () => (btn.style.background = "transparent");
      btn.addEventListener("click", () => {
        if (axis === "x") xMetric = opt;
        else yMetric = opt;
        ensureDistinct(axis);
        zoomed = false;
        resetBtn.style.display = "none";
        updateScatter();
        menu.remove();
      });
      menu.appendChild(btn);
    });

    const { clientX, clientY } = evt;
    const rect = card.getBoundingClientRect();
    menu.style.left = clientX - rect.left + 8 + "px";
    menu.style.top = clientY - rect.top + 8 + "px";

    const close = () => {
      menu.remove();
      document.removeEventListener("click", outside, { capture: true });
      document.removeEventListener("keydown", onKey);
    };
    const outside = (e) => {
      if (!menu.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("click", outside, { capture: true });
    document.addEventListener("keydown", onKey);

    card.appendChild(menu);
    evt.stopPropagation();
  }

  xLabelGroup.on("click", (evt) => showAxisMenu(evt, "x"));
  yLabelGroup.on("click", (evt) => showAxisMenu(evt, "y"));
  trendToggle.on("change", updateScatter);

  ensureDistinct();
  updateScatter();

  // Chart 3: Avg Overall by Division & Gender

  const svg3 = d3.select("#chart3");
  const margin3 = { top: 40, right: 30, bottom: 140, left: 120 };
  const width3 = 900 - margin3.left - margin3.right;
  const height3 = 500 - margin3.top - margin3.bottom;

  const g3 = svg3
    .append("g")
    .attr("transform", `translate(${margin3.left},${margin3.top})`);

  function divisionSortKey(div) {
    const d = (div ?? "").toUpperCase().trim();
    if (d === "MPRO") return { pro: 0, gender: "M", age: 0 };
    if (d === "FPRO") return { pro: 0, gender: "F", age: 0 };
    const m = d.match(/^([MF])(\d+)-/);
    if (m) return { pro: 1, gender: m[1], age: +m[2] };
    return { pro: 2, gender: "Z", age: 999 };
  }

  data.forEach((d) => {
    d._overallSec = hmsToSeconds(d.Overall);
    const g = (d.Gender ?? "").toString().trim().toUpperCase();
    d._G = g.startsWith("F") ? "F" : g.startsWith("M") ? "M" : null;
  });

  const grouped = d3.rollups(
    data.filter((d) => d._overallSec != null && d._G),
    (v) => d3.mean(v, (d) => d._overallSec),
    (d) => d.Division,
    (d) => d._G
  );

  let barData3 = [];
  grouped.forEach(([division, genders]) => {
    genders.forEach(([g, avg]) => {
      barData3.push({
        Division: division,
        Gender: g === "M" ? "Male" : "Female",
        value: avg,
      });
    });
  });

  const divisions = Array.from(new Set(barData3.map((d) => d.Division))).sort(
    (a, b) => {
      const ka = divisionSortKey(a);
      const kb = divisionSortKey(b);
      if (ka.pro !== kb.pro) return ka.pro - kb.pro;
      if (ka.age !== kb.age) return ka.age - kb.age;
      if (ka.gender !== kb.gender) return ka.gender.localeCompare(kb.gender);
      return 0;
    }
  );

  const x0_3 = d3
    .scaleBand()
    .domain(divisions)
    .range([0, width3])
    .paddingInner(0.2);
  const x1_3 = d3
    .scaleBand()
    .domain(["Male", "Female"])
    .range([0, x0_3.bandwidth()])
    .padding(0.05);
  const y3 = d3
    .scaleLinear()
    .domain([0, d3.max(barData3, (d) => d.value)])
    .nice()
    .range([height3, 0]);
  const color3 = d3
    .scaleOrdinal()
    .domain(["Male", "Female"])
    .range(["#1f77b4", "#e377c2"]);

  g3.selectAll("g.division")
    .data(divisions)
    .enter()
    .append("g")
    .attr("class", "division")
    .attr("transform", (d) => `translate(${x0_3(d)},0)`)
    .selectAll("rect")
    .data((d) => barData3.filter((b) => b.Division === d))
    .enter()
    .append("rect")
    .attr("x", (d) => x1_3(d.Gender))
    .attr("y", (d) => y3(d.value))
    .attr("width", x1_3.bandwidth())
    .attr("height", (d) => height3 - y3(d.value))
    .attr("fill", (d) => color3(d.Gender));

  g3.append("g")
    .attr("transform", `translate(0,${height3})`)
    .call(d3.axisBottom(x0_3))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");
  g3.append("g").call(d3.axisLeft(y3).tickFormat(secondsToHMS));

  svg3
    .append("text")
    .attr("x", margin3.left + width3 / 2)
    .attr("y", 26)
    .attr("text-anchor", "middle")
    .style("font-weight", 600)
    .text(
      "Average Overall Finish Time by Division & Gender (Pro first, then Age Group)"
    );
  svg3
    .append("text")
    .attr("x", margin3.left + width3 / 2)
    .attr("y", margin3.top + height3 + 90)
    .attr("text-anchor", "middle")
    .text("Division (Age Group)");
  svg3
    .append("text")
    .attr(
      "transform",
      `translate(${margin3.left - 80}, ${
        margin3.top + height3 / 2
      }) rotate(-90)`
    )
    .attr("text-anchor", "middle")
    .text("Average Overall Time (H:MM:SS)");

  const legend3 = svg3
    .append("g")
    .attr(
      "transform",
      `translate(${margin3.left + width3 / 2 - 100}, ${
        margin3.top + height3 + 80
      })`
    );
  ["Male", "Female"].forEach((gender, i) => {
    legend3
      .append("rect")
      .attr("x", i * 100)
      .attr("y", -30)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", color3(gender));
    legend3
      .append("text")
      .attr("x", i * 100 + 20)
      .attr("y", -18)
      .text(gender)
      .style("alignment-baseline", "middle");
  });
});
