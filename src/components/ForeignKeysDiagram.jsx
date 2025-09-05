import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

const ForeignKeysDiagram = () => {
  const svgRef = useRef(null);
  const [data, setData] = useState({ nodes: [], links: [] });

  // Function to update dimensions based on current viewport.
  const getDimensions = () => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
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
              hidden: false, // Initial state: not hidden
            });
          }
          if (!nodesMap.has(targetId)) {
            nodesMap.set(targetId, {
              id: targetId,
              label: targetId,
              type: "target",
              collapsed: false, // Initial state: not collapsed
              hidden: false, // Initial state: not hidden
            });
          }
          links.push({
            source: sourceId,
            target: targetId,
            constraint: d.constraint,
            hidden: false, // Initial state: not hidden
          });
        });
        setData({ nodes: Array.from(nodesMap.values()), links: links });
      })
      .catch((err) => console.error(err));
  }, []);

  // Build a collapsible force-directed diagram with collapse/uncollapse of connected nodes on click
  useEffect(() => {
    if (data.nodes.length === 0) return;

    // Create deep copies of the original nodes and links from state.
    // This prevents D3's force simulation from mutating the React state directly,
    // ensuring consistent data for filtering and key functions across renders.
    // Note: The click handler now directly mutates the `data` state,
    // so `currentNodes` and `currentLinks` here will reflect the latest state.
    const currentNodes = data.nodes.map((n) => ({ ...n }));
    const currentLinks = data.links.map((l) => ({ ...l }));

    let { width, height } = getDimensions();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Clear previous content.
    svg.selectAll("*").remove();

    // Add zoom container.
    const container = svg.append("g");

    // Create zoom handler.
    const zoom = d3
      .zoom()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Define an arrow marker.
    const defs = svg.append("defs");
    defs
      .append("marker")
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

    // Filter visible nodes and links based on their 'hidden' property
    const visibleNodes = currentNodes.filter((n) => !n.hidden);
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
    const visibleLinks = currentLinks.filter(
      (link) => !link.hidden && visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target)
    );

    // Initialize force simulation with visible nodes.
    // The link force will be added AFTER links are bound to elements.
    const simulation = d3
      .forceSimulation(visibleNodes)
      .force("charge", d3.forceManyBody().strength(-50))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Draw links (edges) using .join() for efficient updates.
    // This must happen BEFORE the link force is applied to the simulation,
    // because d3.forceLink mutates the source/target properties of the link objects it's given.
    let link = container
      .append("g")
      .attr("stroke", "gray")
      .attr("stroke-width", 1.5)
      .selectAll("line")
      .data(visibleLinks, (d) => `${d.source.id || d.source}-${d.target.id || d.target}`) // d.source and d.target are still string IDs here initially, or node objects after forceLink
      .join(
        (enter) => enter.append("line").attr("marker-end", "url(#arrowhead)"),
        (update) => update,
        (exit) => exit.remove()
      );

    // Now, apply the link force to the simulation.
    // The forceLink will mutate the 'source' and 'target' properties of the links in 'visibleLinks'
    // from string IDs to node objects. This is fine because the .data() call already happened
    // and 'visibleLinks' is a copy, not the original state data.
    simulation.force(
      "link",
      d3
        .forceLink(visibleLinks)
        .id((d) => d.id)
        .distance(150)
    );

    // Draw nodes as groups using .join() for efficient updates.
    let node = container
      .append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("g.node-group") // Select by class for specificity
      .data(visibleNodes, (d) => d.id)
      .join(
        (enter) => {
          const nodeEnter = enter.append("g").attr("class", "node-group"); // Add class
          nodeEnter
            .append("circle")
            .attr("r", (d) => (d.collapsed ? 17.5 * 3 : 17.5)) // Adjust radius based on collapsed state
            .attr("fill", (d) =>
              d.collapsed
                ? "green"
                : d.type === "source"
                ? "steelblue"
                : "tomato"
            ) // Adjust color based on collapsed state
            .on("click", (event, clickedNode) => {
              event.stopPropagation();
              const targetState = !clickedNode.collapsed;

              // Build a graph mapping source to target nodes for descendant traversal.
              // Use the current data.links for this.
              const graph = {};
              data.links.forEach((link) => {
                if (!graph[link.source]) graph[link.source] = [];
                graph[link.source].push(link.target);
              });

              const descendantIds = new Set();
              {
                const stack = [clickedNode.id];
                while (stack.length > 0) {
                  const current = stack.pop();
                  (graph[current] || []).forEach((child) => {
                    if (!descendantIds.has(child)) { // Prevent infinite loops for cyclic graphs
                      descendantIds.add(child);
                      stack.push(child);
                    }
                  });
                }
              }

              // Directly manipulate data.nodes
              data.nodes.forEach(n => {
                if (n.id === clickedNode.id) {
                  n.collapsed = targetState;
                }
                if (descendantIds.has(n.id)) {
                  n.collapsed = targetState;
                  n.hidden = targetState;
                }
              });

              // Directly manipulate data.links
              data.links.forEach(link => {
                // Find the source and target nodes in the *mutated* data.nodes array
                const sourceNode = data.nodes.find(node => node.id === link.source);
                const targetNode = data.nodes.find(node => node.id === link.target);

                if (sourceNode && targetNode) {
                    // A link is hidden if either its source or target node is hidden.
                    link.hidden = sourceNode.hidden || targetNode.hidden;
                }
              });

              // Force a re-render by creating a new data object reference,
              // even though its internal arrays were mutated.
              setData({ ...data });

              // Removed direct D3 manipulation of circle attributes here.
              // The `useEffect` will re-run and the `node.join()` update selection
              // will handle the visual changes based on the new `data` state.
            });

          nodeEnter
            .append("text")
            .attr("x", 12)
            .attr("y", 5)
            .attr("fill", "navy")
            .style("font-size", "28px")
            .style("pointer-events", "none")
            .text((d) =>
              d.collapsed
                ? `${d.label} (collapsed)`
                : `${d.label} (uncollapsed)`
            );
          return nodeEnter;
        },
        (update) => {
          update
            .select("circle")
            .attr("r", (d) => (d.collapsed ? 17.5 * 3 : 17.5))
            .attr("fill", (d) =>
              d.collapsed
                ? "green"
                : d.type === "source"
                ? "steelblue"
                : "tomato"
            );
          update
            .select("text")
            .text((d) =>
              d.collapsed
                ? `${d.label} (collapsed)`
                : `${d.label} (uncollapsed)`
            ); // Update text based on collapse state
          return update;
        },
        (exit) => exit.remove()
      );

    // Re-apply drag behavior to new/updated circles
    node.select("circle").call(drag(simulation));

    simulation.on("tick", () => {
      link
        // The 'display' attribute is no longer needed here as filtering happens before data binding
        // .attr("display", (d) => d.hidden ? "none" : null)
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node
        // The 'display' attribute is no longer needed here as filtering happens before data binding
        // .attr("display", (d) => d.hidden ? "none" : null)
        .attr("transform", (d) => `translate(${d.x}, ${d.y})`);
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
      return d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    let tooltip = d3.select("body").select(".tooltip");
    if (tooltip.empty()) {
      tooltip = d3
        .select("body")
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

    node
      .select("circle")
      .on("mouseover", (event, d) => {
        // Attach mouseover to circles within the 'node' selection
        tooltip.transition().duration(200).style("opacity", 0.9);
        const htmlContent = `<strong>Source:</strong> ${d.id}<br/>
                           <strong>Target:</strong> ${d.label}<br/>
                           <strong>Type:</strong> ${d.type}<br/>
                           <strong>Collapsed:</strong> ${d.collapsed}<br/>
                           <strong>Hidden:</strong> ${d.hidden}
                           `;
        tooltip.html(htmlContent);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 10 + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(500).style("opacity", 0);
      });

    const handleResize = () => {
      let { width, height } = getDimensions();
      svg.attr("width", width).attr("height", height);
      simulation
        .force("center", d3.forceCenter(width / 2, height / 2))
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
