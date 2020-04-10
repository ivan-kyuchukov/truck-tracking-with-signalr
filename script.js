function onAPILoad() {

    $.ajax({
        url: 'https://apimgmt-shareddev-api-01.azure-api.net/tracking/?api-version=1.0&truckNo=108&startDate=2019-12-18&endDate=2019-12-18&customerId=d30c4212e520ad38afea9f1e&orderId=0428c4bf4d8cfcafbe4a3c31&deliveryTicketId=52997dd5f5b42e98874504fa&geoJsonOnly=True',
        contentType: "application/json",
        dataType: 'json',
        success: (data) => main(data)
    });
}

function main(path) {

    let first_coords = getMinCoords(path);
    let last_coords = getMaxCoords(path);
    
    // Transform the coords to a Google LatLng array 
    let latLngArr = [];
    for (let i=0; i < path.length; i++) {
        latLngArr.push(
            new google.maps.LatLng(path[i][1], path[i][0]) // Latitude and Longitude are swapped in the TT API
        )
    }

    // Get the center of the route
    let bounds = new google.maps.LatLngBounds();
    latLngArr.map((x) => bounds.extend(x));
    let center = bounds.getCenter();

    let map = initMap(center)

    // Draw the truck path
    drawPolyline(latLngArr, map)

    // Delivery address comming from the Delivery Ticket API
    let deliveryAddress = '46396 Nygård, Sweden';

    // Or we can directly pass coordinates and the function handles them as well
    // let deliveryAddress = {
    //     lat: 57.960142,
    //     lng: 12.121977
    // }

    // Get the coordinates from the Google API and draw the remaining path
    ensureDestinationCoords(deliveryAddress)
        .then((destination) => {
            drawRoute(last_coords, destination, map);
        });
}

function initMap(coords) {
    let options = {
        center: coords,
        zoom: 12
    };

    return new google.maps.Map(document.getElementById('map'), options);
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