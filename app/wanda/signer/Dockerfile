# 万达签名服务 · 自托管 (VPS / Docker)
FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs sign-core.js index_bg.wasm ./
ENV PORT=8787
EXPOSE 8787
CMD ["node", "server.mjs"]
