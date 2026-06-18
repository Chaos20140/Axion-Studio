/* =========================================================
   CMS CONTENT LOADER
   Fills the site from content/site.json (edited via Pages CMS).
   Three hooks:
     • [data-cms="path"]       → element.textContent = value
     • [data-cms-href="path"]  → element.href = value (safe schemes only)
     • [data-cms-list="path"]  → render an array into the container using
                                  the template named in [data-cms-tpl]
   Defaults stay in the HTML, so if this file or the JSON ever fail to load
   the page still shows the baked-in content (fail-safe + SEO-safe).

   SECURITY: all user-entered text is written with textContent (never
   innerHTML), links are restricted to a safe-scheme allowlist, and image
   sources are restricted to in-repo relative paths — CMS content can never
   inject markup, scripts or javascript:/data: URLs.
   ========================================================= */
(() => {
  const SAFE_HREF = /^(https?:|mailto:|tel:|\/|#|\.)/i;
  const SAFE_SRC = /^(assets\/|\/|https?:\/\/)/i;

  // tiny DOM helper — h("a", {class, href, ...}, [children|strings])
  const h = (tag, props, kids) => {
    const el = document.createElement(tag);
    for (const k in (props || {})) {
      if (k === "text") el.textContent = props[k];
      else if (props[k] != null) el.setAttribute(k, props[k]);
    }
    (kids || []).forEach((c) => el.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return el;
  };
  const safeHref = (v) => (typeof v === "string" && SAFE_HREF.test(v.trim()) ? v.trim() : null);
  const domain = (u) => { try { return new URL(u).host.replace(/^www\./, ""); } catch { return (u || "").replace(/^https?:\/\//, "").replace(/\/.*$/, ""); } };

  /* ---- list item templates (keyed by data-cms-tpl) ---- */
  const templates = {
    // Projekte: big featured "live case" card
    caseFeature(item) {
      const href = safeHref(item.url);
      const media = h("div", { class: "case-feature__media" }, [
        h("img", {
          src: (typeof item.image === "string" && SAFE_SRC.test(item.image) ? item.image : null),
          alt: "Vorschau der Website von " + (item.name || ""),
          loading: "lazy", decoding: "async",
        }),
        h("span", { class: "case-feature__badge", text: "Live ↗" }),
      ]);
      const body = h("div", { class: "case-feature__body" }, [
        h("span", { class: "case-feature__kicker mono", text: "/ FEATURED CASE" }),
        h("h2", { class: "case-feature__name", text: item.name || "" }),
        h("p", { class: "case-feature__desc", text: item.description || "" }),
        h("div", { class: "case-feature__meta" }, [
          h("span", { class: "mono", text: item.category || "" }),
          h("span", { class: "mono", text: item.year || "" }),
        ]),
        h("span", { class: "case-feature__cta mono", text: (href ? domain(href) + " ansehen ↗" : "") }),
      ]);
      return h("a", href
        ? { class: "case-feature", href, target: "_blank", rel: "noopener noreferrer" }
        : { class: "case-feature" }, [media, body]);
    },
    // Projekte: index row (linked = live, or dimmed "in Vorbereitung")
    projRow(item, i) {
      const num = String(i + 1).padStart(2, "0");
      const href = safeHref(item.url);
      const cells = [
        h("span", { class: "proj__num mono", text: num }),
        h("span", { class: "proj__name", text: item.name || "" }),
        h("span", { class: "proj__cat mono", text: (item.category || "") + (href ? " ↗" : "") }),
        h("span", { class: "proj__year mono", text: item.year || "" }),
      ];
      const inner = href
        ? h("a", { href, target: "_blank", rel: "noopener noreferrer" }, cells)
        : h("div", { class: "proj__row proj__row--soon" }, cells);
      return h("li", { class: "proj" }, [inner]);
    },
  };

  fetch("content/site.json?ts=" + Date.now())
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no content"))))
    .then((data) => {
      const get = (path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), data);

      document.querySelectorAll("[data-cms]").forEach((el) => {
        const v = get(el.getAttribute("data-cms"));
        if (typeof v === "string") el.textContent = v;
      });
      document.querySelectorAll("[data-cms-href]").forEach((el) => {
        const v = safeHref(get(el.getAttribute("data-cms-href")));
        if (v) el.setAttribute("href", v);
      });
      document.querySelectorAll("[data-cms-list]").forEach((box) => {
        const arr = get(box.getAttribute("data-cms-list"));
        const tpl = templates[box.getAttribute("data-cms-tpl")];
        if (!Array.isArray(arr) || !tpl) return;
        const frag = document.createDocumentFragment();
        arr.forEach((item, i) => { try { frag.appendChild(tpl(item, i)); } catch (_) {} });
        if (frag.childNodes.length) { box.textContent = ""; box.appendChild(frag); }
      });
    })
    .catch(() => {/* keep HTML defaults */});
})();
