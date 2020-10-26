const express = require('express')
const ejs = require("ejs")
const http = require('http')
const path = require('path')
const bodyParser = require('body-parser')
const { v4: uuidV4 } = require('uuid')

const app = express()

const users = []

const httpServer = http.createServer(app)
const io = require('socket.io')(httpServer)

app.use(express.static(path.join(__dirname, "/public")))
app.use(express.static(path.join(__dirname, '/node_modules')))


app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.render("index", { room_id: uuidV4(), info: "", existing_roomId: "" });
    // res.redirect(`/${uuidV4()}`)
})

app.post("/", (req, res) => {
    const name = req.body.name;
    const room = req.body.roomId;

    const userExist = users.find(user => user === name)
    if (userExist) {
        res.render("index", { room_id: uuidV4(), info: "username already exist", existing_roomId: "" })
    } else {
        res.redirect(`/meeting?name=${name}&room=${room}`)
    }

})


app.get("/meeting", (req, res) => {
    const name = req.query.name;
    const room = req.query.room;
    const userExist = users.find(user => user === name)
    if (userExist) {
        res.render("index", { existing_roomId: room, room_id: uuidV4(), info: "" })
    } else {
        users.push(name)
        res.render("room", { username: name, roomId: room })
    }
})


peers = {}

io.on('connect', (socket) => {
    socket.on('join-room', (roomId, username) => {

        if (peers[roomId]) {
            peers[roomId][socket.id] = {}
        } else {
            peers[roomId] = {}
            peers[roomId][socket.id] = {}
        }

        peers[roomId][socket.id] = socket

        for (let id in peers[roomId]) {
            if (id === socket.id) continue
            peers[roomId][id].emit('initReceive', socket.id)
        }


        socket.on('signal', data => {
            if (!peers[roomId][data.socket_id]) return
            peers[roomId][data.socket_id].emit('signal', {
                socket_id: socket.id,
                signal: data.signal
            })
        })


        socket.on('disconnect', () => {

            var index = users.indexOf(username)
            if (index > -1) {
                users.splice(index, 1)
            }
            socket.broadcast.emit('removePeer', socket.id)
            delete peers[roomId][socket.id]
        })


        socket.on('initSend', init_socket_id => {
            peers[roomId][init_socket_id].emit('initSend', socket.id)
        })

        socket.join(roomId)

        socket.on('message', (message) => {
            //send message to the same room
            io.to(roomId).emit('createMessage', message, username)
        });
    })
})


const port = process.env.PORT || 3000

httpServer.listen(port, (req, res) => {
    console.log(`Server is running at port ${port}`);
})