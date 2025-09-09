import ol from 'ol'
import { Component } from 'preact';
import {getLastWaypointIndexBefore} from '../utils'

export default class RouteLine extends Component {
    constructor(options) {
        super(options);

        const map = options.map;
        this.props.coords = options.route.coordinates.map(c => ol.proj.fromLonLat(c));
        this.state = {};
        this.style = this.getStyle(this.props.selected);

        this.line = new ol.Feature({
            type: 'route',
            geometry: new ol.geom.LineString(this.props.coords),
        });

        this.layer = new ol.layer.Vector({
            updateWhileInteracting: true,
            source: new ol.source.Vector({
                features: [this.line]
            }),
            style: this.style,
        });

        map.addLayer(this.layer);

        this.onClick = this.onClick.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onDrag = this.onDrag.bind(this);

        map.on('click', this.onClick, this);
        map.on('pointerdown', this.onPointerDown, this);
    }

    componentWillUnmount () {
        const map = this.props.map;
        map.removeLayer(this.layer);
        map.un('click', this.onClick, this);
        map.un('pointerdown', this.onPointerDown, this);
    }

    shouldComponentUpdate(nextProps) {
        nextProps.coords = nextProps.route.coordinates.map(c => ol.proj.fromLonLat(c));
        this.style = this.getStyle(nextProps.selected);
        this.line.getGeometry().setCoordinates(nextProps.coords);
        this.layer.setStyle(this.style);

        return true;
    }

    getStyle(selected) {
        let stroke = new ol.style.Stroke({
            width: selected ? 5 : 5,
            color: selected ? '#3388ff' : '#ff3388',
        });
        return new ol.style.Style({stroke}); 
    }

    onClick (e) {
        const map = this.props.map;
        let foundFeatures = false;

        map.forEachFeatureAtPixel(e.pixel, (feature, layer) => {
            if (layer === this.layer) {
                if (this.props.selected) {
                    if (this.props.onclick) {
                        const route = this.props.route;
                        const lngLat = ol.proj.toLonLat(e.coordinate);
                        const event = new CustomEvent(
                            'click',
                            {
                                detail: {
                                    afterWpIndex: getLastWaypointIndexBefore(route, lngLat),
                                    lngLat,
                                }
                            }
                        );
                        this.props.onclick(event);
                    }
                } else if (this.props.onselected) {
                    const event = new CustomEvent('selected', {detail: { route: this.props.route }});
                    this.props.onselected(event);
                }
            }
        });
        
        if (foundFeatures) {
            return false;
        }
    }

    onPointerDown (e) {
        const map = this.props.map;
        map.forEachFeatureAtPixel(e.pixel, (feature, layer) => {
            if (layer === this.layer) {
                map.once('pointerdrag', this.onDrag, this);
                map.once('pointerup', () => map.un('pointerdrag', this.onDrag, this));
            }
        });
    }

    onDrag (e) {
        if (!this.state.selected) {
            return;
        }
        if (!this.props.ondragging) {
            return;
        }

        const map = this.props.map;
        let foundFeatures = false;

        map.forEachFeatureAtPixel(e.pixel, (feature, layer) => {
            if (layer === this.layer) {
                const map = this.props.map;
                const route = this.props.route;

                map.un('pointerdrag', this.onDrag, this);

                const lngLat = ol.proj.toLonLat(e.coordinate);
                const event = new CustomEvent(
                    'dragging',
                    {
                        detail: {
                            afterWpIndex: getLastWaypointIndexBefore(route, lngLat),
                            lngLat,
                        }
                    }
                );
                this.props.ondragging(event);
                e.preventDefault();
            }
        });

        if (foundFeatures) {
            return false;
        }
    }
}