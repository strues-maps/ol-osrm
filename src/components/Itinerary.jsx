import { Component } from 'preact';
import { formatDuration, formatDistance } from '../utils'

export default class Itinerary extends Component {
    constructor(options) {
        super(options);
        this.formatDuration = formatDuration;
        this.formatDistance = formatDistance;
        this.clicked = this.clicked.bind(this);
    }

    clicked () {
        const event = new CustomEvent('selected', {detail: { route: this.props.route }});

        if (this.props.onSelected) {
            this.props.onSelected(event);
        }

        return false;
    };

    render(props) {
        return <div class={(props.selected ? 'routing-alternative routing-selected' : 'routing-alternative')}>
            <div class="routing-header">
                <h1>
                    <a href="#" onClick={this.clicked}>{props.route.name}</a>
                </h1>
                <div class="routing-route-summary">
                    {formatDistance(props.route.summary.totalDistance, -1)}, &nbsp;
                    {formatDuration(props.route.summary.totalTime)}
                </div>
            </div>
            <div class="routing-route-itinerary">
                <table>
                    <tbody>
                        {props.route.instructions.map((instr, i) => (
                            <tr key={i}>
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
