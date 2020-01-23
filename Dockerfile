FROM node:12

RUN mkdir -p /srv
ADD . /srv
WORKDIR /srv

RUN cd /srv && \
    npm install

CMD ["npm", "start"]
