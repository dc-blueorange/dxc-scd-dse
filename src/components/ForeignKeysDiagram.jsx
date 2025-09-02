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
        // Build unique nodes for source and target.
        // Source node: represents "database-table"
        // Target node: represents "fk_table-fk_column"
        const nodesMap = new Map();
        const links = [];
        fkeys.forEach((d) => {
          const sourceId = `${d.database}-${d.schema}-${d.table}`;
          const targetId = `${d.ref_table}-${d.fk_column}`;
          if (!nodesMap.has(sourceId)) {
            nodesMap.set(sourceId, {
              id: sourceId,
              label: sourceId,
              type: "source",
              collapsed: false
            });
          }
          if (!nodesMap.has(targetId)) {
            nodesMap.set(targetId, {
              id: targetId,
              label: targetId,
              type: "target",
              collapsed: false
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

    let { width, height } = getDimensions(); // Use getDimensions for initial size

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
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Draw links (edges).
    const link = container.append("g")
      .attr("stroke", "gray")
      .attr("stroke-width", 1.5)
      .selectAll("line")
      .data(data.links)
      .enter()
      .append("line")
      .attr("marker-end", "url(#arrowhead)");

    // Draw nodes as groups.
    const node = container.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("g")
      .data(data.nodes)
      .enter()
      .append("g")
      .on("click", (event, d) => {
        // Toggle collapsed state on the clicked node.
        d.collapsed = !d.collapsed;
        // Propagate collapse: for each link where this node is the source, set the target's hidden flag
        data.links.forEach(link => {
          if (link.source.id === d.id) {
            link.target.hidden = d.collapsed;
          }
        });
        update();
      });

    // Append circle and text to each node.
    node.append("circle")
      .attr("r", 10)
      .attr("fill", d => d.type === "source" ? "steelblue" : "tomato");

    node.append("text")
      .attr("x", 12)
      .attr("y", 4)
      .attr("fill", "navy")
      .style("font-size", "19px") // Changed font size to 60% of 32px (19.2px rounded to 19px)
      .text(d => d.label);

    // Update function: set display style for links and connected nodes based on collapse state.
    function update() {
      // For links: hide if source is collapsed.
      link.style("display", d => d.source.collapsed ? "none" : "block");
      // For nodes: if any incoming link has source collapsed or if this node is hidden, hide it.
      node.style("display", d => {
        // If node has no incoming links, always show.
        const incomingLinks = data.links.filter(l => l.target.id === d.id);
        if (incomingLinks.length === 0) return "block";
        // If any incoming link has a collapsed source, hide this node.
        return incomingLinks.some(l => l.source.collapsed) ? "none" : "block";
      });
    }

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
    
    // Apply drag behavior only to the circles within each node group.
    node.select("circle").call(drag(simulation));

    // Add HTML hover popup tooltip for node data.
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

    node.on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 0.9);
      const htmlContent = `<strong>DB-Owner-Table:</strong> ${d.id}<br/>
                           <strong>Label:</strong> ${d.label}<br/>
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

    // Handle window resize
    const handleResize = () => {
      let { width, height } = getDimensions();
      svg.attr("width", width).attr("height", height);
      simulation.force("center", d3.forceCenter(width / 2, height / 2))
                .alpha(0.5) // Briefly increase alpha to re-center more quickly
                .restart();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      simulation.stop();
      window.removeEventListener("resize", handleResize); // Clean up resize listener
      tooltip.remove();
    };
  }, [data]);

  return <svg ref={svgRef}></svg>;
};

export default ForeignKeysDiagram;
