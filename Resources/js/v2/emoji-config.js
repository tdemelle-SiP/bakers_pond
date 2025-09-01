/**
 * emoji-config.js
 * Central configuration for all emoji-related data
 * Used by both legend-v2.js and caseline-nodes.js
 */

export const EMOJI_CONFIG = {
    caseline: {
        '⭐': { 
            legendLabel: 'Filing', 
            displayLabel: '',  // Label shown on timeline nodes
            caselineColor: '#ffd700',
            class: 'filing'
        },
        '✅': { 
            legendLabel: 'Approved', 
            displayLabel: 'APPROVED',
            caselineColor: '#4caf50',
            class: 'approved'
        },
        '⛔': { 
            legendLabel: 'Denied', 
            displayLabel: 'DENIED',
            caselineColor: '#f44336',
            class: 'denied'
        },
        '📐': { 
            legendLabel: 'Plan', 
            displayLabel: 'PLAN',
            caselineColor: '#ffd700',
            class: 'plan'
        },
        '🔍': { 
            legendLabel: 'Review', 
            displayLabel: 'REVIEW',
            caselineColor: 'inherit',
            class: 'review'
        },
        '🐢': { 
            legendLabel: 'Continued', 
            displayLabel: '',
            caselineColor: 'inherit',  // Keep the incoming line color
            class: 'continuance'
        },
        '🏛️': { 
            legendLabel: 'Hearing', 
            displayLabel: 'HEARING',
            caselineColor: 'inherit',
            class: 'hearing'
        },
        '⏰': { 
            legendLabel: 'Expired', 
            displayLabel: 'EXPIRED',
            caselineColor: '#f44336',
            class: 'expired'
        },
        '♻️': { 
            legendLabel: 'Extended', 
            displayLabel: 'EXTENDED',
            caselineColor: '#4caf50',
            class: 'extended'
        },
        '📧': { 
            legendLabel: 'Email', 
            displayLabel: '',
            caselineColor: 'bypass',  // Skip this node when drawing caseline connections
            class: 'email'
        }
    },
    timeline: {
        '🟢': { 
            legendLabel: 'Public Event', 
            color: '#4caf50',
            borderColor: '#388e3c',
            class: 'public-event'
        },
        '🔴': { 
            legendLabel: 'Private Event', 
            color: '#f44336',
            borderColor: '#d32f2f',
            class: 'private-event'
        },
        '❌': { 
            legendLabel: 'Missing Document', 
            color: '#ff0000',
            borderColor: '#cc0000',
            class: 'missing-document'
        }
    }
};

/**
 * Get emoji configuration by emoji character
 * @param {string} emoji - The emoji character
 * @param {string} type - 'caseline' or 'timeline'
 * @returns {Object} Configuration object for the emoji
 */
export function getEmojiConfig(emoji, type = 'caseline') {
    return EMOJI_CONFIG[type][emoji] || null;
}

/**
 * Get all emojis as an array for a given type
 * @param {string} type - 'caseline' or 'timeline'
 * @returns {Array} Array of emoji configuration objects with emoji key added
 */
export function getEmojiArray(type) {
    return Object.entries(EMOJI_CONFIG[type]).map(([emoji, config]) => ({
        emoji,
        ...config
    }));
}