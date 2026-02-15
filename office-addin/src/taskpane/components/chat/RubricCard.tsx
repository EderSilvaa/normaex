import * as React from 'react';
import { theme } from '../../../styles/theme';
import { DetailedReview } from '../../../types/chat.types';

interface RubricCardProps {
    review: DetailedReview;
}

const RubricCard: React.FC<RubricCardProps> = ({ review }) => {
    const getScoreColor = (score: number) => {
        if (score >= 8) return '#22c55e'; // Green
        if (score >= 6) return '#eab308'; // Yellow
        return '#ef4444'; // Red
    };

    return (
        <div style={{
            marginTop: '12px',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${getScoreColor(review.total_score)}40`,
            borderRadius: '8px',
            fontSize: '12px'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '8px'
            }}>
                <span style={{ fontWeight: 600, color: theme.colors.text.primary }}>Avaliação de Qualidade</span>
                <span style={{
                    fontWeight: 700,
                    fontSize: '14px',
                    color: getScoreColor(review.total_score)
                }}>
                    {review.total_score.toFixed(1)}/10
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {review.criteria.map((criterion, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: theme.colors.text.secondary, fontSize: '11px' }}>{criterion.name}</span>
                            <span style={{ color: getScoreColor(criterion.score), fontSize: '11px', fontWeight: 500 }}>
                                {criterion.score.toFixed(1)}
                            </span>
                        </div>
                        {/* Progress Bar */}
                        <div style={{
                            width: '100%',
                            height: '4px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '2px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${(criterion.score / 10) * 100}%`,
                                height: '100%',
                                background: getScoreColor(criterion.score),
                                borderRadius: '2px',
                                transition: 'width 0.5s ease-out'
                            }} />
                        </div>
                        {/* Feedback text if score is low */}
                        {criterion.score < 8 && criterion.feedback && (
                            <span style={{ fontSize: '10px', color: theme.colors.text.tertiary, marginTop: '1px', fontStyle: 'italic' }}>
                                {criterion.feedback}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            <div style={{
                marginTop: '12px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                color: theme.colors.text.secondary,
                fontSize: '11px',
                lineHeight: '1.4'
            }}>
                {review.summary}
            </div>
        </div>
    );
};

export default RubricCard;
