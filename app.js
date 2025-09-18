const file = "ironman.csv";
const athleteName = "Reed, Tim";

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

d3.csv(file).then((data) => {
  // ---------- Chart 1: Athlete splits ----------
  const names = Array.from(new Set(data.map((d) => d.Name))).sort(d3.ascending);

  const select = d3.select("#athleteSelect");
  select
    .selectAll("option")
    .data(names)
    .enter()
    .append("option")
    .attr("value", (d) => d)
    .text((d) => d);

  const defaultName = names.includes(athleteName) ? athleteName : names[0];
  select.property("value", defaultName);

  const svg = d3.select("#chart1");
  const margin = { top: 30, right: 30, bottom: 70, left: 110 };
  const width = 600 - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().range([0, width]).padding(0.35);
  const y = d3.scaleLinear().range([height, 0]);

  const xAxisG = g.append("g").attr("transform", `translate(0,${height})`);
  const yAxisG = g.append("g");

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

  function renderAthlete(name) {
    const row = data.find((d) => d.Name === name);
    if (!row) return;

    const barData = [
      { category: "Swim", value: hmsToSeconds(row.Swim), label: row.Swim },
      { category: "Bike", value: hmsToSeconds(row.Bike), label: row.Bike },
      { category: "Run", value: hmsToSeconds(row.Run), label: row.Run },
      {
        category: "Overall",
        value: hmsToSeconds(row.Overall),
        label: row.Overall,
      },
    ].filter((d) => d.value != null);

    x.domain(barData.map((d) => d.category));
    y.domain([0, d3.max(barData, (d) => d.value)]).nice();

    const bars = g.selectAll("rect.bar").data(barData, (d) => d.category);
    bars
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.category))
      .attr("y", y(0))
      .attr("width", x.bandwidth())
      .attr("height", 0)
      .merge(bars)
      .transition()
      .duration(400)
      .attr("x", (d) => x(d.category))
      .attr("y", (d) => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(d.value));
    bars.exit().remove();

    const labels = g.selectAll("text.label").data(barData, (d) => d.category);
    labels
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("text-anchor", "middle")
      .attr("x", (d) => x(d.category) + x.bandwidth() / 2)
      .attr("y", y(0) - 6)
      .text((d) => d.label)
      .merge(labels)
      .transition()
      .duration(400)
      .attr("x", (d) => x(d.category) + x.bandwidth() / 2)
      .attr("y", (d) => y(d.value) - 6)
      .text((d) => d.label ?? "");
    labels.exit().remove();

    xAxisG.transition().duration(400).call(d3.axisBottom(x));
    yAxisG
      .transition()
      .duration(400)
      .call(d3.axisLeft(y).tickFormat(secondsToHMS));

    title1.text(`${name} — Split vs Overall`);
  }
  renderAthlete(defaultName);
  select.on("change", function () {
    renderAthlete(this.value);
  });

  // ---------- Chart 2: Interactive scatter plot ----------

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

  // ---------- Axis labels that look like dropdown buttons ----------
  const METRICS = ["Swim", "Bike", "Run"];
  let xMetric = "Bike";
  let yMetric = "Run";

  const labelText = (m) => `${m} time (H:MM:SS) ▾`;
  const metricValue = (row, m) => hmsToSeconds(row[m]);

  // X label group (button-like)
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

  // Y label group (button-like)
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

  // Points layer
  const points = g2.append("g").attr("class", "points");

  // Helpers
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
      .map((d) => ({ x: metricValue(d, xMetric), y: metricValue(d, yMetric) }))
      .filter((d) => d.x != null && d.y != null);
  }

  function updateScatter() {
    const pts = buildPoints();

    x2.domain(d3.extent(pts, (d) => d.x)).nice();
    y2.domain(d3.extent(pts, (d) => d.y)).nice();

    xAxisG2
      .transition()
      .duration(400)
      .call(d3.axisBottom(x2).tickFormat(secondsToHMS));
    yAxisG2
      .transition()
      .duration(400)
      .call(d3.axisLeft(y2).tickFormat(secondsToHMS));

    const sel = points.selectAll("circle").data(pts);
    sel
      .enter()
      .append("circle")
      .attr("r", 3)
      .attr("opacity", 0.6)
      .attr("fill", "#1f77b4")
      .attr("cx", (d) => x2(d.x))
      .attr("cy", (d) => y2(d.y))
      .merge(sel)
      .transition()
      .duration(300)
      .attr("cx", (d) => x2(d.x))
      .attr("cy", (d) => y2(d.y));
    sel.exit().remove();

    // Titles / labels
    title2.text(`${xMetric} vs ${yMetric} (All Athletes)`);
    xLabel2.text(labelText(xMetric));
    yLabel2.text(labelText(yMetric));

    // Resize label backgrounds to fit text
    resizeLabelBg(xLabel2, xLabelBg);
    resizeLabelBg(yLabel2, yLabelBg);
  }

  // ---------- Popover menu for choosing metric ----------
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

  ensureDistinct();
  updateScatter();

  // ---------- Chart 3: Avg Overall by Division & Gender ----------
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

  const x0 = d3
    .scaleBand()
    .domain(divisions)
    .range([0, width3])
    .paddingInner(0.2);
  const x1 = d3
    .scaleBand()
    .domain(["Male", "Female"])
    .range([0, x0.bandwidth()])
    .padding(0.05);
  const y3 = d3
    .scaleLinear()
    .domain([0, d3.max(barData3, (d) => d.value)])
    .nice()
    .range([height3, 0]);
  const color = d3
    .scaleOrdinal()
    .domain(["Male", "Female"])
    .range(["#1f77b4", "#e377c2"]);

  g3.selectAll("g.division")
    .data(divisions)
    .enter()
    .append("g")
    .attr("class", "division")
    .attr("transform", (d) => `translate(${x0(d)},0)`)
    .selectAll("rect")
    .data((d) => barData3.filter((b) => b.Division === d))
    .enter()
    .append("rect")
    .attr("x", (d) => x1(d.Gender))
    .attr("y", (d) => y3(d.value))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => height3 - y3(d.value))
    .attr("fill", (d) => color(d.Gender));

  g3.append("g")
    .attr("transform", `translate(0,${height3})`)
    .call(d3.axisBottom(x0))
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

  const legend = svg3
    .append("g")
    .attr(
      "transform",
      `translate(${margin3.left + width3 / 2 - 100}, ${
        margin3.top + height3 + 80
      })`
    );
  ["Male", "Female"].forEach((gender, i) => {
    legend
      .append("rect")
      .attr("x", i * 100)
      .attr("y", -30)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", color(gender));
    legend
      .append("text")
      .attr("x", i * 100 + 20)
      .attr("y", -18)
      .text(gender)
      .style("alignment-baseline", "middle");
  });
});
