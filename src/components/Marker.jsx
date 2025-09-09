import ol from 'ol'
import { Component } from 'preact';
import markerImage from '../assets/glyph-marker-icon.png'

const defaultStyle = new ol.style.Style({
    image: new ol.style.Icon({
        anchor: [12, 41],
        anchorXUnits: 'pixels',
        anchorYUnits: 'pixels',
        src: markerImage
    })
});

export default class Marker extends Component {
    constructor(options) {
        super(options);

        const lngLat = options.lngLat;
        const map = options.map;
        
        const feature = this.feature = new ol.Feature({
            type: 'waypointMarker',
            geometry: new ol.geom.Point(ol.proj.fromLonLat(lngLat))
        });

        feature.setStyle(defaultStyle);

        this.layer = new ol.layer.Vector({
            updateWhileInteracting: true,
            source: new ol.source.Vector({
                features: [feature]
            })
        });
        this.layer.setZIndex(10);
        this.onDown = this.onDown.bind(this);
        this.drag = this.drag.bind(this);
        this.dragEnd = this.dragEnd.bind(this);
        this.setCoordinate = this.setCoordinate.bind(this);

        map.addLayer(this.layer);
        map.on('pointerdown', this.onDown, this);
    }
        
    componentDidUpdate(prevProps) {
        if (prevProps.lngLat.join(';') !== this.props.lngLat.join(';')) {
            this.feature.getGeometry().setCoordinates(ol.proj.fromLonLat(this.props.lngLat));
        }
    }

    componentWillUnmount () {
        const map = this.props.map;
        map.removeLayer(this.layer);
        map.un('pointerdrag', this.drag, this);
        map.un('pointerdown', this.onDown, this);
        map.un('pointerup', this.dragEnd, this);
    }

    onDown (e) {
        let foundFeatures = false;
        const map = this.props.map;
        map.forEachFeatureAtPixel(e.pixel, (feature, layer) => {
            if (layer === this.layer) {
                map.on('pointerdrag', this.drag, this);
                map.once('pointerup', this.dragEnd, this);
                foundFeatures = true;
            }
        });

        if (foundFeatures) {
            return false;
        }
    }

    drag (e) {
        this.setCoordinate(e.coordinate);
        const event = new CustomEvent('drag', {detail: { lngLat: ol.proj.toLonLat(e.coordinate) }});
        this.props.ondrag(event);
    };

    dragEnd (e) {
        const map = this.props.map;
        map.un('pointerdrag', this.drag, this);
        const event = new CustomEvent('dragend', {detail: { lngLat: ol.proj.toLonLat(e.coordinate) }});
        this.props.ondragend(event);
    };

    setCoordinate (coordinate) {
        this.feature.getGeometry().setCoordinates(coordinate);
    };
}