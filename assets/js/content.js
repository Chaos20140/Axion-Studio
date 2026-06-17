/* =========================================================
   CMS CONTENT LOADER
   Fills elements that carry a data-cms / data-cms-href hook
   from content/site.json (edited via Pages CMS). Defaults stay
   in the HTML, so if this file or the JSON ever fails to load,
   the page still shows the baked-in text (fail-safe + SEO-safe).

   SECURITY: text is written with textContent (never innerHTML),
   so edited content can only ever render as plain text — no markup
   or scripts can be injected through the CMS.
   ========================================================= */
(() => {
  fetch("content/site.json?ts=" + Date.now())
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no content"))))
    .then((data) => {
      const get = (path) =>
        path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), data);

      document.querySelectorAll("[data-cms]").forEach((el) => {
        const v = get(el.getAttribute("data-cms"));
        if (typeof v === "string") el.textContent = v;
      });
      // Only accept safe link schemes — a CMS-entered href can never become
      // javascript:/data: etc. (defense-in-depth; editor is trusted but cheap to guard).
      const SAFE_HREF = /^(https?:|mailto:|tel:|\/|#|\.)/i;
      document.querySelectorAll("[data-cms-href]").forEach((el) => {
        const v = get(el.getAttribute("data-cms-href"));
        if (typeof v === "string" && SAFE_HREF.test(v.trim())) el.setAttribute("href", v.trim());
      });
    })
    .catch(() => {/* keep HTML defaults */});
})();
