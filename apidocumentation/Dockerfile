FROM node:6.10

ENV PORT 8888

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app

# Install app dependencies
RUN npm install

EXPOSE ${PORT}

CMD [ "node", "--max_old_space_size=3990", "index.js" ]