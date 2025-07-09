$(document).ready(function () {
  
  let compressedGraph = zlibDecompress(window.compressedGraph);

  if (compressedGraph === "DO_NOT_GENERATE") {
    $(".graph").remove();
  }
  
  
  $("#loader").hide();
  window.rows = [];
  let data = JSON.parse(zlibDecompress(window.compressedReport));
  console.log(data);
  window.rows = generateRows(data);
  generateDataTable(window.rows);
  
  if (compressedGraph != "DO_NOT_GENERATE") {
    let graphData = JSON.parse(compressedGraph);
    var cy = generateGraph(graphData);
    var cyf = generateFilteredGraph(graphData);

    window.cy = cy;
    window.cyf = cyf;

    window.cy.on("dblclick", "node", function (evt) {
      let node = evt.target;
      let connectedNodes = evt.target.connectedEdges().connectedNodes().length;
      alert("This node has " + connectedNodes + " connected nodes");
      window.open(node._private.data.id, "_blank");
    });

    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey || event.metaKey) {
        cy.userZoomingEnabled(true);
        window.cyf.userZoomingEnabled(true);
      }
    });

    document.addEventListener("keyup", (event) => {
      if (!event.ctrlKey || !event.metaKey) {
        cy.userZoomingEnabled(false);
        window.cyf.userZoomingEnabled(false);
      }
    });
  }
  
  
  
  $("#report").on("click", ".json-cell", function () {
    if (compressedGraph !== "DO_NOT_GENERATE") {
    filterGraphByNode(window.cyf, $(this).data("node-id"));
    window.cyf.zoom({ level: 0.5 });
    window.cyf.fit();  
    }
    
    const text = $(this).text();
    $("#offcanvasTitle").text(text);

    const comment =
      $(this).data("comment").split(",").join("\n") || "✌🏻 Schema Looks Good! ";
    $("#jsonComment").text(comment);

    const json = $(this).data("json");
    $("#json").JSONView(json, {
      collapsed: true,
    });

    const url = this.parentNode.childNodes[0].textContent;
    $("#offcanvas-url").text(url);

    $("#offcanvas").offcanvas("show");
  });

  var tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});
$(".cycontainer").on("hover", "#overlay", function () {
  console.log("hovered");
});
// $("footer").hover(function() {
//   console.log("hovered");
// });

