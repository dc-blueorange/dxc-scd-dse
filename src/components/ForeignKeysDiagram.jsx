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

  // Helper function to get the graph reachable from the root, considering collapsed nodes.
  const getReachableGraph = (allNodes, allLinks, collapsedNodeIds) => {
    const visibleNodes = [];
    const visibleLinks = [];
    const visited = new Set();

    const queue = allNodes.filter(node => node.id === "root"); // Start with the root node

    while (queue.length > 0) {
      const currentNode = queue.shift();

      if (visited.has(currentNode.id)) continue;
      visited.add(currentNode.id);

      visibleNodes.push(currentNode);

      // If the node is not collapsed, explore its children and outgoing links
      if (!collapsedNodeIds.has(currentNode.id)) {
        // Add outgoing links
        allLinks.forEach(link => {
          if (link.source.id === currentNode.id) {
            // Check if the target is also a visible node (or will be added)
            const targetNode = allNodes.find(n => n.id === link.target.id);
            if (targetNode && !visited.has(targetNode.id)) {
              visibleLinks.push(link);
              if (!queue.some(n => n.id === targetNode.id)) {
                queue.push(targetNode);
              }
            } else if (targetNode && visited.has(targetNode.id)) {
              // If target is already visited, still add the link if it's not already added
              if (!visibleLinks.some(vl => vl.source.id === link.source.id && vl.target.id === link.target.id)) {
                visibleLinks.push(link);
              }
            }
          }
        });

        // Add children to the queue
        if (currentNode.children) {
          currentNode.children.forEach(child => {
            if (!queue.some(n => n.id === child.id)) {
              queue.push(child);
            }
          });
        }
      }
    }
    return { nodes: visibleNodes, links: visibleLinks };
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
              children: [],
              _children: null,
              collapsed: false, // Initialize collapsed state
            });
          }
          if (!nodesMap.has(targetId)) {
            nodesMap.set(targetId, {
              id: targetId,
              label: targetId,
              type: "target",
              children: [],
              _children: null,
              collapsed: false, // Initialize collapsed state
            });
          }

          const sourceNode = nodesMap.get(sourceId);
          const targetNode = nodesMap.get(targetId);
          if (sourceNode && targetNode) {
            // Ensure target is not already a child to avoid duplicates
            if (!sourceNode.children.some(child => child.id === targetNode.id)) {
              sourceNode.children.push(targetNode);
            }
          }

          links.push({
            source: sourceId,
            target: targetId,
            constraint: d.constraint
          });
        });

        const root = { id: "root", label: "Root", type: "root", children: [], _children: null, collapsed: false };
        const allNodes = Array.from(nodesMap.values());

        // Determine top-level sources (nodes that are 'source' type and not targets of any link)
        const topLevelSources = allNodes.filter(node =>
          node.type === "source" && !links.some(link => link.target === node.id)
        );
        root.children.push(...topLevelSources);

        // Add all nodes to the data, including the root
        setData({ nodes: [root, ...allNodes], links: links });
      })
      .catch((err) => console.error("Error loading foreign keys:", err));
  }, []);

  // Build a collapsible force-directed diagram with collapse/uncollapse of connected nodes on click
  useEffect(() => {
    if (data.nodes.length === 0) return;

    const { width, height } = getDimensions();
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

    // Prepare nodes and links for simulation based on collapsed state
    const currentCollapsedNodeIds = new Set(data.nodes.filter(n => n.collapsed).map(n => n.id));
    const { nodes: visibleNodes, links: visibleLinks } = getReachableGraph(data.nodes, data.links, currentCollapsedNodeIds);

    // Initialize force simulation
    const simulation = d3.forceSimulation(visibleNodes)
      .force("link", d3.forceLink(visibleLinks).id(d => d.id).distance(150)) // Apply link force here
      .force("charge", d3.forceManyBody().strength(-50))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Draw links (edges)
    let link = container.append("g")
      .attr("stroke", "gray")
      .attr("stroke-width", 1.5)
      .selectAll("line")
      .data(visibleLinks, d => d.source.id + '-' + d.target.id) // Use IDs for keying
      .join(
        enter => enter.append("line")
                      .attr("marker-end", "url(#arrowhead)"),
        update => update,
        exit => exit.remove()
      );

    // Draw nodes as groups
    let node = container.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("g.node-group")
      .data(visibleNodes, d => d.id)
      .join(
        enter => {
          const nodeEnter = enter.append("g")
                                 .attr("class", "node-group");
          nodeEnter.append("circle")
            .attr("r", d => d.collapsed ? 17.5 * 3 : 17.5)
            .attr("fill", d => d.collapsed ? "green" : (d.type === "source" ? "steelblue" : "tomato"))
            .on("click", (event, clickedNode) => {
              event.stopPropagation();
              const newNodesState = data.nodes.map(n =>
                n.id === clickedNode.id ? { ...n, collapsed: !n.collapsed } : n
              );
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
            .text(d => d.label);
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

    node.select("circle").on("mouseover", (event, d) => {
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
  }, [data, getReachableGraph]); // getReachableGraph is now defined and used here

  return <svg ref={svgRef}></svg>;
};

export default ForeignKeysDiagram;