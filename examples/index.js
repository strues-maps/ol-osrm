var map = new ol.Map({
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ],
    target: 'map',
    view: new ol.View({
        center: ol.proj.fromLonLat([11.94, 57.7]),
        zoom: 12
    })
}); 

var waypoints = [
    [11.94, 57.74],
    [11.949, 57.6792]
];

var geocoder = {
    geocode: (input, callback) => {
        callback(
            [
                {name: 'a', center: {lng: 11.95, lat: 57.74}},
                {name: 'b', center: {lng: 11.96, lat: 57.74}},
                {name: 'c', center: {lng: 11.97, lat: 57.74}},
            ]
        )
    },
    reverse: (latLng, size, callback) => {
        callback([{name: 'place at '+latLng.lng+';'+latLng.lat, center: {lng: latLng.lng, lat: latLng.lat}}])
    }
};

var control = new olrm.Control({
    map: map,
    waypoints: waypoints,
    //geocoder: geocoder,
});

map.addControl(control);
