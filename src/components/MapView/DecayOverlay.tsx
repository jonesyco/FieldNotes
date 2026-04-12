import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import maplibregl from 'maplibre-gl';
import type { POI } from '../../types';

interface DecayOverlayProps {
    enabled: boolean;
    map: maplibregl.Map | null;
    pois: POI[];
}

interface EmberSeed {
    id: number;
    size: string;
    delay: string;
    duration: string;
}

interface EmberAnchor {
    lng: number;
    lat: number;
    weight: number;
}

interface EmberParticle {
    lng: number;
    lat: number;
    size: string;
    delay: string;
    duration: string;
    offsetX: number;
    offsetY: number;
}

const EMBER_HOTSPOT_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
    { pattern: /theater|theatre|cinema|film|music|stage/i, weight: 4.8 },
    { pattern: /bar|pub|tavern|cocktail|brewery/i, weight: 4.2 },
    { pattern: /bridge|river|water|harbor|harbour|dock/i, weight: 3.9 },
    { pattern: /market|station|hotel|church/i, weight: 2.6 },
];

function buildEmber(index: number): EmberSeed {
    const seed = (index * 41 + 23) % 100;
    return {
        id: index,
        size: `${5 + (seed % 9)}px`,
        delay: `${-(seed % 7)}s`,
        duration: `${4.2 + ((seed * 3) % 24) / 10}s`,
    };
}

function randomBetween(min: number, max: number) {
    return min + Math.random() * (max - min);
}

function pickWeightedAnchor(anchors: EmberAnchor[]): EmberAnchor | null {
    const totalWeight = anchors.reduce((sum, anchor) => sum + anchor.weight, 0);
    if (totalWeight <= 0) return null;

    let threshold = Math.random() * totalWeight;
    for (const anchor of anchors) {
        threshold -= anchor.weight;
        if (threshold <= 0) return anchor;
    }

    return anchors[anchors.length - 1] ?? null;
}

function buildHotspotAnchors(map: maplibregl.Map, pois: POI[]): EmberAnchor[] {
    const bounds = map.getBounds();
    const matchedAnchors = pois.flatMap((poi) => {
        const searchable = `${poi.title} ${poi.tags.join(' ')} ${poi.neighborhood}`;
        const matched = EMBER_HOTSPOT_PATTERNS.find(({ pattern }) => pattern.test(searchable));
        return matched ? [{ lng: poi.lng, lat: poi.lat, weight: matched.weight }] : [];
    });

    const fallbackAnchors = [
        { lng: bounds.getCenter().lng, lat: bounds.getCenter().lat, weight: 1.2 },
    ];

    return matchedAnchors.length > 0 ? matchedAnchors : fallbackAnchors;
}

function createEmberParticles(map: maplibregl.Map, anchors: EmberAnchor[], seeds: EmberSeed[]): EmberParticle[] {
    const bounds = map.getBounds();
    const lngSpan = Math.max(Math.abs(bounds.getEast() - bounds.getWest()), 0.02);
    const latSpan = Math.max(Math.abs(bounds.getNorth() - bounds.getSouth()), 0.02);

    return seeds.map((seed) => {
        const anchor = pickWeightedAnchor(anchors) ?? {
            lng: bounds.getCenter().lng,
            lat: bounds.getCenter().lat,
            weight: 1,
        };

        return {
            lng: anchor.lng + randomBetween(-lngSpan * 0.012, lngSpan * 0.012),
            lat: anchor.lat + randomBetween(-latSpan * 0.012, latSpan * 0.012),
            size: seed.size,
            delay: seed.delay,
            duration: seed.duration,
            offsetX: randomBetween(-10, 10),
            offsetY: randomBetween(-8, 8),
        };
    });
}

export default function DecayOverlay({ enabled, map, pois }: DecayOverlayProps) {
    const emberSeeds = useMemo(() => Array.from({ length: 22 }, (_, index) => buildEmber(index)), []);
    const emberRefs = useRef<Array<HTMLSpanElement | null>>([]);
    const emberParticlesRef = useRef<EmberParticle[]>([]);

    useEffect(() => {
        if (!enabled || !map) {
            emberParticlesRef.current = [];
            return;
        }

        const anchors = buildHotspotAnchors(map, pois);
        emberParticlesRef.current = createEmberParticles(map, anchors, emberSeeds);

        const updatePositions = () => {
            emberParticlesRef.current.forEach((ember, index) => {
                const element = emberRefs.current[index];
                if (!element) return;
                const point = map.project([ember.lng, ember.lat]);
                element.style.transform = `translate(${point.x + ember.offsetX}px, ${point.y + ember.offsetY}px) translate(-50%, -50%)`;
            });
        };

        updatePositions();
        map.on('move', updatePositions);
        map.on('zoom', updatePositions);

        return () => {
            map.off('move', updatePositions);
            map.off('zoom', updatePositions);
        };
    }, [enabled, map, pois, emberSeeds]);

    return (
        <div className={`decay-overlay${enabled ? ' decay-overlay--visible' : ''}`} aria-hidden="true">
            <div className="decay-overlay__ash" />
            <div className="decay-overlay__embers">
                {emberSeeds.map((ember, index) => (
                    <span
                        key={ember.id}
                        ref={(element) => {
                            emberRefs.current[index] = element;
                        }}
                        className="decay-overlay__ember"
                        style={{
                            width: ember.size,
                            height: ember.size,
                            animationDelay: ember.delay,
                            animationDuration: ember.duration,
                        } as CSSProperties}
                    />
                ))}
            </div>
        </div>
    );
}