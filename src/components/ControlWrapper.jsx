import { Component } from 'preact';
import Control from './Control.jsx';
import '../main.css';

// eslint-disable-next-line react/prefer-stateless-function
export default class ControlWrapper extends Component {
    render(props) {
        return <div class="routing-control-wrapper">
            <Control
                map={props.map}
                waypoints={props.waypoints}
                router={props.router}
                geocoder={props.geocoder}
                onWaypointsUpdate={props.waypointsListener}
                onRoutesUpdate={props.routesListener}
                onItineraryStepClick={props.itineraryStepListener}
            />
        </div>;
    }
}
