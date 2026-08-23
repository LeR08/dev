import {
  freeDaysStatus,
  goalStatus,
  greeting,
  isMilestone,
  milestoneMessage,
  nextMilestone,
  streakHeadline,
  streakSubtitle,
} from '../encouragement';
import { at } from './factories';

describe('streakHeadline', () => {
  it('returns a translation key for each streak shape, never a final string', () => {
    expect(streakHeadline(0)).toEqual({ key: 'encouragement.trackingToday' });
    expect(streakHeadline(1)).toEqual({ key: 'encouragement.streakOneDay' });
    expect(streakHeadline(5)).toEqual({ key: 'encouragement.streakDays', params: { count: 5 } });
  });
});

describe('streakSubtitle', () => {
  it('picks the right key band by streak length', () => {
    expect(streakSubtitle(0).key).toBe('encouragement.subtitleZero');
    expect(streakSubtitle(1).key).toBe('encouragement.subtitleOne');
    expect(streakSubtitle(4).key).toBe('encouragement.subtitleForming');
  });

  it('counts down to the next milestone with params', () => {
    const result = streakSubtitle(8);
    expect(result.key).toBe('encouragement.subtitleToNext');
    expect(result.params).toEqual({ remaining: 2, next: 10 });
  });

  it('has no next milestone once every one has been passed', () => {
    expect(streakSubtitle(400).key).toBe('encouragement.subtitleRemarkable');
  });
});

describe('milestoneMessage', () => {
  it('has a dedicated key for each documented milestone', () => {
    expect(milestoneMessage(7).key).toBe('encouragement.milestone7');
    expect(milestoneMessage(30).key).toBe('encouragement.milestone30');
  });

  it('falls back to the generic count key for anything else', () => {
    expect(milestoneMessage(42)).toEqual({ key: 'encouragement.milestoneDefault', params: { count: 42 } });
  });
});

describe('greeting', () => {
  it('changes by hour of day', () => {
    expect(greeting(at(2026, 1, 1, 3)).key).toBe('encouragement.greetingLate');
    expect(greeting(at(2026, 1, 1, 9)).key).toBe('encouragement.greetingMorning');
    expect(greeting(at(2026, 1, 1, 14)).key).toBe('encouragement.greetingAfternoon');
    expect(greeting(at(2026, 1, 1, 20)).key).toBe('encouragement.greetingEvening');
  });
});

describe('goalStatus', () => {
  it('reports no goal distinctly from being under one', () => {
    expect(goalStatus(5, 0)).toEqual({ key: 'encouragement.noGoalSet', over: false });
  });

  it('reports remaining room under the goal', () => {
    const result = goalStatus(4, 10);
    expect(result.key).toBe('encouragement.goalRemaining');
    expect(result.over).toBe(false);
    expect(result.params).toEqual({ remaining: '6.0', goal: 10 });
  });

  it('reports the amount over, factually, once past the goal', () => {
    const result = goalStatus(12, 10);
    expect(result.key).toBe('encouragement.goalOver');
    expect(result.over).toBe(true);
    expect(result.params).toEqual({ over: '2.0', goal: 10 });
  });
});

describe('freeDaysStatus', () => {
  it('celebrates reaching the goal', () => {
    expect(freeDaysStatus(3, 3)).toEqual({ key: 'encouragement.freeDaysReached', params: { count: 3 } });
  });

  it('reports progress toward the goal', () => {
    expect(freeDaysStatus(1, 3)).toEqual({
      key: 'encouragement.freeDaysProgress',
      params: { count: 1, goal: 3, remaining: 2 },
    });
  });
});

describe('milestone helpers', () => {
  it('finds the next milestone above a streak', () => {
    expect(nextMilestone(5)).toBe(7);
    expect(nextMilestone(400)).toBeNull();
  });

  it('recognises an exact milestone', () => {
    expect(isMilestone(30)).toBe(true);
    expect(isMilestone(31)).toBe(false);
  });
});
