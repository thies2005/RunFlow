import { render, screen } from '@testing-library/react';
import ActivityRoute from '../ActivityRoute';
import { fireEvent } from '@testing-library/react';

it('distinguishes a request error from missing GPS and offers retry', () => {
    const retry = jest.fn();
    render(<ActivityRoute latlng={undefined} error="Could not load GPS route" onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load GPS route');
    expect(screen.queryByText('No GPS route available')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Retry'}));
    expect(retry).toHaveBeenCalledTimes(1);
});

it('shows an explicit state for indoor activities and missing GPS', () => {
    render(<ActivityRoute latlng={undefined} />);
    expect(screen.getByText('No GPS route available')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
it('shows loading without prematurely claiming GPS is absent', () => {
    render(<ActivityRoute loading latlng={undefined} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading route');
    expect(screen.queryByText('No GPS route available')).not.toBeInTheDocument();
});
it('renders only a vector track and distinguishable endpoint markers for a closed loop', () => {
    const {container} = render(<ActivityRoute latlng={[[45, 25], [45.01, 25.01], [45, 25]]} />);
    expect(screen.getByRole('img', {name: 'GPS route from start to finish'})).toBeInTheDocument();
    expect(container.querySelectorAll('polyline')).toHaveLength(1);
    const markers = container.querySelectorAll('circle');
    expect(markers).toHaveLength(2);
    expect(markers[0].getAttribute('r')).not.toBe(markers[1].getAttribute('r'));
    expect(container.querySelectorAll('image, iframe, canvas')).toHaveLength(0);
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Finish')).toBeInTheDocument();
});
