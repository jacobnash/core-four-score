import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    VictoryAxis,
    VictoryChart,
    VictoryLegend,
    VictoryLine,
    VictoryTheme,
    VictoryTooltip,
    createContainer,
} from 'victory-native';

const NativeZoomVoronoiContainer = createContainer('zoom', 'voronoi');

function getZoomVoronoiContainerClass() {
    if (Platform.OS !== 'web') return NativeZoomVoronoiContainer;

    const { makeCreateContainerFunction } = require('victory-create-container') as typeof import('victory-create-container');
    const { zoomContainerMixin } = require('victory-zoom-container') as typeof import('victory-zoom-container');
    const { voronoiContainerMixin } = require('victory-voronoi-container') as typeof import('victory-voronoi-container');
    const { VictoryContainer } = require('victory-native') as typeof import('victory-native');

    return makeCreateContainerFunction(
        { zoom: [zoomContainerMixin], voronoi: [voronoiContainerMixin] },
        VictoryContainer,
    )('zoom', 'voronoi');
}

const ZoomVoronoiContainer = getZoomVoronoiContainerClass();

export type ChartRangeKey = 'all' | '14' | '30' | '90' | '365';

export interface ChartSeries {
    id: string;
    name: string;
    color: string;
    data: { x: Date; y: number }[];
}

interface InteractiveStatsChartProps {
    series: ChartSeries[];
    height?: number;
    emptyMessage?: string;
    /** e.g. "wins" or "renegs" — shown in the hover/tap panel */
    valueLabel?: string;
}

interface InspectSnapshot {
    dateLabel: string;
    rows: { name: string; value: number; color: string }[];
}

const RANGE_OPTIONS: { key: ChartRangeKey; label: string }[] = [
    { key: '14', label: '2W' },
    { key: '30', label: '1M' },
    { key: '90', label: '3M' },
    { key: '365', label: '1Y' },
    { key: 'all', label: 'All' },
];

function filterCumulativeSeries(
    data: { x: Date; y: number }[],
    rangeKey: ChartRangeKey,
): { x: Date; y: number }[] {
    if (rangeKey === 'all' || data.length === 0) return data;

    const cutoff = Date.now() - Number(rangeKey) * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(cutoff);

    let baseline = 0;
    for (const point of data) {
        if (point.x.getTime() < cutoff) {
            baseline = point.y;
        } else {
            break;
        }
    }

    return data
        .filter(p => p.x.getTime() >= cutoffDate.getTime())
        .map(p => ({ x: p.x, y: p.y - baseline }));
}

