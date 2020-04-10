"use strict";

// var connection = new signalR.HubConnectionBuilder()
//     .withUrl("http://localhost:5000/chatHub")
//     .configureLogging(signalR.LogLevel.Debug)
//     .build();

// connection.on("ReceiveCoords", (message) => {
//     main(message)
// });

// connection.start()
//     .then(() => {
//         connection
//             .invoke("SendMessage")
//             .catch(function (err) {
//                     console.error(err.toString());
//                 });
//     })
//     .catch((err) => {
//         console.error(err.toString());
//     });