FROM node:20.12.0

LABEL maintainer="Sami Tech Team <tech@samisaude.com>"

ARG NPM_TOKEN=$NPM_TOKEN

WORKDIR /usr/src/app

RUN apt-get update \
  && apt-get install -y wget gnupg \
  && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json .npmrc ./

# Install package dependencies
RUN npm install

# Copy the rest of your app's source code from your host to your image filesystem.
COPY . .

# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
# RUN node node_modules/puppeteer/install.mjs

# Generate Prisma client
## if target on development enviroment , doesn't use generate
RUN npx prisma generate  

# Open the mapped port
EXPOSE 3000

CMD ["npm", "run", "start"]