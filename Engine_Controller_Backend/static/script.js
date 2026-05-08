// Arrays storing historical chart data
let tempValues = [];
let o2Values = [];

// Stores chart metadata for tooltips
let chartCache = {};

// -------------------------------------------------
// SEND COMMAND TO FLASK BACKEND
// -------------------------------------------------
async function sendCommand(endpoint) {
    try {

        // Send POST request to Flask API
        const response = await fetch(endpoint, { method: "POST" });
        
        // Parse returned JSON
        const data = await response.json();

        // Display returned JSON in debug log area
        document.getElementById("log").textContent = JSON.stringify(data, null, 2);

        // Refresh status after command
        updateStatus();

    } catch (err) {
        document.getElementById("log").textContent = "Command error: " + err;
    }
}

// -------------------------------------------------
// UPDATE STATUS FROM FLASK
// -------------------------------------------------
async function updateStatus() {
    try {
        
        // Request latest status JSON
        const response = await fetch("/api/status");

        // Convert response into JS object
        const data = await response.json();

        // Display raw JSON
        document.getElementById("log").textContent = JSON.stringify(data, null, 2);

        // Stop if invalid data
        if (!data || data.error) {
            return;
        }

        // Update HTML text elements
        document.getElementById("engineOn").textContent = data.engineOn;
        document.getElementById("autoMode").textContent = data.autoMode;
        document.getElementById("gasOpen").textContent = data.gasOpen;
        document.getElementById("oilPumpOn").textContent = data.oilPumpOn;
        document.getElementById("magnetoKillOn").textContent = data.magnetoKillOn;
        document.getElementById("starterOn").textContent = data.starterOn;
        document.getElementById("chokeAngle").textContent = data.chokeAngle;

        // Format sensor values nicely
        document.getElementById("temperatureF").textContent = Number(data.temperatureF).toFixed(2);
        document.getElementById("o2Voltage").textContent = Number(data.o2Voltage).toFixed(3);

        // Convert to numbers
        let temp = Number(data.temperatureF);
        let o2 = Number(data.o2Voltage);

        // Add new temperature point
        if (!isNaN(temp)) {
            tempValues.push(temp);
        }

        // Add new O2 point
        if (!isNaN(o2)) {
            o2Values.push(o2);
        }

        // Redraw charts
        drawBarChart("tempChart", tempValues, "Temperature °F");
        drawBarChart("o2Chart", o2Values, "O2 Voltage");

    } catch (err) {
        document.getElementById("log").textContent = "Status error: " + err;
    }
}

// -------------------------------------------------
// DRAW HISTOGRAM/BAR CHART
// -------------------------------------------------
function drawBarChart(canvasId, values, label) {
    
    // Get canvas element
    const canvas = document.getElementById(canvasId);
    
    // Get drawing context
    const ctx = canvas.getContext("2d");

    const width = canvas.width;
    const height = canvas.height;

    // Clear old chart
    ctx.clearRect(0, 0, width, height);

    // Padding around chart
    const padding = 50;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Draw chart title
    ctx.font = "16px Arial";
    ctx.fillText(label, 20, 25);

    if (values.length === 0) return;

    // Find chart scaling limits
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    // Avoid divide-by-zero
    const range = maxVal - minVal || 1;

    // Calculate bar width
    const barWidth = Math.max(1, chartWidth / values.length);
    
    // Tooltip hitboxes
    const bars = [];

    // Draw chart axes
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw axis labels
    ctx.font = "12px Arial";
    ctx.fillText(maxVal.toFixed(2), 5, padding + 5);
    ctx.fillText(minVal.toFixed(2), 5, height - padding);
    ctx.fillText("Time →", width / 2 - 20, height - 10);

    // Rotated y-axis label
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Value", 0, 0);
    ctx.restore();

    // Draw each bar
    for (let i = 0; i < values.length; i++) {
        const normalized = (values[i] - minVal) / range;
        const barHeight = normalized * chartHeight;

        const x = padding + i * barWidth;
        const y = height - padding - barHeight;
        const w = Math.max(1, barWidth - 1);
        const h = barHeight;

        // Draw rectangle
        ctx.fillRect(x, y, w, h);

        // Store bar metadata for tooltip detection
        bars.push({
            x: x,
            y: y,
            w: w,
            h: h,
            value: values[i],
            index: i
        });
    }

    // Show number of data points
    ctx.fillText("Points: " + values.length, width - 120, 20);

    // Store chart metadata for tooltips
    chartCache[canvasId] = {
        values: values,
        bars: bars,
        label: label,
        minVal: minVal,
        maxVal: maxVal
    };
}

// -------------------------------------------------
// TOOLTIP SUPPORT
// -------------------------------------------------
function setupTooltip(canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");

    canvas.addEventListener("mousemove", function(event) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const cache = chartCache[canvasId];
        if (!cache) return;

        // Find hovered bar
        const bar = cache.bars.find(b =>
            mouseX >= b.x &&
            mouseX <= b.x + b.w &&
            mouseY >= b.y &&
            mouseY <= b.y + b.h
        );

        // Redraw clean chart
        drawBarChart(canvasId, cache.values, cache.label);

        // Draw tooltip
        if (bar) {
            const tooltipText = `${cache.label}: ${bar.value.toFixed(3)} | Point ${bar.index + 1}`;

            ctx.font = "13px Arial";
            const textWidth = ctx.measureText(tooltipText).width;

            let tooltipX = mouseX + 10;
            let tooltipY = mouseY - 10;

            // Prevent tooltip from overflowing edge
            if (tooltipX + textWidth + 12 > canvas.width) {
                tooltipX = mouseX - textWidth - 20;
            }

            // Draw tooltip box
            ctx.fillRect(tooltipX, tooltipY - 20, textWidth + 12, 24);

            // Clear inside for readability
            ctx.clearRect(tooltipX + 1, tooltipY - 19, textWidth + 10, 22);

            // Draw tooltip text
            ctx.fillText(tooltipText, tooltipX + 6, tooltipY - 4);
        }
    });

    // Redraw chart cleanly when mouse leaves
    canvas.addEventListener("mouseleave", function() {
        const cache = chartCache[canvasId];
        if (!cache) return;

        drawBarChart(canvasId, cache.values, cache.label);
    });
}


// Enable tooltip support for both charts
setupTooltip("tempChart");
setupTooltip("o2Chart");

// Refresh status every second
setInterval(updateStatus, 1000);

// Run immediately at startup
updateStatus();