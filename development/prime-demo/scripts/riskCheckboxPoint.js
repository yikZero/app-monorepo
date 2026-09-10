function requireFiniteNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(
      `${label} must be a finite number, got ${JSON.stringify(value)}`,
    );
  }
  return value;
}

function pickAttributesRecord(attrs) {
  if (attrs === null || typeof attrs !== 'object' || Array.isArray(attrs)) {
    let kind = typeof attrs;
    if (attrs === null) {
      kind = 'null';
    } else if (Array.isArray(attrs)) {
      kind = 'array';
    }
    throw new Error(`getAttributes must return an object, got ${kind}`);
  }
  if (Object.prototype.hasOwnProperty.call(attrs, 'elements')) {
    if (!Array.isArray(attrs.elements)) {
      throw new Error('getAttributes.elements must be an array when present');
    }
    if (attrs.elements.length !== 1) {
      throw new Error(
        `getAttributes.elements length ${attrs.elements.length}; expected a single match`,
      );
    }
    const first = attrs.elements[0];
    if (!first || typeof first !== 'object' || Array.isArray(first)) {
      throw new Error('getAttributes.elements[0] is not an object');
    }
    return first;
  }
  return attrs;
}

function readDetoxScreenFrame(attrs) {
  const record = pickAttributesRecord(attrs);
  const { frame } = record;
  if (!frame || typeof frame !== 'object' || Array.isArray(frame)) {
    throw new Error('getAttributes.frame is missing or not an object');
  }
  const x = requireFiniteNumber(frame.x, 'frame.x');
  const y = requireFiniteNumber(frame.y, 'frame.y');
  const width = requireFiniteNumber(frame.width, 'frame.width');
  const height = requireFiniteNumber(frame.height, 'frame.height');
  if (width <= 0 || height <= 0) {
    throw new Error(
      `getAttributes.frame dimensions must be > 0, got width=${width} height=${height}`,
    );
  }
  return { x, y, width, height };
}

function screenPointFromFrame(frame, localPoint) {
  const localX = requireFiniteNumber(localPoint?.x, 'localPoint.x');
  const localY = requireFiniteNumber(localPoint?.y, 'localPoint.y');
  return {
    x: frame.x + localX,
    y: frame.y + localY,
  };
}

function overlayRiskAcknowledgedPoint(marker, { screenPoint }) {
  const extra = {
    ...(marker.extra && typeof marker.extra === 'object' ? marker.extra : {}),
  };
  if (extra.point && !extra.reactRootPoint) {
    extra.reactRootPoint = extra.point;
  }
  extra.point = {
    x: requireFiniteNumber(screenPoint.x, 'screenPoint.x'),
    y: requireFiniteNumber(screenPoint.y, 'screenPoint.y'),
  };
  extra.coordinateSpace = 'device';
  extra.pointSource = 'detox-frame';
  return {
    ...marker,
    extra,
  };
}

function applyScreenPointToRiskAckMarkers(markers, overlay, sceneKey) {
  if (!Array.isArray(markers)) {
    throw new Error('markers must be an array');
  }
  let matched = 0;
  const next = markers.map((marker) => {
    if (!marker || marker.name !== 'riskAcknowledged') {
      return marker;
    }
    if (sceneKey && marker.sceneKey !== sceneKey) {
      return marker;
    }
    matched += 1;
    return overlayRiskAcknowledgedPoint(marker, overlay);
  });
  if (matched !== 1) {
    throw new Error(
      `Expected 1 riskAcknowledged marker to overlay, found ${matched}`,
    );
  }
  return next;
}

module.exports = {
  applyScreenPointToRiskAckMarkers,
  overlayRiskAcknowledgedPoint,
  readDetoxScreenFrame,
  screenPointFromFrame,
};