function formatInspectDate(x: Date | number | string): string {
    const d = new Date(x);
    return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function parseActivatedPoints(points: any[], series: ChartSeries[]): InspectSnapshot | null {
    if (!points?.length) return null;

    const x = points[0]?.x ?? points[0]?._x;
    if (x == null) return null;

    const colorByName = Object.fromEntries(series.map(s => [s.name, s.color]));
    const rows = points
        .map(p => {
            const rawName = p.childName || p.name || '';
            const name = String(rawName).split('.')[0];
            return {
                name,
                value: typeof p.y === 'number' ? p.y : Number(p._y ?? 0),
                color: colorByName[name] || '#666',
            };
        })
        .filter(r => r.name)
        .sort((a, b) => b.value - a.value);

    if (rows.length === 0) return null;

    return {
        dateLabel: formatInspectDate(x),
        rows,
    };
}

export function InteractiveStatsChart({
    series,
    height = 240,
    emptyMessage = 'No data yet.',
    valueLabel = 'total',
}: InteractiveStatsChartProps) {
    const [rangeKey, setRangeKey] = useState<ChartRangeKey>('all');
    const [zoomKey, setZoomKey] = useState(0);
    const [inspect, setInspect] = useState<InspectSnapshot | null>(null);

    const filteredSeries = useMemo(
        () =>
            series.map(s => ({
                ...s,
                data: filterCumulativeSeries(s.data, rangeKey),
            })),
        [series, rangeKey],
    );

    const hasData = filteredSeries.some(s => s.data.length > 0);

    const chartContainer = useMemo(
        () => (
            <ZoomVoronoiContainer
                key={zoomKey}
                zoomDimension="x"
                allowZoom
                allowPan
                minimumZoom={{ x: 1000 * 60 * 60 * 24 * 2 }}
                voronoiDimension="x"
                activateLabels
                labels={({ datum }: { datum?: { childName?: string; y?: number } }) => {
                    if (!datum) return '';
                    const name = String(datum.childName || '').split('.')[0];
                    return `${name}: ${datum.y ?? 0}`;
                }}
                labelComponent={
                    <VictoryTooltip
                        constrainToVisibleArea
                        flyoutStyle={{ fill: '#013220', stroke: '#FF6700', strokeWidth: 1 }}
                        style={{ fill: '#F5F5DC', fontSize: 10, fontWeight: 600 }}
                        pointerLength={6}
                        cornerRadius={6}
                        dy={-4}
                    />
                }
                onActivated={(points: any[]) => {
                    setInspect(parseActivatedPoints(points, filteredSeries));
                }}
                onDeactivated={() => setInspect(null)}
            />
        ),
        [zoomKey, filteredSeries],
    );

    const resetView = () => {
        setRangeKey('all');
        setZoomKey(k => k + 1);
        setInspect(null);
    };

    if (!hasData) {
        return <Text style={styles.muted}>{emptyMessage}</Text>;
    }

    return (
        <View>
            <View style={styles.toolbar}>
                <View style={styles.rangeRow}>
                    {RANGE_OPTIONS.map(opt => (
                        <TouchableOpacity
                            key={opt.key}
                            style={[styles.rangePill, rangeKey === opt.key && styles.rangePillActive]}
                            onPress={() => {
                                setRangeKey(opt.key);
                                setZoomKey(k => k + 1);
                                setInspect(null);
                            }}
                        >
                            <Text style={[styles.rangeText, rangeKey === opt.key && styles.rangeTextActive]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity style={styles.resetBtn} onPress={resetView}>
                    <Text style={styles.resetText}>Reset</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.hint}>
                {Platform.OS === 'web'
                    ? 'Hover or tap the chart to see everyone · scroll to zoom · drag to pan'
                    : 'Tap the chart to see everyone · pinch to zoom · drag to pan'}
            </Text>

            <View style={styles.chartWrap}>
                <VictoryChart
                    theme={VictoryTheme.material}
                    height={height}
                    domainPadding={{ x: 12, y: 12 }}
                    containerComponent={chartContainer}
                >
                    <VictoryAxis
                        tickFormat={(t: number | string) => {
                            const d = new Date(t);
                            return `${d.getMonth() + 1}/${d.getDate()}`;
                        }}
                        style={{ tickLabels: { fontSize: 9, angle: -35 } }}
                        tickCount={6}
                    />
                    <VictoryAxis dependentAxis />
                    {filteredSeries.map(s => (
                        <VictoryLine
                            key={s.id}
                            name={s.name}
                            data={s.data}
                            activateData
                            style={{
                                data: { stroke: s.color, strokeWidth: 2 },
                                labels: { display: 'none' },
                            }}
                        />
                    ))}
                </VictoryChart>
                <VictoryLegend
                    x={0}
                    y={0}
                    gutter={12}
                    orientation="horizontal"
                    itemsPerRow={2}
                    style={{ labels: { fontSize: 11 } }}
                    data={filteredSeries.map(s => ({ name: s.name, symbol: { fill: s.color } }))}
                />
            </View>

            <View style={[styles.inspectPanel, !inspect && styles.inspectPanelEmpty]}>
                {inspect ? (
                    <>
                        <Text style={styles.inspectTitle}>{inspect.dateLabel}</Text>
                        {inspect.rows.map(row => (
                            <View key={row.name} style={styles.inspectRow}>
                                <View style={styles.inspectLeft}>
                                    <View style={[styles.dot, { backgroundColor: row.color }]} />
                                    <Text style={styles.inspectName}>{row.name}</Text>
                                </View>
                                <Text style={styles.inspectValue}>
                                    {row.value} {valueLabel}
                                </Text>
                            </View>
                        ))}
                    </>
                ) : (
                    <Text style={styles.inspectPlaceholder}>
                        {Platform.OS === 'web' ? 'Hover over the chart' : 'Tap the chart'} to compare players on a date
                    </Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    muted: { color: '#666' },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
        gap: 8,
        flexWrap: 'wrap',
    },
    rangeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        flex: 1,
    },
    rangePill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#F2F4F7',
    },
    rangePillActive: {
        backgroundColor: '#013220',
    },
    rangeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#555',
    },
    rangeTextActive: {
        color: '#F5F5DC',
    },
    resetBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#FFF4E6',
    },
    resetText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FF6700',
    },
    hint: {
        fontSize: 11,
        color: '#888',
        marginBottom: 8,
    },
    chartWrap: {
        minHeight: 288,
    },
    inspectPanel: {
        marginTop: 10,
        backgroundColor: '#F7F8F9',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E8EAED',
    },
    inspectPanelEmpty: {
        borderStyle: 'dashed',
    },
    inspectTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#013220',
        marginBottom: 8,
    },
    inspectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 5,
    },
    inspectLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    inspectName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#222',
    },
    inspectValue: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FF6700',
        marginLeft: 8,
    },
    inspectPlaceholder: {
        fontSize: 12,
        color: '#888',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
