import ol from 'ol'
import { Component } from 'preact';
import { formatDuration, formatDistance } from '../utils'
import circleImage from '../assets/glyph-circle-icon.png'

const defaultStyle = new ol.style.Style({
    image: new ol.style.Icon({
        anchor: [5, 5],
        anchorXUnits: 'pixels',
        anchorYUnits: 'pixels',
        src: circleImage
    })
});

export default class Itinerary extends Component {
    constructor(options) {
        super(options);
        this.formatDuration = formatDuration;
        this.formatDistance = formatDistance;
        this.itineraryStepListener = options.onItineraryStepSelected;
        this.onStepSelected = this.onStepSelected.bind(this);
        this.state = {
            stepIdx: -1
        };
        const map = options.map;
        
        this.feature = new ol.Feature({
            type: 'waypointMarker',
            geometry: new ol.geom.Point([])
        });
        this.feature.setStyle(defaultStyle);
        this.layer = new ol.layer.Vector({
            updateWhileInteracting: true,
            source: new ol.source.Vector({
                features: [this.feature]
            })
        });
        this.layer.setZIndex(5);
        map.addLayer(this.layer);
    }

    shouldComponentUpdate(nextProps, nextState) {
        if (nextState.stepIdx !== -1) {
            const step = this.props.route.instructions[nextState.stepIdx];
            this.feature.getGeometry().setCoordinates(ol.proj.fromLonLat(step.coordinate));
        } else {
            this.feature.getGeometry().setCoordinates([]);
        }
    }

    componentWillUnmount () {
        const map = this.props.map;
        map.removeLayer(this.layer);
    }

    onRouteClicked () {
        const event = new CustomEvent('selected', {detail: { route: this.props.route }});

        if (this.props.onSelected) {
            this.props.onSelected(event);
        }

        return false;
    }

    onStepClicked (event, i) {
        const view = this.props.map.getView();
        const step = this.props.route.instructions[i];
        view.animate({center: ol.proj.fromLonLat(step.coordinate), duration: 500});

        const customEvent = new CustomEvent('itineraryStepClicked', {detail: step});

        if (this.itineraryStepListener) {
            this.itineraryStepListener(customEvent);
        }

        return false;
    }

    onStepSelected(e, i) {
        this.setState({stepIdx: i});
    }

    render(props, state) {
        return <div class={(props.selected ? 'routing-alternative routing-selected' : 'routing-alternative')}>
            <div class="routing-header">
                <h1>
                    <a href="#" onClick={this.onRouteClicked}>{props.route.name}</a>
                </h1>
                <div class="routing-route-summary">
                    {formatDistance(props.route.summary.totalDistance, -1)}, &nbsp;
                    {formatDuration(props.route.summary.totalTime)}
                </div>
            </div>
            <div class="routing-route-itinerary">
                <table onMouseOut={(event) => this.onStepSelected(event, -1)}>
                    <tbody>
                        {props.route.instructions.map((instr, i) => (
                            <tr
                                key={i}
                                class={state.stepIdx === i ? 'selected' : ''}
                                onMouseOver={(event) => this.onStepSelected(event, i)}
                                onClick={(event) => this.onStepClicked(event, i)}
                            >
                                <td>{instr.text}</td>
                                <td class="distance">{formatDistance(instr.distance, -1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>;
    }
}
