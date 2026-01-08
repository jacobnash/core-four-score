// Utility functions for the Core Four Score app

/**
 * Calculate win percentage
 * @param wins Number of wins
 * @param gamesPlayed Total games played
 * @returns Win percentage (0-100)
 */
export const calculateWinPercentage = (wins: number, gamesPlayed: number): number => {
    if (gamesPlayed === 0) return 0;
    return (wins / gamesPlayed) * 100;
};

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param array Array to shuffle
 * @returns New shuffled array
 */
export const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

/**
 * Generate random teams from a list of player IDs
 * @param playerIds Array of player IDs
 * @returns Object with team1 and team2 arrays
 */
export const generateTeams = (playerIds: string[]): { team1: string[]; team2: string[] } => {
    if (playerIds.length < 4) {
        throw new Error('Need at least 4 players to generate teams');
    }

    if (playerIds.length % 2 !== 0) {
        throw new Error('Need an even number of players');
    }

    const shuffled = shuffleArray(playerIds);
    const midpoint = Math.floor(shuffled.length / 2);

    return {
        team1: shuffled.slice(0, midpoint),
        team2: shuffled.slice(midpoint),
    };
};

/**
 * Validate game score
 * @param score Score to validate
 * @param maxScore Maximum allowed score (default 10 for Euchre)
 * @returns true if valid, false otherwise
 */
export const validateScore = (score: number, maxScore: number = 10): boolean => {
    return score >= 0 && score <= maxScore && Number.isInteger(score);
};

/**
 * Format date for display
 * @param date Date object or timestamp
 * @returns Formatted date string
 */
export const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
};

/**
 * Format date with time
 * @param date Date object or timestamp
 * @returns Formatted date and time string
 */
export const formatDateTime = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
};

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param date Date object
 * @returns Relative time string
 */
export const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return formatDate(date);
};

/**
 * Determine if a score is a "skunk" (opponent scored 0)
 * @param team1Score Team 1 score
 * @param team2Score Team 2 score
 * @returns true if one team was skunked
 */
export const isSkunked = (team1Score: number, team2Score: number): boolean => {
    return team1Score === 0 || team2Score === 0;
};

/**
 * Check if game is a "barn burner" (close score)
 * @param team1Score Team 1 score
 * @param team2Score Team 2 score
 * @param threshold Point difference threshold (default 2)
 * @returns true if scores are within threshold
 */
export const isBarnBurner = (team1Score: number, team2Score: number, threshold: number = 2): boolean => {
    return Math.abs(team1Score - team2Score) <= threshold;
};
