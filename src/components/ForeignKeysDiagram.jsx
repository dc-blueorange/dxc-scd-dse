import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

const ForeignKeysDiagram = () => {
  const svgRef = useRef(null);
  const [data, setData] = useState({ nodes: [], links: [] });

  // Function to update dimensions based on current viewport.
  const getDimensions = () => {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  };

  // Load foreign keys JSON from public/analysis-dean/foreign-keys.json
  useEffect(() => {
    fetch("/analysis-dean/foreign-keys.json")
      .then((res) => res.json())
      .then((fkeys) => {
        const nodesMap = new Map();
        const links = [];
        fkeys.forEach((d) => {
          const sourceId = `${d.database || ""}-${d.schema || ""} ${d.table}`;
          const targetId = `${d.fk_table}: ${d.fk_column}`;
          if (!nodesMap.has(sourceId)) {
            nodesMap.set(sourceId, {
              id: sourceId,
              label: sourceId,
              type: "source",
              collapsed: false, // Initial state: not collapsed
              hidden: false     // Initial state: not hidden
            });
          }
          if (!nodesMap.has(targetId)) {
            nodesMap.set(targetId, {
              id: targetId,
              label: targetId,
              type: "target",
              collapsed: false, // Initial state: not collapsed
              hidden: false     // Initial state: not hidden
            });
          }
          links.push({
            source: sourceId,
            target: targetId,
            constraint: d.constraint
          });
        });
        setData({ nodes: Array.from(nodesMap.values()), links: links });
      })
      .catch((err) => console.error(err));
  }, []);

  // Build a collapsible force-directed diagram with collapse/uncollapse of connected nodes on click
  useEffect(() => {
    if (data.nodes.length === 0) return;

    let { width, height } = getDimensions();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Clear previous content.
    svg.selectAll("*").remove();

    // Add zoom container.
    const container = svg.append("g");

    // Create zoom handler.
    const zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Define an arrow marker.
    const defs = svg.append("defs");
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "gray");

    // Initialize force simulation.
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id((d) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-50))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Helper function to find all descendants of a node (recursive traversal)
    const findAllDescendants = (startNodeId, allNodes, allLinks) => {
      const descendants = new Set();
      const queue = [startNodeId];
      const visited = new Set();

      while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        // Find all nodes that 'currentId' links to
        const outgoingLinks = allLinks.filter(link => link.source.id === currentId);
        outgoingLinks.forEach(link => {
          const targetNode = allNodes.find(n => n.id === link.target.id);
          if (targetNode && !descendants.has(targetNode.id)) {
            descendants.add(targetNode.id);
            queue.push(targetNode.id);
          }
        });
      }
      return Array.from(descendants);
    };

    // Draw links (edges).
    const link = container.append("g")
      .attr("stroke", "gray")
      .attr("stroke-width", 1.5)
      .selectAll("line")
      .data(data.links)
      .enter()
      .append("line")
      .attr("marker-end", "url(#arrowhead)")
      .style("display", l => {
        // Hide link if its source is collapsed OR its target is hidden (recursively)
        return (l.source.collapsed || l.source.hidden || l.target.hidden || l.target.collapsed) ? "none" : "block";
      });

    // Draw nodes as groups.
    const node = container.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("g")
      .data(data.nodes)
      .enter()
      .append("g")
      .style("display", d => d.hidden ? "none" : "block"); // Set initial display based on node's hidden state

    // Append circle and text to each node.
    const circle = node.append("circle")
      .attr("r", d => d.collapsed ? 17.5 * 3 : 17.5) // Adjust radius based on collapsed state
      .attr("fill", d => d.collapsed ? "green" : (d.type === "source" ? "steelblue" : "tomato")) // Adjust color based on collapsed state
      .on("click", (event, clickedNode) => {
        event.stopPropagation();

        // 1. Toggle the 'collapsed' state of the clicked node.
        let updatedNodes = data.nodes.map(n =>
          n.id === clickedNode.id ? { ...n, collapsed: !n.collapsed } : n
        );

        // 2. Determine which nodes should be hidden based on the new 'collapsed' states.
        // First, reset all hidden states to false for all nodes.
        updatedNodes = updatedNodes.map(n => ({ ...n, hidden: false }));

        // Then, identify all descendants of currently collapsed nodes and mark them as hidden.
        const collapsedNodes = updatedNodes.filter(n => n.collapsed);
        collapsedNodes.forEach(cNode => {
          const descendants = findAllDescendants(cNode.id, updatedNodes, data.links);
          descendants.forEach(descId => {
            updatedNodes = updatedNodes.map(n =>
              n.id === descId ? { ...n, hidden: true } : n
            );
          });
        });

        // 3. Update the state to trigger a re-render of the D3 diagram.
        setData({ nodes: updatedNodes, links: data.links });
      });

    node.append("text")
      .attr("x", 12)
      .attr("y", 5)
      .attr("fill", "navy")
      .style("font-size", "28px")
      .style("pointer-events", "none")
      .text(d => d.label);

    simulation.on("tick", () => {
      link.attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);
      
      node.attr("transform", d => `translate(${d.x}, ${d.y})`);
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
    
    circle.call(drag(simulation));

    let tooltip = d3.select("body").select(".tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.7)")
        .style("color", "#fff")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0);
    }

    circle.on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 0.9);
      const htmlContent = `<strong>Source:</strong> ${d.id}<br/>
                           <strong>Target:</strong> ${d.label}<br/>
                           <strong>Type:</strong> ${d.type}`;
      tooltip.html(htmlContent);
    })
    .on("mousemove", (event) => {
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY + 10) + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(500).style("opacity", 0);
    });

    const handleResize = () => {
      let { width, height } = getDimensions();
      svg.attr("width", width).attr("height", height);
      simulation.force("center", d3.forceCenter(width / 2, height / 2))
                .alpha(0.5)
                .restart();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      simulation.stop();
      window.removeEventListener("resize", handleResize);
      tooltip.remove();
    };
  }, [data]); // Dependency array includes 'data' to re-run on state change

  return <svg ref={svgRef}></svg>;
};

export default ForeignKeysDiagram;
