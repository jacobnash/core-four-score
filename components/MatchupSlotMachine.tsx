import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    buildSpinSequence,
    reelNamesFromSplit,
    TeamSplit,
} from '../utils/matchup';
import { webBoxShadow } from '../utils/shadow';

interface MatchupSlotMachineProps {
    playerIds: string[];
    playerNames: Record<string, string>;
    onComplete: (team1: string[], team2: string[]) => void;
    autoSpin?: boolean;
}

const REEL_COLORS = ['#FF6700', '#2D9A4A', '#B8860B', '#7B61FF'];

function SlotReel({
    label,
    spinning,
    color,
    landed,
}: {
    label: string;
    spinning: boolean;
    color: string;
    landed: boolean;
}) {
    const bounce = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (landed && !spinning) {
            bounce.setValue(0);
            Animated.sequence([
                Animated.timing(bounce, { toValue: -6, duration: 120, useNativeDriver: true }),
                Animated.spring(bounce, { toValue: 0, friction: 5, tension: 80, useNativeDriver: true }),
            ]).start();
        }
    }, [landed, spinning, label, bounce]);

    return (
        <View style={[styles.reelWindow, { borderColor: color }]}>
            <View style={styles.reelShine} />
            <Animated.Text
                style={[
                    styles.reelText,
                    spinning && styles.reelTextSpinning,
                    landed && !spinning && styles.reelTextLanded,
                    { transform: [{ translateY: bounce }] },
                ]}
                numberOfLines={2}
            >
                {label}
            </Animated.Text>
        </View>
    );
}

