/**
 * emoji-config.js
 * Central configuration for all emoji-related data
 * Used by both legend.js and caseline-nodes.js
 */

export const EMOJI_CONFIG = {
    caseline: {
        '⭐': { 
            legendLabel: 'Filing', 
            displayLabel: '',  // Label shown on timeline nodes
            caselineColor: '#ffd700',
            class: 'filing',
            defaultVisible: true
        },
        '✅': { 
            legendLabel: 'Approved', 
            displayLabel: 'APPROVED',
            caselineColor: '#4caf50',
            class: 'approved',
            defaultVisible: true,
            metricDisplay: 4,  // Display order in header metrics
            metricLabel: 'Approvals'  // Label for the metric
        },
        '⛔': { 
            legendLabel: 'Denied', 
            displayLabel: 'DENIED',
            caselineColor: '#f44336',
            class: 'denied',
            defaultVisible: true,
            metricDisplay: 3,
            metricLabel: 'Denials'
        },
        '📐': { 
            legendLabel: 'Plan', 
            displayLabel: '',
            caselineColor: '#ffd700',
            class: 'plan',
            defaultVisible: true,
            metricDisplay: 1,
            metricLabel: 'Plan Submissions'
        },
        '🔍': { 
            legendLabel: 'Review', 
            displayLabel: '',
            caselineColor: 'bypass',
            class: 'review',
            defaultVisible: true
        },
        '🐢': { 
            legendLabel: 'Continued', 
            displayLabel: '',
            caselineColor: 'inherit',  // Keep the incoming line color
            class: 'continuance',
            defaultVisible: false,  // Hidden by default
            metricDisplay: 2,
            metricLabel: 'Continuances'
        },
        '🏛️': { 
            legendLabel: 'Hearing', 
            displayLabel: '',
            caselineColor: 'inherit',
            class: 'hearing',
            defaultVisible: true
        },
        '⏰': { 
            legendLabel: 'Expired', 
            displayLabel: 'EXPIRED',
            caselineColor: '#f44336',
            class: 'expired',
            defaultVisible: true
        },
        '♻️': { 
            legendLabel: 'Extended', 
            displayLabel: 'EXTENDED',
            caselineColor: '#4caf50',
            class: 'extended',
            defaultVisible: true
        },
        '📧': { 
            legendLabel: 'Email', 
            displayLabel: '',
            caselineColor: 'bypass',  // Skip this node when drawing caseline connections
            class: 'email',
            defaultVisible: false
        },
        '✏️': { 
            legendLabel: 'Prep', 
            displayLabel: '',
            caselineColor: 'bypass',
            class: 'prep',
            defaultVisible: true
        },
        '❗': { 
            legendLabel: 'Abutter Notice', 
            displayLabel: '',
            caselineColor: 'inherit',
            class: 'notice',
            defaultVisible: true
        },
        '↩️': { 
            legendLabel: 'Appeal', 
            displayLabel: '',
            caselineColor: '#ffd700',
            class: 'appeal',
            defaultVisible: true
        },
        '📄': { 
            legendLabel: 'Govt Form', 
            displayLabel: '',
            caselineColor: 'inherit',
            class: 'govt-form',
            defaultVisible: true
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