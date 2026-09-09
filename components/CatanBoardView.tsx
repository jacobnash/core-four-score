import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon, Text as SvgText } from 'react-native-svg';
import { CatanBoard, CATAN_PORT_LABELS, CatanTileResource } from '../utils/catanBoardGenerator';

const RESOURCE_COLORS: Record<CatanTileResource, string> = {
    wood: '#2F6B3A',
    brick: '#B5622A',
    wheat: '#E0B93D',
    sheep: '#8FC24C',
    ore: '#8A8F98',
    desert: '#D9C9A3',
};

const HEX_SIZE = 34;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;
const ROW_STEP = HEX_HEIGHT * 0.75;

function hexPoints(cx: number, cy: number, size: number): string {
    return Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 180) * (60 * i - 90);
        return `${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`;
    }).join(' ');
}

export function CatanBoardView({ board }: { board: CatanBoard }) {
    const maxRowLength = Math.max(...board.rowLengths);
    const width = maxRowLength * HEX_WIDTH + HEX_WIDTH;
    const height = board.rowLengths.length * ROW_STEP + HEX_HEIGHT * 0.5;

    return (
        <View>
            <Svg width={width} height={height}>
                {board.tiles.map(tile => {
                    const rowLength = board.rowLengths[tile.row];
                    const xOffset = ((maxRowLength - rowLength) * HEX_WIDTH) / 2;
                    const cx = xOffset + tile.col * HEX_WIDTH + HEX_WIDTH / 2;
                    const cy = tile.row * ROW_STEP + HEX_HEIGHT / 2;
                    const isRed = tile.number === 6 || tile.number === 8;

                    return (
                        <React.Fragment key={`${tile.row}-${tile.col}`}>
                            <Polygon
                                points={hexPoints(cx, cy, HEX_SIZE)}
                                fill={RESOURCE_COLORS[tile.resource]}
                                stroke="#013220"
                                strokeWidth={1.5}
                            />
                            {tile.number != null && (
                                <>
                                    <Polygon
                                        points={hexPoints(cx, cy, 13)}
                                        fill="#FDF6E3"
                                        stroke="#013220"
                                        strokeWidth={1}
                                    />
                                    <SvgText
                                        x={cx}
                                        y={cy + 5}
                                        fontSize={14}
                                        fontWeight="800"
                                        fill={isRed ? '#C62828' : '#222'}
                                        textAnchor="middle"
                                    >
                                        {tile.number}
                                    </SvgText>
                                </>
                            )}
                        </React.Fragment>
                    );
                })}
            </Svg>
            <View style={styles.portRow}>
                <Text style={styles.portLabel}>Harbors (place clockwise from any coastal gap):</Text>
                <Text style={styles.portList}>
                    {board.ports.map((p, i) => `${i + 1}. ${CATAN_PORT_LABELS[p]}`).join('   ')}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    portRow: { marginTop: 12 },
    portLabel: { fontSize: 12, fontWeight: '700', color: '#333' },
    portList: { fontSize: 13, color: '#444', marginTop: 4, lineHeight: 20 },
});
