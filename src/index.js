const path = require('path')
const http = require('http')
const express = require('express')
// const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = require('socket.io')(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket) => {
    console.log('New WebSocket connection')

    socket.on('join', (options, callback) => {
        try {
            const { error, user } = addUser({ id: socket.id, ...options })

            if (error) {
                throw new Error(error)
            }

            socket.join(user.room)

            socket.emit('message', generateMessage('Admin', 'Welcome!'))
            socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })

            callback()
        } catch (error) {
            callback(error.message)
        }
    })

    socket.on('sendMessage', (message, callback) => {
        try {
            const user = getUser(socket.id)
            const filter = new Filter()

            if (filter.isProfane(message)) {
                throw new Error('Profanity is not allowed!')
            }

            io.to(user.room).emit('message', generateMessage(user.username, message))
            callback()
        } catch (error) {
            callback(error.message)
        }
    })

    socket.on('sendLocation', (coords, callback) => {
        try {
            const user = getUser(socket.id)
            io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
            callback()
        } catch (error) {
            callback(error.message)
        }
    })

    // Agregar un evento 'typing' al servidor
    socket.on('typing', () => {
        try {
            const user = getUser(socket.id)
            socket.broadcast.to(user.room).emit('typing', user.username)
        } catch (error) {
            console.error(error)
        }
    })

    socket.on('disconnect', () => {
        try {
            const user = removeUser(socket.id)

            if (user) {
                io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
                io.to(user.room).emit('roomData', {
                    room: user.room,
                    users: getUsersInRoom(user.room)
                })
            }
        } catch (error) {
            console.error(error)
        }
    })
})

server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})
