import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

const NetworkDiagram = () => {
  const svgRef = useRef(null);
  const [data, setData] = useState({ nodes: [], links: [] });

  // Load all JSON files from the /analysis-dean directory (assumed to be served from public)
  useEffect(() => {
    Promise.all([
      fetch("/analysis-dean/dentist-references.json").then((res) => res.json()).catch(() => []),
      fetch("/analysis-dean/network-references.json").then((res) => res.json()).catch(() => []),
      fetch("/analysis-dean/dso-references.json").then((res) => res.json()).catch(() => []),
    ]).then(([dentistRefs, networkRefs, dsoRefs]) => {
      // Tag nodes according to origin.
      dentistRefs.forEach((node) => (node.type = "dentist"));
      networkRefs.forEach((node) => (node.type = "network"));
      dsoRefs.forEach((node) => (node.type = "dso"));

      // Merge the nodes.
      let allNodes = [...dentistRefs, ...networkRefs, ...dsoRefs];
      // Use a Map to deduplicate nodes based on composite key.
      const nodeMap = new Map();
      allNodes.forEach((n) => {
        const key = `${n.database}-${n.table}-${n.column}`;
        // Only add a node if not already added.
        if (!nodeMap.has(key)) {
          nodeMap.set(key, { ...n, id: key });
        }
      });
      const nodes = Array.from(nodeMap.values());

      // Build links: For each node, for each reference, calculate target key.
      // The target key is built from the same database and the reference's ref_table and ref_column.
      let links = [];
      nodes.forEach((n) => {
        if (n.references && Array.isArray(n.references)) {
          n.references.forEach((ref) => {
            const targetKey = `${n.database}-${ref.ref_table}-${ref.ref_column}`;
            if (nodeMap.has(targetKey)) {
              links.push({
                source: n.id,
                target: targetKey,
                constraint: ref.constraint || "",
              });
            }
          });
        }
      });

      setData({ nodes, links });
    });
  }, []);

  // Draw the network using D3.js upon data change.
  useEffect(() => {
    if (data.nodes.length === 0) return;

    const width = 960;
    const height = 600;

    // Color scale based on node type.
    const colorScale = d3.scaleOrdinal()
      .domain(["dentist", "network", "dso"])
      .range(["steelblue", "green", "tomato"]);

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Clear previous content.
    svg.selectAll("*").remove();

    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id((d) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(data.links)
      .enter().append("line")
      .attr("stroke-width", 1.5);

    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(data.nodes)
      .enter().append("circle")
      .attr("r", 8)
      .attr("fill", (d) => colorScale(d.type))
      .call(drag(simulation));

    node.append("title")
      .text((d) => `${d.database} : ${d.table} : ${d.column}`);

    simulation.on("tick", () => {
      link.attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y);
    });

    function drag(simulation) {
      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      
      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }
      
      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    return () => simulation.stop();
  }, [data]);

  return <svg ref={svgRef}></svg>;
};

export default NetworkDiagram;
