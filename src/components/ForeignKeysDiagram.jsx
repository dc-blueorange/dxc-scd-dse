import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

const ForeignKeysDiagram = () => {
  const svgRef = useRef(null);
  const [data, setData] = useState({ nodes: [], links: [] });

  const getDimensions = () => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  };

  const linkedIds = {};

  useEffect(() => {
    fetch("/analysis-dean/foreign-keys.json")
      .then((res) => res.json())
      .then((fkeys) => {
        const nodesMap = new Map();
        const links = [];
        fkeys.forEach((d) => {
          const sourceId = `${d.database || ""}-${d.schema || ""} ${d.table}: ${
            d.fk_key
          }`;
          const targetId = `${d.database || ""}-${d.schema || ""} ${
            d.fk_table
          }: ${d.fk_column}`;
          if (!nodesMap.has(sourceId)) {
            nodesMap.set(sourceId, {
              id: sourceId,
              label: sourceId,
              type: "source",
              collapsed: false,
              hidden: false,
            });
          }
          if (!nodesMap.has(targetId)) {
            nodesMap.set(targetId, {
              id: targetId,
              label: targetId,
              type: "target",
              collapsed: false,
              hidden: false,
            });
          }
          links.push({
            source: sourceId,
            target: targetId,
            constraint: d.constraint,
            hidden: false,
          });
        });
        setData({ nodes: Array.from(nodesMap.values()), links: links });
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (data.nodes.length === 0) return;

    if (Object.keys(linkedIds).length === 0) {
      data.links.forEach((link) => {
        if (!linkedIds[link.source]) linkedIds[link.source] = [];
        linkedIds[link.source].push(link.target);
        if (!linkedIds[link.target]) linkedIds[link.target] = [];
        linkedIds[link.target].push(link.source);
      });
    }

    const { width, height } = getDimensions();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);
    svg.selectAll("*").remove();

    const container = svg.append("g");

    svg.call(
      d3
        .zoom()
        .scaleExtent([0, 4])
        .on("zoom", (event) => {
          container.attr("transform", event.transform);
        })
    );

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

    const simulation = d3
      .forceSimulation(data.nodes)
      .force("charge", d3.forceManyBody().strength(-50))
      .force("center", d3.forceCenter(width / 2, height / 2));

    let link = container
      .append("g")
      .attr("stroke", "gray")
      .attr("stroke-width", 1.5)
      .selectAll("line")
      .data(data.links, (l) => `${l.source}-${l.target}`)
      .join("line")
      .attr("marker-end", "url(#arrowhead)");

    simulation.force(
      "link",
      d3
        .forceLink(data.links)
        .id((d) => d.id)
        .distance(150)
    );

    // Update function to update nodes and links styles & visibility
    const updateVisuals = () => {
      node
        .attr("display", (d) => (d.hidden ? "none" : null))
        .select("circle")
        .attr("r", (d) => (d.collapsed ? 17.5 * 3 : 17.5))
        .attr("fill", (d) =>
          d.collapsed ? "green" : d.type === "source" ? "steelblue" : "tomato"
        );

      // node.select("text").text((d) =>
      //   d.collapsed ? `${d.label} (collapsed)` : `${d.label} (uncollapsed)`
      // );

      link.attr("display", (l) => (l.hidden ? "none" : null));
    };

    let node = container
      .append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("g.node-group")
      .data(data.nodes, (d) => d.id)
      .join(
        (enter) => {
          const nodeEnter = enter.append("g").attr("class", "node-group");

          nodeEnter
            .append("circle")
            .attr("r", (d) => (d.collapsed ? 17.5 * 3 : 17.5))
            .attr("fill", (d) =>
              d.collapsed
                ? "green"
                : d.type === "source"
                ? "steelblue"
                : "tomato"
            )
            .on("click", (event, clickedNode) => {
              event.stopPropagation();
              const targetState = !clickedNode.collapsed;

              const linkedNodes = [];
              const linkedNodeIds = [];
              {
                const nodesVisited = new Set();
                const stack = [clickedNode.id];
                while (stack.length > 0) {
                  const current = stack.pop();
                  linkedIds[current].forEach((id) => {
                    if (!nodesVisited.has(id)) {
                      linkedNodeIds.push(id);
                      nodesVisited.add(id);
                      stack.push(id);
                    }
                  });
                }
                linkedNodes.push(
                  ...linkedNodeIds.map((id) =>
                    data.nodes.find((n) => n.id === id)
                  )
                );
              }
              // Toggle hidden on linked nodes
              linkedNodes.forEach((n) => {
                n.hidden = targetState;
              });

              // Toggle hidden for links connected to clicked node
              data.links.forEach((l) => {
                if (
                  linkedNodeIds.indexOf(l.source.id) >= 0 ||
                  linkedNodeIds.indexOf(l.target.id) >= 0
                ) {
                  l.hidden = targetState;
                }
              });

              clickedNode.collapsed = targetState;
              clickedNode.hidden = false;

              updateVisuals();
              simulation.alpha(0.5).restart();
            });

          nodeEnter
            .append("text")
            .attr("x", 12)
            .attr("y", 5)
            .attr("fill", "navy")
            .style("font-size", "28px")
            .style("pointer-events", "none")
            // .text((d) =>
            //   d.collapsed ? `${d.label} (collapsed)` : `${d.label} (uncollapsed)`
            .text((d) => `${d.label}`);
          return nodeEnter;
        },
        (update) => update, // no change needed for now
        (exit) => exit.remove()
      );

    // Apply drag behavior
    node.select("circle").call(
      d3
        .drag()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node
        .attr("display", (d) => (d.hidden ? "none" : null))
        .attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    });

    // Initialize visuals after first render
    updateVisuals();

    // Add hover tooltip popups
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
      const { width, height } = getDimensions();
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
    };
  }, [data]);

  return <svg ref={svgRef}></svg>;
};

export default ForeignKeysDiagram;
