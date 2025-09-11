import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const fxNetworkDiagram = () => {
  const chartRef = useRef(null);

  useEffect(() => {
    // Set up the test data
    const data = {
      "name": "Main_Title",
      "children": [
        { "name": "Title", "size": 1000 },
        { "name": "Title", "size": 1000 },
        { "name": "Title", "size": 1000 },
        { "name": "Title", "size": 1000 },
        { "name": "Title", "size": 1000 },
        { "name": "Title", "size": 1000 },
        { "name": "Title", "size": 1000 },
        { "name": "Title", "size": 1000 }
      ]
    };

    // Define dimensions for the SVG container
    const width = 600;
    const height = 400;

    // Create the SVG element
    const svg = d3.select(chartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    // For demonstration, create one circle per child with random positioning.
    const nodes = data.children.map(d => ({
      ...d,
      x: Math.random() * width,
      y: Math.random() * height
    }));

    // Append circles for each node
    svg.selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => Math.sqrt(d.size) / 10)
      .attr("class", "node")
      .style("fill", "#000");

    // Append CSS styles via a appended style element
    d3.select(chartRef.current).append("style").text(`
      .link {
        stroke: #bbb;
        stroke-width: 1px;
      }
      .node {
        cursor: move;
        fill: #000;
      }
      .node.fixed {
        fill: #f00;
      }
    `);

  }, []);

  return <div id="chart" ref={chartRef}></div>;
};

export default fxNetworkDiagram;
