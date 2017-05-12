FROM node:7

ENV PORT 8888

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app

# Install app dependencies
RUN npm install

EXPOSE ${PORT}

CMD [ "node", "index.js" ]