FROM node:22.5.1-alpine


LABEL maintainer="Sami Tech Team <tech@samisaude.com>"

ARG NPM_TOKEN=$NPM_TOKEN


# Set the working directory
WORKDIR /usr/src/app

# Copy package files and Prisma schema
COPY --chown=node:node package*.json .npmrc ./
COPY --chown=node:node prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm ci --omit=dev --ignore-scripts && \
    npx prisma generate && \
    npm cache clean --force

# Copy the rest of your app's source code
COPY . .

# Build the application
RUN npm run build

# Chown all the files to the node user
RUN chown -R node:node /usr/src

# Switch to 'node' user
USER node

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
