FROM node:20-alpine AS deps
WORKDIR /app 
RUN apk add --no-cache libc6-compat 
COPY package.json package-lock.json* ./ 
RUN npm ci 

FROM node:20-alpine AS builder 
WORKDIR /app 
COPY --from=deps /app/node_modules ./node_modules 
COPY . .
RUN mkdir -p public 
RUN npm run build
 
FROM node:20-alpine AS runner 
WORKDIR /app 
ENV NODE_ENV=production 
RUN apk add --no-cache curl 
COPY --from=builder /app/public ./public 
COPY --from=builder /app/.next ./.next 
COPY --from=builder /app/node_modules ./node_modules 
COPY --from=builder /app/package.json ./package.json 
EXPOSE 3000 
ENV PORT=3000 
CMD ["npm", "run", "start"]
