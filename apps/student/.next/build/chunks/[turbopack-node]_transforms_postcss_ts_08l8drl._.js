module.exports = [
"[turbopack-node]/transforms/postcss.ts?config=[project]/apps/student/postcss.config.mjs { CONFIG => \"[project]/apps/student/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "chunks/node_modules_20v-8wl._.js",
  "chunks/[root-of-the-server]__1859np9._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[turbopack-node]/transforms/postcss.ts?config=[project]/apps/student/postcss.config.mjs { CONFIG => \"[project]/apps/student/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript)");
    });
});
}),
];