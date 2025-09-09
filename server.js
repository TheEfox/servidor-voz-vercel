// servidor-voz/server.js

const express = require('express');
const app = express();
const http = require('http');
const { Server } = require("socket.io");
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3000; // Usa el puerto de Render o el 3000 local

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

const channels = {};

function updateChannelUsers(channelCode) {
    if (channels[channelCode]) {
        const users = Object.values(channels[channelCode]);
        io.to(channelCode).emit('channel_users', users);
    }
}

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

server.listen(PORT, () => {
    console.log(`Servidor de voz escuchando en el puerto ${PORT}`);
});