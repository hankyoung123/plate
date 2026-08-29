import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { ScrollArea } from './DndScroller';

describe('ScrollArea', () => {
  it('autoscrolls the caller-owned container at the active edge', () => {
    const scrollBy = mock();
    const container = { scrollBy } as unknown as HTMLElement;
    const containerRef = { current: container };
    const rendered = render(
      <ScrollArea
        containerRef={containerRef}
        height={100}
        minStrength={0}
        placement="bottom"
        scrollAreaProps={{ 'aria-label': 'Scroll outline' }}
        strengthMultiplier={10}
      />
    );
    const area = rendered.getByLabelText('Scroll outline');
    area.getBoundingClientRect = () =>
      ({
        bottom: 100,
        height: 100,
        left: 0,
        right: 100,
        top: 0,
        width: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    fireEvent(
      area,
      new MouseEvent('dragover', {
        bubbles: true,
        clientX: 50,
        clientY: 80,
      })
    );

    expect(scrollBy).toHaveBeenCalledWith(0, 8);
    fireEvent.dragLeave(area);
  });
});
