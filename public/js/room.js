let message = document.getElementById("chat_message");
let ul = document.querySelector("ul");



const socket = io();

let myStream = null;

let peers = {}



let constraints = {
    audio: true,
    video: true
}

// let constraints = {
//     audio: {
//         echoCancellation: true,
//         noiseSuppression: true,
//         sampleRate: 44100
//     },
//     video: true
// }


navigator.mediaDevices.getUserMedia(constraints).then(stream => {
    myVideo.srcObject = stream;
    myStream = stream;

    init()

}).catch(e => alert(`getusermedia error ${e.name}. Try enabling your camera and microphone`))


function init() {

    socket.emit('join-room', ROOM_ID, NAME)


    socket.on('initReceive', socket_id => {
        addPeer(socket_id, false)

        socket.emit('initSend', socket_id)
    })

    socket.on('initSend', socket_id => {
        addPeer(socket_id, true)
    })

    socket.on('removePeer', socket_id => {
        removePeer(socket_id)
    })

    socket.on('disconnect', () => {
        for (let socket_id in peers) {
            removePeer(socket_id)
        }
    })

    socket.on('signal', data => {
        peers[data.socket_id].signal(data.signal)
    })


}


function removePeer(socket_id) {

    let videoEl = document.getElementById(socket_id)
    if (videoEl) {

        const tracks = videoEl.srcObject.getTracks();

        tracks.forEach(function (track) {
            track.stop()
        })

        videoEl.srcObject = null
        videoEl.parentNode.removeChild(videoEl)
    }
    if (peers[socket_id]) peers[socket_id].destroy()
    delete peers[socket_id]
}


function addPeer(socket_id, am_initiator) {
    peers[socket_id] = new SimplePeer({
        initiator: am_initiator,
        stream: myStream,
    })

    peers[socket_id].on('signal', data => {
        socket.emit('signal', {
            signal: data,
            socket_id: socket_id
        })
    })

    peers[socket_id].on('stream', stream => {
        let newUserVideo = document.createElement('video')
        newUserVideo.srcObject = stream
        newUserVideo.id = socket_id
        newUserVideo.playsinline = false
        newUserVideo.controls = true
        newUserVideo.autoplay = true
        // newUserVideo.muted = true
        newUserVideo.className = "vid"
        videos.appendChild(newUserVideo)
    })
}



// chat code
document.addEventListener("keydown", (e) => {
    if (e.code === "Enter" && message.value.trim() !== "") {
        socket.emit("message", message.value)
        message.value = '';
    }

})

document.querySelector(".fa-paper-plane").addEventListener("click", (e) => {
    if (message.value.length !== 0) {
        socket.emit("message", message.value)
        message.value = '';
    }

})


socket.on("createMessage", (message, username) => {

    if (document.querySelector(".main__right").style.display === "none") {
        document.querySelector(".chat_count").style.display = "block";
        document.querySelector(".chat_count").innerText = ++chat_count;
    }
    var li_node = document.createElement("LI");                 // Create a <li> node
    li_node.innerHTML = `<strong>${username}</strong><br><p>${message}</p>`
    ul.appendChild(li_node);

    if (username === NAME) {
        li_node.classList.add("message__user");
        li_node.classList.add("message__userCard");

    } else {
        li_node.classList.add("message__other");
        li_node.classList.add("message__guestCard");
    }

    scrollToBottom()

})

const scrollToBottom = () => {
    var d = document.querySelector('.main__chat_window');
    d.scrollTop = d.scrollHeight;
}







// Enable screen share

function setScreen() {
    navigator.mediaDevices.getDisplayMedia().then(stream => {
        toggleVid()
        // document.querySelector(".screen_sharing").style.display = "block";
        return stream;
    })
        .then(stream => {
            const screenTrack = stream.getTracks()[0];
            // console.log("stream.getTracks() ", stream.getTracks())
            for (let socket_id in peers) {
                // console.log("peers[socket_id].streams[0].getTracks() ", peers[socket_id].streams[0].getTracks())
                for (let index in peers[socket_id].streams[0].getTracks()) {
                    for (let index2 in stream.getTracks()) {
                        if (peers[socket_id].streams[0].getTracks()[index].kind === stream.getTracks()[index2].kind) {
                            peers[socket_id].replaceTrack(peers[socket_id].streams[0].getTracks()[index], stream.getTracks()[index2], peers[socket_id].streams[0])
                            break;
                        }
                    }
                }

            }



            screenTrack.onended = function () {
                console.log("ended")
                // document.querySelector(".screen_sharing").style.display = "none";
                navigator.mediaDevices.getUserMedia(constraints).then(stream => {
                    for (let socket_id in peers) {
                        for (let index in peers[socket_id].streams[0].getTracks()) {
                            for (let index2 in stream.getTracks()) {
                                if (peers[socket_id].streams[0].getTracks()[index].kind === stream.getTracks()[index2].kind) {
                                    console.log("entered")
                                    peers[socket_id].replaceTrack(peers[socket_id].streams[0].getTracks()[index], stream.getTracks()[index2], peers[socket_id].streams[0])
                                    break;
                                }
                            }
                        }

                    }
                    myStream = stream
                    myVideo.srcObject = myStream
                }).catch(function (error) {
                    console.log(error);
                });

            }

        })
}


/**
 * Enable/disable video
 */
function toggleVid() {
    for (let index in myStream.getVideoTracks()) {
        myStream.getVideoTracks()[index].enabled = !myStream.getVideoTracks()[index].enabled
        // vidButton.innerText = myStream.getVideoTracks()[index].enabled ? "Video Enabled" : "Video Disabled"
    }
}

