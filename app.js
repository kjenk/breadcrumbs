// dh@foursquare.com @octopi

var fs = require('fs');

var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , twilio = require('twilio'); 

// required for heroku
// io.configure(function () { 
//   io.set("transports", ["xhr-polling"]); 
//   io.set("polling duration", 10); 
// });

var accountSid = 'AC71b7fa31feefaf648cda86b85d68fe2d';
var authToken = 'c6195524b11918be9586a42d407b605f';
var client = new twilio.RestClient(accountSid, authToken);

server.listen(8080);
var datastore = {};

// phone number to send to
app.use(express.bodyParser());




app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.get('/track/:uid', function (req, res) {
    var uid = req.params.uid;
    uid = uid.replace(/</g, '');
    uid = uid.replace(/>/g, '');
    uid = uid.replace(/&/g, '');
    console.log(uid);
    fs.readFile(__dirname + '/track.html', function(err, data) {
        res.send((data + '').replace("theirs", uid));
    });
});

app.use('/libs', express.static(__dirname + '/libs'));

io.sockets.on('connection', function (socket) {
    // add back later to uid: Math.random.toString() + ':' + 
    var uid = (new Date()).getTime().toString();

    var datatimeout;
    var listentimeout;
    socket.emit('news', { 'uid': uid });

    var hostname;

    // socket.on('hostname_to_server', function (data) {
    //     hostname = data.name;
    // });

    socket.on('location_from_sender', function (data) {
        console.log('sender location: ' + JSON.stringify(data));
        datastore[uid] = data;

        clearTimeout(datatimeout);
        datatimeout = setTimeout(function() {
            console.log('cleaning up ' + uid);
            if (uid in datastore) {
                delete datastore[uid];
            }
        }, 3600 * 1000);
    });
    socket.on('listen', function (their_uid) {
        console.log('listen: ' + their_uid);
        listentimeout = setInterval(function() {
            socket.emit('location', datastore[their_uid])
        }, 1000);
    });

    socket.on('disconnect', function() {
        clearInterval(listentimeout);
    });

    app.post('/textmsg', function(req, res) {
        var phonenumber = req.body.phone;
        var senderName = req.body.senderName
        var uid = req.body.uid;
        console.log(phonenumber);


        client.sms.messages.create({
            to:'+1' + phonenumber,
            from:'+16035383594',
            body:'follow ' + senderName + '\'s crumbs: http://158.130.108.53:8080/track/' + uid
        }, function(error, message) {
            if (!error) {
                console.log('Success! The SID for this SMS message is:');
                console.log(message.sid);

                console.log('Message sent on:');
                console.log(message.dateCreated);
            }
        else {
            console.log('Oops! There was an error.');
        }
    });
    });

});

