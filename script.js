function onAPILoad() {

    // $.ajax({
    //     url: 'https://apimgmt-shareddev-api-01.azure-api.net/tracking/?api-version=1.0&truckNo=108&startDate=2019-12-18&endDate=2019-12-18&customerId=d30c4212e520ad38afea9f1e&orderId=0428c4bf4d8cfcafbe4a3c31&deliveryTicketId=52997dd5f5b42e98874504fa&geoJsonOnly=True',
    //     contentType: "application/json",
    //     dataType: 'json',
    //     success: (data) => main(data)
    // });

    var sigRconnection = new signalR.HubConnectionBuilder()
        .withUrl("http://localhost:5000/chatHub")
        .configureLogging(signalR.LogLevel.Debug)
        .build();

    sigRconnection.start()
        .then(() => {
            sigRconnection
                .invoke("SendMessage")
                .catch(function (err) {
                        console.error(err.toString());
                    });
    })
    .catch((err) => {
        console.error(err.toString());
    });

    let receivedMessagesCount = 1;
    let map;
    let destination;

    sigRconnection.on("ReceiveCoords", (message) => {
        
        // Transform the coords to a Google LatLng array 
        let latLngArr = [];
        for (let i=0; i < message.length; i++) {
            latLngArr.push(
                new google.maps.LatLng(message[i][1], message[i][0]) // Latitude and Longitude are swapped in the TT API
            )
        }

        let first_coords = getMinCoords(message);
        let last_coords = getMaxCoords(message);
        
        if(receivedMessagesCount == 1) {

            initMap(new google.maps.LatLng(message[0][1], message[0][0]))
                .then((data) => {
                    //console.error('HERE', data)
                    map = data;
                });

            // Delivery address comming from the Delivery Ticket API
            let deliveryAddress = '46396 Nygård, Sweden';

            // Get the coordinates from the Google API and draw the remaining path
            ensureDestinationCoords(deliveryAddress)
                .then((data) => {
                    destination = data;
                    // drawRoute(last_coords, data, map);
                });
        }
        receivedMessagesCount++;

        // Draw the truck path
        drawPolyline(latLngArr, map)

        drawRoute(last_coords, destination, map);

        console.log('latLngArr', latLngArr, map)
    });
}

function main(path, map) {

    let first_coords = getMinCoords(path);
    let last_coords = getMaxCoords(path);
    

    // // Get the center of the route
    // let bounds = new google.maps.LatLngBounds();
    // latLngArr.map((x) => bounds.extend(x));
    // let center = bounds.getCenter();


    
}

function initMap(coords) {
    console.log('initMap', coords)
    return new Promise((resolve) => {
        let options = {
            center: coords,
            zoom: 12
        };

        let map = new google.maps.Map(document.getElementById('map'), options);
        resolve(map);
    });
}

function drawMarkers(markers, map) {
    for(let i = 0; i < markers.length; i++) {
        new google.maps.Marker({
            position: markers[i], 
            map: map
        });
    }
}

function drawPolyline(path, map) {
    var polyline = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2
    });

    polyline.setMap(map);
}

function getMinCoords(path) {
    let lat = path.map(function (p) { return p[0] });
    let lng = path.map(function (p) { return p[1] });

    return {
        lat: Math.min.apply(null, lng),
        lng: Math.min.apply(null, lat)
    }
}

function getMaxCoords(path) {
    let lat = path.map(function (p) { return p[0] });
    let lng = path.map(function (p) { return p[1] });

    return {
        lat: Math.max.apply(null, lng),
        lng: Math.max.apply(null, lat)
    }
}

function ensureDestinationCoords(destination) {
    if(typeof destination == 'string') {
        return geocodeAddress(destination)
    }
    else {
        return new Promise((resolve) => { 
            resolve(destination) 
        });
    }
}

function drawRoute(origin, destination, map) {
    let request = {
        origin: new google.maps.LatLng(origin),
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING
    }

    var directionsService = new google.maps.DirectionsService();

    let rendererOptions = getRendererOptions();
    var directionsRenderer = new google.maps.DirectionsRenderer(rendererOptions);
    directionsRenderer.setMap(map);

    directionsService.route(request, (response, status) => {
        if (status == google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(response);
            
            var estimationInfo = new google.maps.InfoWindow();
            var iwContent = response['routes'][0].legs[0].distance.text + '<br />' + response['routes'][0].legs[0].duration.text;
            
            estimationInfo.setContent(iwContent);

            let bounds = new google.maps.LatLngBounds();
            [origin, destination].map((x) => bounds.extend(x));

            // google.maps.event.addListener(polylineDotted, 'click', function (event) {
            //     estimationInfo.setPosition(event.latLng);
            //     estimationInfo.open(map, this);
            // });
            
            estimationInfo.setPosition(bounds.getCenter());
            estimationInfo.open(map);
        }
        else {
            console.log("directionsService RESPONSE STATUS", status)
            console.log("directionsService RESPONSE ERROR", response)
        }
    });
}

function geocodeAddress(address) {
    return new Promise((resolve) => {
        var geocoder = new google.maps.Geocoder();
        geocoder.geocode({'address': address}, (response, status) => {
            if (status === 'OK') {
                resolve(response[0].geometry.location);
            } else {
                console.log("geocoder RESPONSE STATUS", status)
                console.log("geocoder RESPONSE ERROR", response)
            }
        });
    });
}

function getRendererOptions() {
    var lineSymbol = {
        path: google.maps.SymbolPath.CIRCLE,
        fillOpacity: 1,
        scale: 3
    };

    var polylineDotted = {
        strokeColor: '#0eb7f6',
        strokeOpacity: 0,
        fillOpacity: 0,
        icons: [{
            icon: lineSymbol,
            offset: '0',
            repeat: '10px'
        }],
    };

    var rendererOptions = {
        suppressMarkers: false,
        polylineOptions: polylineDotted
    };

    return rendererOptions;
}