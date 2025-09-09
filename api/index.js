// servidor-voz/api/index.js

const http = require('http');
const { Server } = require("socket.io");
const { v4: uuidv4 } = require('uuid');

const channels = {};

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Servidor de voz online');
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  socket.emit('session_code', socket.id);

  socket.on('join-channel', (channelCode) => {
    if (socket.currentChannel) {
      socket.leave(socket.currentChannel);
      if (channels[socket.currentChannel]) {
        delete channels[socket.currentChannel][socket.id];
        updateChannelUsers(socket.currentChannel);
      }
    }
    
    socket.join(channelCode);
    socket.currentChannel = channelCode;

    const alias = uuidv4().split('-')[0];
    
    if (!channels[channelCode]) {
      channels[channelCode] = {};
    }
    channels[channelCode][socket.id] = { id: socket.id, alias: alias };
    
    updateChannelUsers(channelCode);
  });

  socket.on('audio-chunk', (data) => {
    if (socket.currentChannel) {
      socket.to(socket.currentChannel).emit('audio-chunk', data);
    }
  });

  socket.on('disconnect', () => {
    if (socket.currentChannel && channels[socket.currentChannel]) {
      delete channels[socket.currentChannel][socket.id];
      updateChannelUsers(socket.currentChannel);
    }
  });
});

function updateChannelUsers(channelCode) {
    if (channels[channelCode]) {
        const users = Object.values(channels[channelCode]);
        io.to(channelCode).emit('channel_users', users);
    }
}

module.exports = server;