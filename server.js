// servidor-voz/server.js

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});
const { v4: uuidv4 } = require('uuid');

const PORT = 3000;

// Objeto para almacenar los usuarios de cada canal
const channels = {};

// Función para obtener y enviar la lista de usuarios de un canal
function updateChannelUsers(channelCode) {
    if (channels[channelCode]) {
        const users = Object.values(channels[channelCode]);
        io.to(channelCode).emit('channel_users', users);
    }
}

io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);
    socket.emit('session_code', socket.id);

    socket.on('join-channel', (channelCode) => {
        if (socket.currentChannel) {
            socket.leave(socket.currentChannel);
            // Si el usuario deja un canal, lo eliminamos de la lista de ese canal
            if (channels[socket.currentChannel]) {
                delete channels[socket.currentChannel][socket.id];
                updateChannelUsers(socket.currentChannel);
            }
        }
        
        socket.join(channelCode);
        socket.currentChannel = channelCode;

        // Generar un alias aleatorio para el usuario
        const alias = uuidv4().split('-')[0]; // Un alias corto y aleatorio
        
        // Añadir el usuario al objeto del canal
        if (!channels[channelCode]) {
            channels[channelCode] = {};
        }
        channels[channelCode][socket.id] = { id: socket.id, alias: alias };
        
        console.log(`Usuario ${socket.id} (Alias: ${alias}) se unió al canal ${channelCode}`);
        
        // Enviar la lista actualizada de usuarios a todos en el canal
        updateChannelUsers(channelCode);
    });

    socket.on('audio-chunk', (data) => {
        if (socket.currentChannel) {
            socket.to(socket.currentChannel).emit('audio-chunk', data);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Un usuario se ha desconectado: ${socket.id}`);
        // Si el usuario se desconecta, lo eliminamos de la lista del canal
        if (socket.currentChannel && channels[socket.currentChannel]) {
            delete channels[socket.currentChannel][socket.id];
            updateChannelUsers(socket.currentChannel);
        }
    });
});

http.listen(PORT, () => {
    console.log(`Servidor de voz escuchando en http://localhost:${PORT}`);
});