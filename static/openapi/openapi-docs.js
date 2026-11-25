(function () {
  "use strict";

  let bearerToken = "";

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined && text !== null) {
      node.textContent = String(text);
    }
    return node;
  }

  async function runOperation(method, rawPath, bodyInput, outputNode) {
    outputNode.textContent = "Ejecutando solicitud HTTP...";
    const headers = { Accept: "application/json" };
    if (bearerToken) {
      headers.Authorization = "Bearer " + bearerToken;
    }
    const opts = { method: method.toUpperCase(), headers: headers };
    if (bodyInput && bodyInput.value.trim() !== "" && method !== "get" && method !== "delete") {
      headers["Content-Type"] = "application/json";
      opts.body = bodyInput.value;
    }
    try {
      const resp = await fetch(rawPath, opts);
      const text = await resp.text();
      let formatted = text;
      try {
        formatted = JSON.stringify(JSON.parse(text), null, 2);
      } catch (_err) {
        formatted = text || "(Sin contenido)";
      }
      outputNode.textContent = "HTTP " + resp.status + "\n\n" + formatted;
    } catch (err) {
      outputNode.textContent = "Error de red: " + err.message;
    }
  }

  function renderSpec(spec, mount) {
    mount.textContent = "";
    const titleNode = document.getElementById("oa-doc-title");
    const verNode = document.getElementById("oa-doc-version");
    const descNode = document.getElementById("oa-doc-desc");

    if (spec.info) {
      if (titleNode && spec.info.title) {
        titleNode.textContent = spec.info.title;
      }
      if (verNode && spec.info.version) {
        verNode.textContent = "v" + spec.info.version;
      }
      if (descNode && spec.info.description) {
        descNode.textContent = spec.info.description;
      }
    }

    const paths = spec.paths || {};
    const pathKeys = Object.keys(paths).sort();
    const validMethods = ["get", "post", "put", "patch", "delete"];

    pathKeys.forEach(function (pathStr) {
      const pathItem = paths[pathStr] || {};
      validMethods.forEach(function (method) {
        if (!pathItem[method]) {
          return;
        }
        const op = pathItem[method];
        const card = el("div", "oa-endpoint");
        const head = el("div", "oa-endpoint-head");
        const badge = el("span", "oa-method oa-method-" + method, method.toUpperCase());
        const pathLabel = el("span", "oa-path", pathStr);
        const summary = el("span", "oa-summary", op.summary || op.operationId || "");

        head.appendChild(badge);
        head.appendChild(pathLabel);
        head.appendChild(summary);

        const body = el("div", "oa-endpoint-body");
        if (op.description) {
          body.appendChild(el("p", "oa-desc", op.description));
        }

        const pathInputLabel = el("div", "oa-desc", "Ruta de prueba:");
        const pathInput = el("input", "oa-input");
        pathInput.type = "text";
        pathInput.value = pathStr;
        body.appendChild(pathInputLabel);
        body.appendChild(pathInput);

        let bodyTextarea = null;
        if (method === "post" || method === "put" || method === "patch") {
          body.appendChild(el("div", "oa-desc", "Cuerpo JSON (opcional):"));
          bodyTextarea = el("textarea", "oa-textarea");
          bodyTextarea.value = "{}";
          body.appendChild(bodyTextarea);
        }

        const runBtn = el("button", "oa-btn", "Probar endpoint");
        runBtn.type = "button";
        const outPre = el("pre", "oa-pre", "Presiona 'Probar endpoint' para ver la respuesta en vivo.");

        runBtn.addEventListener("click", function () {
          runOperation(method, pathInput.value, bodyTextarea, outPre);
        });

        const btnWrap = el("div");
        btnWrap.appendChild(runBtn);
        body.appendChild(btnWrap);
        body.appendChild(outPre);

        head.addEventListener("click", function () {
          body.classList.toggle("open");
        });

        card.appendChild(head);
        card.appendChild(body);
        mount.appendChild(card);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    const root = document.getElementById("swagger-ui");
    if (!root) {
      return;
    }
    const schemaUrl = root.getAttribute("data-schema-url") || "/api/v1/schema/?format=json";
    const tokenInput = document.getElementById("oa-jwt-input");
    const tokenBtn = document.getElementById("oa-jwt-btn");
    const tokenStatus = document.getElementById("oa-jwt-status");

    if (tokenBtn && tokenInput && tokenStatus) {
      tokenBtn.addEventListener("click", function () {
        bearerToken = tokenInput.value.trim();
        tokenStatus.textContent = bearerToken ? "Token Bearer activo" : "Sin token";
      });
    }

    fetch(schemaUrl, { headers: { Accept: "application/json" } })
      .then(function (r) {
        return r.json();
      })
      .then(function (spec) {
        renderSpec(spec, root);
      })
      .catch(function (err) {
        root.textContent = "No fue posible cargar el esquema OpenAPI: " + err.message;
      });
  });
})();
