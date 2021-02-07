var config = {
    "title": "Radiosonde", // tab  name
    "start": {
        // "maxZoom": 16,
        "center": [47, 15],
        "zoom": 3,
        "attributionControl": true,
        "zoomControl": false
    },
    "about": {
        "title": "Radiosonde ascents for the masses!",
        "contents": "<p>see https://github.com/mhaberler/radiosonde</p>" 
    },
    "controls": {
        "zoom": {
            "position": "topleft"
        },
        "leafletGeocoder": {
            //https://github.com/perliedman/leaflet-control-geocoder
            "collapsed": false,
            "position": "topleft",
            "placeholder": "Search for a location",
            "type": "OpenStreetMap",
        },

        "bookmarks": {
            "position": "bottomright",
            "places": [{
                "latlng": [
                    46.991, 15.437
                ],
                "zoom": 12,
                "name": "Graz-Thalerhof",
                "id": "a148fa354ba3",
                "editable": true,
                "removable": true
            }]
        }
    },

    "activeTool": "filterWidget", // options are identify/coordinates/queryWidget
    "basemaps": [
		 'OpenStreetMap',
	  ],

    "tocCategories": [
        // {
        //     "name": "Available layers",
        //     "layers": ["paths"
        //     // , "paths", "countries"
        //     ]
        // },
    ],
    "projections": [{
        4269: '+proj=longlat +ellps=GRS80 +datum=NAD83 +no_defs '
    }],
    "highlightStyle": {
        "weight": 2,
        "opacity": 1,
        "color": 'white',
        "dashArray": '3',
        "fillOpacity": 0.5,
        "fillColor": '#E31A1C',
        "stroke": true
    },
    "layers": [
        // {
        // "id": "paths",
        // "name": "Paths",
        // "type": "geoJSON",
        // "cluster": true,
        // "showCoverageOnHover": false,
        // "minZoom": 12,
        // "url": "./data/theatres.geojson",
        // "icon": {
        //     "iconUrl": "./img/theater.png",
        //     "iconSize": [24,28]
        // },
        // "style": {
        // "stroke": true,
        // "fillColor": "#00FFFF",
        // "fillOpacity": 0.5,
        // "radius": 10,
        // "weight": 0.5,
        // "opacity": 1,
        // "color": '#727272',
        // },
        //   "visible": false,
        //   // "label": {
        //   // 	"name": "NAME",
        //   // 	"minZoom": 14
        //   // }
        // }
    ]
}
