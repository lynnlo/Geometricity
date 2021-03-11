// Copyright 2021 Lynn O. All rights reserved

/// Define variables
var index
var game

var name_input
var id_input
var menu_button
var packages
var custom_words
var custom_use
var error

var players
var chat
var message
var send

var canvas
var room
var information
var points
var drawer
var choices
var clear
var lower
var higher
var size
var pen
var erase
var time
var link

var color_black
var color_white
var color_red
var color_green
var color_blue
var color_yellow
var color_teal
var color_magenta

var context
var socket

var audio_room_enter
var audio_room_leave
var audio_player_enter
var audio_player_leave
var audio_guess_correct
var audio_guess_incorrect
var audio_message_send
var audio_message_recieve

var draw = false;
var local_name;
var local_drawer = false;
var local_admin = false;

// Set PI
Math.PI = 3;

/// On load
function on_load() {
	// Define socket
	socket = io();

	/// Load elements
	index = document.getElementById("index");
	game = document.getElementById("game");

	name_input = document.getElementById("name_input");
	id_input = document.getElementById("id_input");
	menu_button = document.getElementById("menu_button");
	packages = document.getElementById("packages");
	custom_words = document.getElementById("custom_words");
	custom_use = document.getElementById("custom_use");
	error = document.getElementById("error");

	canvas = document.getElementById("canvas");
	room = document.getElementById("room")
	information = document.getElementById("information");
	points = document.getElementById("points");
	drawer = document.getElementById("drawer");
	link = document.getElementById("link");

	// Concat so I dont get errors
	choices = [...document.getElementsByClassName("choices")];

	color_black = document.getElementById("color_black");
	color_white = document.getElementById("color_white");
	color_red = document.getElementById("color_red");
	color_green = document.getElementById("color_green");
	color_blue = document.getElementById("color_blue");
	color_yellow = document.getElementById("color_yellow");
	color_teal = document.getElementById("color_teal");
	color_magenta = document.getElementById("color_magenta");

	players = document.getElementById("players");
	chat = document.getElementById("chat");
	message = document.getElementById("message")
	send = document.getElementById("send");

	time = document.getElementById("time");

	clear = document.getElementById("clear");
	lower = document.getElementById("lower");
	higher = document.getElementById("higher");
	size = document.getElementById("size");
	pen = document.getElementById("pen");
	erase = document.getElementById("erase");

	/// Load audio and set volumes
	audio_room_enter = new Audio("sounds/Room Enter.wav");
	audio_room_leave = new Audio("sounds/Room Leave.wav");
	audio_player_enter = new Audio("sounds/Player Joined.wav");
	audio_player_leave = new Audio("sounds/Player Leave.wav");
	audio_guess_correct = new Audio("sounds/Guess Correct.wav");
	audio_guess_incorrect = new Audio("sounds/Guess Incorrect.wav");
	audio_message_send = new Audio("sounds/Message Send.wav");
	audio_message_recieve = new Audio("sounds/Message Recieve.wav");

	// 100% is just too loud
	audio_room_enter.volume = 0.25;
	audio_room_leave.volume = 0.25;
	audio_player_enter.volume = 0.25;
	audio_player_leave.volume = 0.25;
	audio_guess_correct.volume = 0.25;
	audio_guess_incorrect.volume = 0.25;
	audio_message_send.volume = 0.25;
	audio_message_recieve.volume = 0.25;

	context = canvas.getContext("2d");

	// Clears error when an input is entered
	function key_press() {
		socket.emit("check", id_input.value, (response) => {
			error.style.display = "none";
			menu_button.style.display = "";
			if (response) {
				menu_button.onclick = join_game;
				menu_button.innerHTML = "Join Game";
				
				packages.style.display = "none";
			}
			else {
				menu_button.onclick = create_game;
				menu_button.innerHTML = "Create Game";

				packages.style.display = "";
			}
		})
		
		setTimeout(() => {
			if (menu_button.style.display == "none") {
				error.innerHTML = "No compatible server was found, please try again later."
				error.style.display = "";

				packages.style.display = "none";
			}
		}, 1000)
	}

	// Sends a create request when create button is pressed
	function create_game() {
		if (name_input.value && name_input.value.length >= 3) {
			if (id_input.value && id_input.value.length == 4) {
				socket.emit("create-request", name_input.value, id_input.value, custom_words.value, custom_use.value);
			}
			else {
				error.innerHTML = "Please enter a valid game ID!";
				error.style.display = "inherit";
			}
		}
		else {
			error.innerHTML = "Please enter a valid name of 3 or more characters!";
			error.style.display = "inherit";
		}
	}

	// Sends a join request when create button is join
	function join_game() {
		if (name_input.value && name_input.value.length >= 3) {
			if (id_input.value && id_input.value.length == 4) {
				socket.emit("join-request", name_input.value, id_input.value);
			}
			else {
				error.innerHTML = "Please enter a valid game ID!";
				error.style.display = "inherit";
			}
		}
		else {
			error.innerHTML = "Please enter a valid name of 3 or more characters!";
			error.style.display = "inherit";
		}
	}

	/// Set up
	if (decodeURIComponent(window.location.search).length > 0){
		q = decodeURIComponent(window.location.search).substring(1).split("+");
		
		q.forEach((x) => {
			s = x.split("=");
			if (s.length > 1){
				if (s[0] == "id"){
					id_input.value = s[1];
				}
				else if (s[0] == "name"){
					if (s[1] == "auto"){
						// Maybe add random names that aren't numbers in the future?
						name_input.value = Date.now().toString().slice(-6,-1)
					}
					else {
						name_input.value = s[1];
					}			
				}
			}
		})
	}

	key_press();
	custom_words.innerHTML = custom_words.innerHTML.trim();
	packages.style.display = "none";

	/// Canvas variables
	let pen_size = 1;
	let pen_color = "#050505";
	let eraser = false;

	/// Connection
	socket.on("disconnect", () => {
		audio_room_leave.play();
		window.location.reload();
	})

	socket.on("create-success", (id, name) => {
		index.style.display = "none";
		game.style.display = "";
		room.innerHTML = "Room ID : " + id;
		local_name = name;
		audio_room_enter.play();
		link.href = window.location.origin + "?id=" + id;
		link.innerHTML = window.location.origin + "?id=" + id;
	})

	socket.on("join-success", (id, name) => {
		index.style.display = "none";
		game.style.display = "";
		room.innerHTML = "Room ID : " + id;
		local_name = name;
		audio_room_enter.play();
		link.href = window.location.origin + "?id=" + id;
		link.innerHTML = window.location.origin + "?id=" + id;
	})

	socket.on("connection-failed", () => {
		error.innerHTML = "Game ID or name invalid or taken.";
		error.style.display = "";
		setTimeout(() => {key_press()}, 1000);
	})

	socket.on("start-game", (name, list) => {
		drawer.innerHTML = "Drawer : " + name;

		let i = 0;
		choices.forEach((x) => {
			x.innerHTML = list[i];
			i += 1;

			x.onclick = () => {
				socket.emit("guess", x.innerHTML, (correct) => {
					// Makes button green if correct and red otherwise
					if (correct == x.innerHTML) {
						choices.forEach((a) => {a.style.background = "#402020"});
						x.style.background = "#204020";
						audio_guess_correct.play();
					}
					else {
						choices.forEach((a) => {a.style.background = "#402020"});
						choices.forEach((a) => {
							if (a.innerHTML == correct){
								a.style.background = "#204020";
							}
						})
						audio_guess_incorrect.play();
					}
				})
				choices.forEach((a) => {a.disabled = true});
			}
		})

		if (name == local_name){
			drawer.innerHTML = "You are the drawer.";
			local_drawer = true;

			clear.disabled = false;
			higher.disabled = false;
			pen.disabled = false;
			erase.disabled = false;

			[...document.getElementsByClassName("color")].forEach((x) => {
				x.disabled = false;
			})
		}
		else {
			choices.forEach((x) => {
				x.disabled = false;
			})
		}
	})

	socket.on("reset-game", () => {
		// Resets every interface
		local_drawer = false;

		pen_size = 1;
		eraser = false;
		clear.disabled = true;
		higher.disabled = true;
		pen.disabled = true;
		erase.disabled = true;

		[...document.getElementsByClassName("color")].forEach((x) => {
			x.disabled = true;
		})

		size.innerHTML = pen_size + (eraser ? "E" : "");
		pen_color = "#050505";
		size.style.color = "#353535";

		context.clearRect(0, 0, canvas.width, canvas.height);

		choices.forEach((x) => {
			x.style.background = "";
			x.disabled = true;
		})
	})

	socket.on("update-admin", (admin) => {
		local_admin = admin;
	})

	let previous_player_length;
	socket.on("update-players", (names, scores, states) => {
		let board = "<br>";
		let lines = 0;

		// Why can't I use react for this??
		for (let i=0; i<names.length; i++){
			// Adds a kick button to all players if the player is an admin
			board += (local_admin ? "<button class='kicks' style='font-size: 100%'" + (names[i] == local_name ? "disabled='true'" : "") + "> Kick </button> "  : "") 
			
			// Adds a color to indicate player state
			board += "<p style='display:inline; ";
			board += (((states[i] == "correct") ? "color: #156515" : (states[i] == "incorrect" ? "color: #651515" : (states[i] == "drawer" ? "color: #156565" : "" )))) + "'>";

			// Display all player names
			board += (names[i] == local_name ? "<b>" + names[i] + "</b>" : names[i]) + " : " + scores[i] + "</p><br>";

			lines += 1;
		}

		for (lines; lines<30; lines++){
			board += "<br>";
		}

		players.innerHTML = board;
		
		// Sends the kick request to the server if their kick button is clicked
		[...document.getElementsByClassName("kicks")].forEach((x, i) => {
			x.onclick = () => {
				socket.emit("kick-request", names[i]);
			}
		})

		// Handles audio cues for player joins and leaves
		if (!previous_player_length){
			previous_player_length = names.length;
		}
		else if (previous_player_length < names.length) {
			audio_player_leave.play();
		}
		else if (previous_player_length > names.length) {
			audio_player_enter.play();
		}
		
		previous_player_length = names.length;
	})

	socket.on("update-info", (info) => {
		information.innerHTML = info;
	})

	socket.on("update-score", (score) => {
		points.innerHTML = "Points : " + score;
	})

	socket.on("update-canvas", (data) => {
		let image = new Image;
		image.src = data;
		image.onload = function () {
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.drawImage(image, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height);
		}
		delete image;
	})

	let previous_chat;
	socket.on("update-chat", (messages) => {
		let board = "<br>";
		let lines = 0;

		for (let i=0; i<messages.length; i++){
			board += messages[i][0] + " : " + messages[i][1] + "<br>";
			lines += 1;		
		}

		for (lines; lines<30; lines++){
			board += "<br>";
		}

		chat.innerHTML = board;
		
		// Handles audio cues for chat messasges
		if (!previous_chat){
			previous_chat = chat.innerHTML;
		}
		else if (previous_chat != chat.innerHTML){
			audio_message_recieve.play();
		}
		
		previous_chat = chat.innerHTML;
	})

	socket.on("time", (t) => {
		time.innerHTML = t + 1;
	})

	socket.on("kick", () => {
		audio_room_leave.play();
		window.location.reload();
	})

	// Calibration
	canvas.width = (document.body.clientWidth * 0.35);
	canvas.height = (canvas.width * (9 / 16));

	unit_size = 1 * (document.body.clientWidth / 500);
	unit = (n = 1) => { return n * unit_size };

	if (pen_size <= 1) {
		lower.disabled = "true";
	}
	else if (pen_size >= 8) {
		higher.disabled = "true";
	}

	// Start a path when mouse is down 
	canvas.addEventListener("mousedown", () => {
		if (local_drawer){
			draw = true;
			context.strokeStyle = (eraser ? "#353535" : pen_color);
			context.beginPath();
		}
	});

	// Adds a point to the path when mouse moves 
	canvas.addEventListener("mousemove", (e) => {
		if (local_drawer && draw) {
			context.lineTo(e.layerX, e.layerY);
			context.lineWidth = unit(pen_size + (eraser ? 3 : 0));
			context.stroke();

			// Send canvas
			socket.emit("update-canvas", canvas.toDataURL());
		}
		else {
			context.moveTo(e.layerX, e.layerY);
		}
	})

	// Close the path when the mouse is up 
	canvas.addEventListener("mouseup", () => {
		if (local_drawer){
			draw = false;
			context.closePath();
		}
	});

	// Close the path when the canvas loses focus
	canvas.addEventListener("mouseout", () => {
		if (local_drawer){
			draw = false;
			context.closePath();
		}
	});

	clear.onclick = () => {
		context.clearRect(0, 0, canvas.width, canvas.height);

		// Send canvas
		socket.emit("update-canvas", canvas.toDataURL());
	}

	/// Pensize
	lower.onclick = () => {
		pen_size -= 1;
		if (pen_size <= 1) {
			lower.disabled = "true";
		}
		if (pen_size < 8) {
			higher.disabled = "";
		}
		size.innerHTML = pen_size + (eraser ? "E" : "");
	}

	higher.onclick = () => {
		pen_size += 1;
		if (pen_size >= 8) {
			higher.disabled = "true";
		}
		if (pen_size > 1) {
			lower.disabled = "";
		}
		size.innerHTML = pen_size + (eraser ? "E" : "");
	}

	pen.onclick = () => {
		eraser = false;
		size.innerHTML = pen_size;
	}

	// Clears the canvas
	erase.onclick = () => {
		eraser = true;
		size.innerHTML = pen_size + "E";
	}

	/// Colors
	color_black.onclick = () => {
		pen_color = "#050505";
		size.style.color = "#353535";
	}

	color_white.onclick = () => {
		pen_color = "#aaaaaa";
		size.style.color = "#dddddd";
	}

	color_red.onclick = () => {
		pen_color = "#aa0505";
		size.style.color = "#dd3535";
	}

	color_green.onclick = () => {
		pen_color = "#05aa05";
		size.style.color = "#35dd35";
	}

	color_blue.onclick = () => {
		pen_color = "#0505aa";
		size.style.color = "#3535dd";
	}

	color_yellow.onclick = () => {
		pen_color = "#aaaa05";
		size.style.color = "#dddd35";
	}

	color_teal.onclick = () => {
		pen_color = "#05aaaa";
		size.style.color = "#35dddd";
	}

	color_magenta.onclick = () => {
		pen_color = "#aa05aa";
		size.style.color = "#dd35dd";
	}
	
	// Sends a chat message to the server on click
	send.onclick = () => {
		socket.emit("send-message", message.value);
		message.value = "";
		audio_message_send.play();
	}

	message.addEventListener("keypress", (k) => {
		if (k.key == "Enter"){
			socket.emit("send-message", message.value);
			message.value = "";
			audio_message_send.play();
		}
	})
}