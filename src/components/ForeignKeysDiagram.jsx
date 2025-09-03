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
            });
          }
          if (!nodesMap.has(targetId)) {
            nodesMap.set(targetId, {
              id: targetId,
              label: targetId,
              type: "target",
              collapsed: false, // Initial state: not collapsed
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

    // Create a map of all nodes for quick lookup
    const allNodesMap = new Map(data.nodes.map(node => [node.id, node]));

    // Determine which nodes are hidden (direct children of collapsed nodes)
    const nodesToHideIds = new Set(); // Stores IDs of nodes that should be hidden
    data.nodes.forEach(node => {
      if (node.collapsed) {
        // Find all direct children of this collapsed node
        // Iterate through original links (before D3 mutates them to objects)
        data.links.forEach(link => {
          // At this point, link.source and link.target are still string IDs from the initial data load.
          const sourceId = link.source;
          const targetId = link.target;
          if (sourceId === node.id) {
            nodesToHideIds.add(targetId);
          }
        });
      }
    });

    // Filter nodes: only include nodes that are not marked as hidden
    const visibleNodes = data.nodes.filter(d => !nodesToHideIds.has(d.id));
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id)); // For quick lookup

    // Filter links: only include links where both source and target are visible,
    // and the source node is not collapsed.
    const visibleLinks = data.links.filter(l => {
      // At this point, l.source and l.target are still string IDs from the initial data load.
      const sourceId = l.source;
      const targetId = l.target;
      const sourceNode = allNodesMap.get(sourceId); // Get actual node object for collapsed state

      return visibleNodeIds.has(sourceId) &&
             visibleNodeIds.has(targetId) &&
             sourceNode && !sourceNode.collapsed; // Ensure sourceNode exists and is not collapsed
    });

    // Initialize force simulation with visible nodes and links.
    const simulation = d3.forceSimulation(visibleNodes)
      .force("link", d3.forceLink(visibleLinks).id((d) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-50))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Draw links (edges) using .join() for efficient updates.
    let link = container.append("g")
      .attr("stroke", "gray")
      .attr("stroke-width", 1.5)
      .selectAll("line")
      .data(visibleLinks, d => `${d.source}-${d.target}`)
      .join(
        enter => enter.append("line")
                      .attr("marker-end", "url(#arrowhead)"),
        update => update,
        exit => exit.remove()
      );

    // Draw nodes as groups using .join() for efficient updates.
    let node = container.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("g.node-group") // Select by class for specificity
      .data(visibleNodes, d => d.id)
      .join(
        enter => {
          const nodeEnter = enter.append("g")
                                 .attr("class", "node-group"); // Add class
          nodeEnter.append("circle")
            .attr("r", d => d.collapsed ? 17.5 * 3 : 17.5) // Adjust radius based on collapsed state
            .attr("fill", d => d.collapsed ? "green" : (d.type === "source" ? "steelblue" : "tomato")) // Adjust color based on collapsed state
            .on("click", (event, clickedNode) => {
              event.stopPropagation();

              // 1. Toggle the 'collapsed' state of the clicked node.
              const newNodesState = data.nodes.map(n =>
                n.id === clickedNode.id ? { ...n, collapsed: !n.collapsed } : n
              );

              // 2. Update the state to trigger a re-render of the D3 diagram.
              // The useEffect will now filter based on 'collapsed' states.
              setData({ nodes: newNodesState, links: data.links });
            });

          nodeEnter.append("text")
            .attr("x", 12)
            .attr("y", 5)
            .attr("fill", "navy")
            .style("font-size", "28px")
            .style("pointer-events", "none")
            .text(d => d.label);
          return nodeEnter;
        },
        update => {
          update.select("circle")
            .attr("r", d => d.collapsed ? 17.5 * 3 : 17.5)
            .attr("fill", d => d.collapsed ? "green" : (d.type === "source" ? "steelblue" : "tomato"));
          update.select("text")
            .text(d => d.label); // Update text in case label changes (though unlikely here)
          return update;
        },
        exit => exit.remove()
      );

    // Re-apply drag behavior to new/updated circles
    node.select("circle").call(drag(simulation));

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

    node.select("circle").on("mouseover", (event, d) => { // Attach mouseover to circles within the 'node' selection
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
