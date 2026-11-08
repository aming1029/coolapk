import { describe, expect, it } from 'vitest';
import {
  formatMessageTime,
  formatSessionTime,
  getNewestChatHistoryCursor,
  getOldestChatHistoryCursor,
  mergeChatHistory,
  sortChatHistory,
} from '../messageModel';

describe('messageModel history helpers', () => {
  it('sorts by dateline and merges duplicate entity ids', () => {
    const existing = [
      { id: '2', dateline: 200, message: 'later' },
      { id: '1', dateline: 100, message: 'first' },
    ];
    const incoming = [
      { id: '2', dateline: 200, message: 'duplicate' },
      { id: '3', dateline: 300, message: 'new' },
    ];

    const sorted = sortChatHistory(existing);
    expect(sorted.map((item) => item.id)).toEqual(['1', '2']);
    expect(sortChatHistory(mergeChatHistory(existing, incoming)).map((item) => item.id)).toEqual(['1', '2', '3']);
  });

  it('reconciles local pending messages with matching server history', () => {
    const existing = [{
      __localPending: true,
      fromuid: 10001,
      dateline: 1000,
      message: 'hello',
      message_pic: '',
    }];
    const incoming = [{
      id: 'server-1',
      fromuid: 10001,
      dateline: 1005,
      message: 'hello',
      message_pic: '',
    }];

    expect(mergeChatHistory(existing, incoming)).toEqual([incoming[0]]);
  });

  it('skips floating tips when finding pagination cursors', () => {
    const items = [
      { entityType: 'messageExtra', entityTemplate: 'float', entityId: 'tip' },
      { entityType: 'message', entityId: 'oldest' },
      { entityType: 'messageExtra', entityTemplate: 'time', entityId: 'time' },
      { entityType: 'message', entityId: 'newest' },
    ];

    expect(getOldestChatHistoryCursor(items)).toBe('oldest');
    expect(getNewestChatHistoryCursor(items)).toBe('newest');
  });

  it('formats session and bubble times against a fixed clock', () => {
    const now = new Date(2026, 10, 8, 14, 30);
    const today = Math.floor(new Date(2026, 10, 8, 9, 5).getTime() / 1000);
    const yesterday = Math.floor(new Date(2026, 10, 7, 18, 20).getTime() / 1000);

    expect(formatSessionTime(today, now)).toBe('09:05');
    expect(formatMessageTime(today, now)).toBe('09:05');
    expect(formatSessionTime(yesterday, now)).toBe('昨天');
    expect(formatMessageTime(yesterday, now)).toBe('昨天 18:20');
  });
});

