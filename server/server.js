var HTTPS_PORT = 8443;

var fs = require('fs');
var https = require('https');
var WebSocketServer = require('ws').Server;


var erizo = require('../../licode/erizoAPI/build/Release/addon');


var wrtc = new erizo.WebRtcConnection(true,true,'stun:stun.l.google.com:19302',0,0,0,false);


var CONN_INITIAL = 101, CONN_STARTED = 102,CONN_GATHERED = 103, CONN_READY = 104, 
    CONN_FINISHED = 105, CONN_CANDIDATE = 201, CONN_SDP = 202, CONN_FAILED = 500;


// Yes, SSL is required
var serverConfig = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
};

// ----------------------------------------------------------------------------------------

// Create a server for the client html page
var handleRequest = function(request, response) {
    // Render the single client html file for any request the HTTP server receives
    console.log('request received: ' + request.url);

    if(request.url == '/') {
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end(fs.readFileSync('client/index.html'));
    } else if(request.url == '/webrtc.js') {
        response.writeHead(200, {'Content-Type': 'application/javascript'});
        response.end(fs.readFileSync('client/webrtc.js'));
    } else if(request.url == '/adapter-latest.js') {
        response.writeHead(200, {'Content-Type': 'application/javascript'});
        response.end(fs.readFileSync('client/adapter-latest.js'));
    }


};

var httpsServer = https.createServer(serverConfig, handleRequest);
httpsServer.listen(HTTPS_PORT, '0.0.0.0');

// ----------------------------------------------------------------------------------------

// Create a server for handling websocket calls
var wss = new WebSocketServer({server: httpsServer});


var local_uuid = uuid();


wss.on('connection', function(ws) {
    ws.on('message', function(message) {
        // Broadcast any received message to all clients
        console.log('received: %s', message);
        var data = JSON.parse(message);

        // ice
        if (data.ice){

            console.log('ice',data.ice);

            wrtc.addRemoteCandidate(data.ice.sdpMid,data.ice.sdpMLineIndex,data.ice.candidate);

        }


        // sdp
        if(data.sdp){

            if(data.sdp.type == 'offer'){

                wrtc.setRemoteSdp(data.sdp.sdp);

                var localSdp = wrtc.getLocalSdp();


                var data = {uuid:local_uuid,sdp:{type:'answer',sdp:localSdp}};

                console.log('send local sdp',data);

                wss.broadcast(JSON.stringify(data));
                
            }

            if(data.sdp.type == 'answer'){

                console.log('answer','we should not be here');
    
            }
        
        }
    });
});

wss.broadcast = function(data) {
    for(var i in this.clients) {
        this.clients[i].send(data);
    }
};



// offer wrtc.setRemoteSdp(msg.sdp);
// candidate  wrtc.addRemoteCandidate                                                
// 



wrtc.init(function(newStatus,mess){


    console.log('newStatus==================',newStatus);
    console.log('message====================',mess);


    switch(newStatus){
       
        case CONN_INITIAL:
            console.log("initial");
            break;
       
        case CONN_SDP:
        case CONN_GATHERED:
       
            console.log("sending sdp:",mess);
            break;
       
        case CONN_CANDIDATE:       
            console.log('candidate:',mess);
            console.log('we need send this candidate');
            break;
       
        case CONN_FAILED:
       
            console.log('failed:',mess);
            break;
       
       
        case CONN_READY:
       
            console.log('ready:',mess);
       
            break;
       
    } 


});


function uuid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}


console.log('Server running. Visit https://localhost:' + HTTPS_PORT + ' in Firefox/Chrome (note the HTTPS; there is no HTTP -> HTTPS redirect!)');