export function MatchupSlotMachine({
    playerIds,
    playerNames,
    onComplete,
    autoSpin = true,
}: MatchupSlotMachineProps) {
    const [spinning, setSpinning] = useState(false);
    const [frame, setFrame] = useState<TeamSplit | null>(null);
    const [landed, setLanded] = useState(false);
    const [spinCount, setSpinCount] = useState(0);
    const allNames = useMemo(
        () => playerIds.map(id => playerNames[id] || '???'),
        [playerIds, playerNames],
    );

    const reelLabels = useMemo(() => {
        if (!frame) {
            return allNames.length >= 4
                ? allNames.slice(0, 4)
                : [...allNames, ...Array(4 - allNames.length).fill('—')];
        }
        return reelNamesFromSplit(frame, playerNames, 4);
    }, [frame, playerNames, allNames]);

    const runSpin = useCallback(() => {
        if (spinning || playerIds.length < 2) return;

        setLanded(false);
        setSpinning(true);

        const sequence = buildSpinSequence(playerIds);
        setSpinCount(sequence.spinCount);

        let index = 0;
        let flashInterval: ReturnType<typeof setInterval> | null = null;

        const showRandomFlash = () => {
            flashInterval = setInterval(() => {
                const randomSplit = {
                    team1: shufflePick(playerIds, 2),
                    team2: shufflePick(playerIds, 2),
                };
                setFrame(randomSplit);
            }, 140);
        };

        const stopFlash = () => {
            if (flashInterval) clearInterval(flashInterval);
            flashInterval = null;
        };

        showRandomFlash();

        const step = () => {
            stopFlash();
            if (index >= sequence.frames.length) {
                setFrame({ team1: sequence.team1, team2: sequence.team2 });
                setSpinning(false);
                setLanded(true);
                onComplete(sequence.team1, sequence.team2);
                return;
            }

            setFrame(sequence.frames[index]);
            index += 1;
            const isLast = index >= sequence.frames.length;
            const delay = isLast ? 1100 : 220 + index * 45;

            if (!isLast) {
                setTimeout(() => {
                    showRandomFlash();
                    setTimeout(step, 180);
                }, delay);
            } else {
                setTimeout(step, delay);
            }
        };

        setTimeout(step, 700);
    }, [spinning, playerIds, onComplete]);

    useEffect(() => {
        if (!autoSpin || playerIds.length < 2) return;
        const t = setTimeout(() => runSpin(), 900);
        return () => clearTimeout(t);
        // Auto-spin once when players load
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerIds.join('|'), autoSpin]);

    return (
        <View style={styles.machine}>
            <View style={styles.marquee}>
                <Text style={styles.marqueeText}>
                    {spinning ? '🎰 SPINNING… 🎰' : landed ? '✨ DEAL LOCKED ✨' : '🦌 CORE FOUR SLOTS 🦌'}
                </Text>
            </View>

            <View style={styles.lightsRow}>
                {[0, 1, 2, 3, 4].map(i => (
                    <View
                        key={i}
                        style={[
                            styles.light,
                            spinning ? styles.lightOn : landed ? styles.lightWin : null,
                        ]}
                    />
                ))}
            </View>

            <View style={styles.reelsRow}>
                <View style={styles.teamGroup}>
                    <Text style={styles.teamBadge}>TEAM 1</Text>
                    <View style={styles.reelPair}>
                        <SlotReel
                            label={reelLabels[0]}
                            spinning={spinning}
                            color={REEL_COLORS[0]}
                            landed={landed}
                        />
                        <SlotReel
                            label={reelLabels[1]}
                            spinning={spinning}
                            color={REEL_COLORS[1]}
                            landed={landed}
                        />
                    </View>
                </View>

                <View style={styles.vsColumn}>
                    <Text style={styles.vsText}>VS</Text>
                </View>

                <View style={styles.teamGroup}>
                    <Text style={styles.teamBadge}>TEAM 2</Text>
                    <View style={styles.reelPair}>
                        <SlotReel
                            label={reelLabels[2]}
                            spinning={spinning}
                            color={REEL_COLORS[2]}
                            landed={landed}
                        />
                        <SlotReel
                            label={reelLabels[3]}
                            spinning={spinning}
                            color={REEL_COLORS[3]}
                            landed={landed}
                        />
                    </View>
                </View>
            </View>

            {spinCount > 0 && landed && (
                <Text style={styles.spinMeta}>Landed after {spinCount} spins</Text>
            )}

            <TouchableOpacity
                style={[styles.lever, spinning && styles.leverDisabled]}
                onPress={runSpin}
                disabled={spinning}
                activeOpacity={0.85}
            >
                <View style={styles.leverKnob} />
                <Text style={styles.leverText}>
                    {spinning ? 'Spinning…' : landed ? '🎰 SPIN AGAIN' : '🎰 SPIN THE DEAL'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

function shufflePick(ids: string[], count: number): string[] {
    const pool = [...ids].sort(() => Math.random() - 0.5);
    const picked: string[] = [];
    for (let i = 0; i < count; i++) {
        picked.push(pool[i % pool.length]);
    }
    return picked;
}

const styles = StyleSheet.create({
    machine: {
        backgroundColor: '#1a0a2e',
        borderRadius: 16,
        padding: 16,
        borderWidth: 4,
        borderColor: '#F4C95D',
        ...(Platform.OS === 'web'
            ? { boxShadow: webBoxShadow('rgba(244,201,93,0.35)', 8, 20) }
            : {
                shadowColor: '#F4C95D',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 8,
            }),
    },
    marquee: {
        backgroundColor: '#013220',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: '#FF6700',
    },
    marqueeText: {
        color: '#F5F5DC',
        fontWeight: '800',
        fontSize: 14,
        textAlign: 'center',
        letterSpacing: 1,
    },
    lightsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 12,
    },
    light: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#333',
    },
    lightOn: {
        backgroundColor: '#FF6700',
    },
    lightWin: {
        backgroundColor: '#2D9A4A',
    },
    reelsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    teamGroup: {
        flex: 1,
        alignItems: 'center',
    },
    teamBadge: {
        color: '#F4C95D',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 6,
    },
    reelPair: {
        flexDirection: 'row',
        gap: 6,
    },
    vsColumn: {
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    vsText: {
        color: '#FF6700',
        fontWeight: '900',
        fontSize: 16,
    },
    reelWindow: {
        width: 72,
        height: 76,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    reelShine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '40%',
        backgroundColor: 'rgba(255,255,255,0.35)',
    },
    reelText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#013220',
        textAlign: 'center',
        paddingHorizontal: 4,
    },
    reelTextSpinning: {
        color: '#666',
    },
    reelTextLanded: {
        color: '#013220',
        fontSize: 12,
    },
    spinMeta: {
        color: '#aaa',
        fontSize: 11,
        textAlign: 'center',
        marginTop: 10,
        fontStyle: 'italic',
    },
    lever: {
        marginTop: 14,
        backgroundColor: '#FF6700',
        borderRadius: 999,
        paddingVertical: 14,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderWidth: 3,
        borderColor: '#F4C95D',
    },
    leverDisabled: {
        opacity: 0.65,
    },
    leverKnob: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#F4C95D',
        borderWidth: 2,
        borderColor: '#fff',
    },
    leverText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 16,
        letterSpacing: 0.5,
    },
});