const zlibDecompress = (compressed_json) => {
  try {
    const binaryString = atob(compressed_json);
    const binaryLen = binaryString.length;
    const bytes = new Uint8Array(binaryLen);

    for (let i = 0; i < binaryLen; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return pako.inflate(bytes, { to: "string" });
  } catch (error) {
    console.error("Error decompressing string:", error);
    alert("Error decompressing string");
    throw error;
  }
};

const generateRows = (jsonData) => {
  let rows = [];
  jsonData.results.forEach((item, index) => {
    let metaDescription = item.meta_check ? item.meta_check.description : "";
    let metaKeywords = item.meta_check ? item.meta_check.keywords : "";
    let og_title = item.meta_check ? item.meta_check.og_title : "";
    let og_description = item.meta_check ? item.meta_check.og_description : "";
    let og_keywords = item.meta_check ? item.meta_check.og_keywords : "";
    let og_image = item.meta_check ? item.meta_check.og_image : "";
    let og_url = item.meta_check ? item.meta_check.og_url : "";
    let og_site_name = item.meta_check ? item.meta_check.og_site_name : "";

    if (item.schemas.length === 0) {
      rows.push([
        item.url,
        item.isUrlResolving,
        metaDescription || "➖",
        metaKeywords || "➖",
        og_title || "➖",
        og_description || "➖",
        og_keywords || "➖",
        og_image || "➖",
        og_url || "➖",
        og_site_name || "➖",
        "No JSON schema generated",
        "No JSON schema generated",
        '{"error": "No JSON schema generated"}',
        "❌ No JSON schema generated ❌",
      ]);
    }

    $.each(item.schemas, function (schemaIndex, schema) {
      rows.push([
        item.url,
        item.isUrlResolving,
        metaDescription,
        metaKeywords,
        og_title,
        og_description,
        og_keywords,
        og_image,
        og_url,
        og_site_name,
        schema.name,
        schema.status,
        schema.json,
        schema?.comments,
      ]);
    });
  });
  return rows;
};

const generateBadge = (value) => {
  switch (value) {
    case "false":
    case "":
      return '<span class="badge">❌</span>';
      break;

    case "true":
      return '<span class="badge">✅</span>';
      break;

    case "warn":
      return '<span class="badge">🧨</span>';
      break;

    default:
      return value;
      break;
  }
};

const generateDataTable = (rows) => {
  const table = $("#report").DataTable({
    data: rows,
    searching: false,
    paging: false,
    fixedHeader: true,
    infoCallback: function (settings, start, end, max, total, pre) {
      const api = this.api();
      const uniqueUrls = api.column(0, { search: 'applied' }).data().unique().length;
      return 'Showing ' + uniqueUrls + ' unique URLs';
    },
    drawCallback: function (settings) {
      const api = this.api();
      const rows = api.rows().nodes();
      let previousUrl = null;
      let rowspan = 1;
      let startRow = -1;
      api.rows().every(function (rowIndex) {
        const data = this.data();
        const currentUrl = data[0];
        const jsonData = data[12];
        const jsonComment = data[13];
        let currentRow = $(rows[rowIndex]);
        currentRow.find(`td:eq(0)`).addClass("url");

        currentRow
          .find(`td:eq(10)`)
          .attr("data-json", jsonData)
          .attr("data-comment", jsonComment)
          .attr("data-node-id", currentUrl)
          .addClass("json-cell");
        // convert the column values from boolean to bootstrap badges
        for (let i = 0; i < 12; i++) {
          $(rows[rowIndex])
            .find(`td:eq(${i})`)
            .html(generateBadge(`${data[i]}`));
        }

        if (currentUrl === previousUrl) {
          rowspan++;
          for (let i = 0; i <= 9; i++) {
            //rowspan the first 9 columns
            $(rows[startRow])
              .find(`td:eq(${i})`)
              .attr("rowspan", rowspan)
              .addClass("rowspan-cell");
            $(rows[rowIndex]).find(`td:eq(${i})`).hide();
          }
        } else {
          rowspan = 1;
          startRow = rowIndex;
        }
        previousUrl = currentUrl;
      });
    },
  });
};

const generateGraph = (data) => {
  const baseUrl = new URL(data[0].data.id).origin + "/";
  return new cytoscape({
    container: document.getElementById("cy"),
    elements: data,
    userZoomingEnabled: false,
    style: [
      {
        selector: "node",
        style: {
          "background-color": (data) => {
            let color = "#666";
            color = data[0][0]._private.data.weight == 2 ? "#f00" : "#666";
            color = data[0][0]._private.data.weight == 1 ? "orange" : color;
            color = data[0][0]._private.data.id == baseUrl ? "green" : color;
            return color;
          },
          label: "data(id)",
          width: (data) => {
            let w = 20;
            w = data[0][0]._private.data.id == baseUrl ? 70 : w;
            w = data[0][0]._private.data.weight == 2 ? 50 : w;
            return `${w}px`;
          },
          height: (data) => {
            let h = 20;
            h = data[0][0]._private.data.id == baseUrl ? 70 : h;
            h = data[0][0]._private.data.weight == 2 ? 50 : h;
            return `${h}px`;
          },
        },
      },
      {
        selector: "edge",
        style: {
          width: 2,
          "curve-style": "bezier",
          "target-arrow-shape": "triangle",
          "target-arrow-color": "#000",
          "line-color": "#000",
          "line-color": (data) => {
            let color = data._private.data.weight == 2 ? "#ff7f7f" : "#ddd";
            color = data._private.data.weight == 1 ? "orange" : color;
            return color;
          },
          "line-style": () => {
            return "dotted";
          },
        },
      },
    ],
    boxSelectionEnabled: false,
    autounselectify: true,
    layout: {
      name: "concentric",
    },
  });
};

const generateFilteredGraph = (data) => {
  const baseUrl = new URL(data[0].data.id).origin + "/";
  return new cytoscape({
    container: document.getElementById("cyf"),
    userZoomingEnabled: false,
    elements: data,
    style: [
      {
        selector: "node",
        style: {
          "background-color": (data) => {
            let color = "#666";
            color = data[0][0]._private.data.weight == 2 ? "#f00" : "#666";
            color = data[0][0]._private.data.weight == 1 ? "orange" : color;
            color = data[0][0]._private.data.id == baseUrl ? "green" : color;
            return color;
          },
          label: "data(id)",
          width: (data) => {
            let w = 20;
            w = data[0][0]._private.data.id == baseUrl ? 70 : w;
            w = data[0][0]._private.data.weight == 2 ? 50 : w;
            return `${w}px`;
          },
          height: (data) => {
            let h = 20;
            h = data[0][0]._private.data.id == baseUrl ? 70 : h;
            h = data[0][0]._private.data.weight == 2 ? 50 : h;
            return `${h}px`;
          },
        },
      },
      {
        selector: "edge",
        style: {
          width: 2,
          "curve-style": "bezier",
          "target-arrow-shape": "triangle",
          "target-arrow-color": "#000",
          "line-color": "#000",
          "line-color": (data) => {
            let color = data._private.data.weight == 2 ? "#ff7f7f" : "#ddd";
            color = data._private.data.weight == 1 ? "orange" : color;
            return color;
          },
        },
      },
    ],
    layout: {
      name: "concentric",
    },
  });
};

function filterGraphByNode(cy, targetNodeId) {
  cy.elements().hide();

  var targetNode = cy.getElementById(targetNodeId);
  if (targetNode.empty()) {
    console.error("Target node not found");
    return;
  }

  var connectedNodes = targetNode.closedNeighborhood().nodes();
  var connectedEdges = targetNode.closedNeighborhood().edges();

  targetNode.show();
  connectedNodes.show();
  connectedEdges.show();
}
