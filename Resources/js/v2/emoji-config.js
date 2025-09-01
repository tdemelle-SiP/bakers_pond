/**
 * emoji-config.js
 * Central configuration for all emoji-related data
 * Used by both legend-v2.js and caseline-nodes.js
 */

export const EMOJI_CONFIG = {
    caseline: {
        '⭐': { 
            label: 'Filing', 
            displayLabel: '',  // Label shown on timeline nodes
            color: '#ffd700', 
            borderColor: '#ccac00',
            class: 'filing'
        },
        '✅': { 
            label: 'Approved', 
            displayLabel: 'APPROVED',
            color: '#4caf50', 
            borderColor: '#388e3c',
            class: 'approved'
        },
        '⛔': { 
            label: 'Denied', 
            displayLabel: 'DENIED',
            color: '#f44336', 
            borderColor: '#d32f2f',
            class: 'denied'
        },
        '📐': { 
            label: 'Plan', 
            displayLabel: 'PLAN',
            color: '#ffd700', 
            borderColor: '#ccac00',
            class: 'plan'
        },
        '🔍': { 
            label: 'Review', 
            displayLabel: 'REVIEW',
            color: '#2196f3', 
            borderColor: '#1976d2',
            class: 'review'
        },
        '🐢': { 
            label: 'Continued', 
            displayLabel: '',
            color: '#ff9800', 
            borderColor: '#f57c00',
            class: 'continuance'
        },
        '🏛️': { 
            label: 'Hearing', 
            displayLabel: 'HEARING',
            color: '#9c27b0', 
            borderColor: '#7b1fa2',
            class: 'hearing'
        },
        '⏰': { 
            label: 'Expired', 
            displayLabel: 'EXPIRED',
            color: '#f44336', 
            borderColor: '#d32f2f',
            class: 'expired'
        },
        '♻️': { 
            label: 'Extended', 
            displayLabel: 'EXTENDED',
            color: '#4caf50', 
            borderColor: '#388e3c',
            class: 'extended'
        },
        '🔒': { 
            label: 'Private', 
            displayLabel: 'PRIVATE',
            color: '#f44336', 
            borderColor: '#d32f2f',
            class: 'private-icon'
        }
    },
    timeline: {
        '🟢': { 
            label: 'Public Event', 
            color: '#4caf50',
            borderColor: '#388e3c',
            class: 'public-event'
        },
        '🔴': { 
            label: 'Private Event', 
            color: '#f44336',
            borderColor: '#d32f2f',
            class: 'private-event'
        },
        '❌': { 
            label: 'Missing Document', 
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