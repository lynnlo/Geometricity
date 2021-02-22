const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const path = require("path");
const random = require("random");
const fs = require("fs")

var dir = path.join(__dirname, "client");
var rooms = {};

var words = JSON.parse(fs.readFileSync("words.json"));

app.use(express.static(dir));

http.listen(3000, function () {
    console.log("Starting on port : " + 3000);
	console.log("http://localhost:3000");
})

io.on("connect", (socket) => {

	socket.on("disconnect", () => {
		if (socket.room){
			rooms[socket.room].players.splice(rooms[socket.room].players.indexOf(socket.name), 1);
			rooms[socket.room].sockets.splice(rooms[socket.room].sockets.findIndex((x) => {return x.id == socket.id}), 1);

			if (rooms[socket.room].drawer.id == socket.id){
				io.to(socket.room).emit("reset-game");
				rooms[socket.room].info = "Waiting for more players...";
				io.to(socket.room).emit("update-info", rooms[socket.room].info);
			}

			io.to(socket.room).emit("all-players", [...rooms[socket.room].players]);
		} 
	})

	socket.on("create-request", (name, id) => {
		if (!(id in rooms)) {
			rooms[id] = {
			id: id,
			sockets: [
				{
					id: socket.id,
					name: name,
					socket: socket,
				}
			],
			players: [
				name,
			],
			info: "Waiting for more players...",
			word: "",
			drawer: {},
			points: {},
		}

		console.log(rooms);
		socket.room = id;
		socket.name = name;

		socket.join(id);
		socket.emit("create-success", id, name);
		io.to(id).emit("update-info", rooms[id].info);
		io.to(id).emit("all-players", [...rooms[id].players]);

		}
		else {
			socket.emit("connection-failed")
		}
	})

	socket.on("join-request", (name, id) => {
		if ((id in rooms) && (rooms[id].players.indexOf(name) == -1)) {
			rooms[id].sockets.push({
				id : socket.id,
				name : name,
				socket : socket,
			})

			rooms[id].players.push(name);
			console.log(rooms);
			socket.room = id;
			socket.name = name;

			socket.join(id);
			socket.emit("join-success", id, name);
			io.to(id).emit("all-players", [...rooms[id].players]);

			if (rooms[id].players.length >= 2){
				rooms[id].info = "Game starting...";
				io.to(id).emit("update-info", rooms[id].info);

				setTimeout(() => {
					drawer = rooms[id].sockets[random.int(0, rooms[id].players.length - 1)];
					rooms[id].drawer = drawer;
					
					list = [];
					for (i=0;i<4;i++){
						word = words.math[random.int(0, words.math.length - 1)];
						if (!list.find((x) => {return x == word})){
							list.push(word);
						}
						else {
							i -= 1;
						}
					}
					
					rooms[id].word = list[random.int(0, list.length - 1)];
					rooms[id].drawer.socket.to(id).emit("update-info", "Game has started!")
					rooms[id].drawer.socket.emit("update-info", "Your word is : "+rooms[id].word+".");
					
					console.log(list);
					io.to(id).emit("start-game", drawer.name, list);
				}, 500)
			}
		}
		else {
			socket.emit("connection-failed");
		}
	})

	socket.on("update-canvas", (data) => {
		if (rooms[socket.room].drawer.id == socket.id){
			socket.to(socket.room).emit("update-canvas", data);
		}
	})
})