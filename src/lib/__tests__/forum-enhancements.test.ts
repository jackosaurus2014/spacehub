/**
 * @jest-environment node
 */

// Tests for forum enhancements: notification preference filtering, forum schemas

import { validateBody } from '../validations';
import {
  notificationPreferencesSchema,
  voteSchema,
  threadTagsSchema,
  contentReportSchema,
  editContentSchema,
  REPORT_REASONS,
  REPORT_CONTENT_TYPES,
  FORUM_TAGS,
} from '../validations';

// ===========================================================================
// notificationPreferencesSchema
// ===========================================================================
describe('notificationPreferencesSchema', () => {
  it('accepts a fully valid payload with all fields', () => {
    const result = validateBody(notificationPreferencesSchema, {
      emailDigest: true,
      emailAlerts: false,
      pushEnabled: true,
      forumReplies: true,
      directMessages: false,
      marketplaceUpdates: true,
      watchlistAlerts: true,
      newsDigest: true,
      digestFrequency: 'weekly',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.digestFrequency).toBe('weekly');
      expect(result.data.forumReplies).toBe(true);
    }
  });

  it('accepts an empty object (all fields are optional)', () => {
    const result = validateBody(notificationPreferencesSchema, {});
    expect(result.success).toBe(true);
  });

  it('accepts partial updates', () => {
    const result = validateBody(notificationPreferencesSchema, {
      forumReplies: false,
      newsDigest: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.forumReplies).toBe(false);
      expect(result.data.newsDigest).toBe(true);
    }
  });

  it('rejects invalid digestFrequency values', () => {
    const result = validateBody(notificationPreferencesSchema, {
      digestFrequency: 'monthly',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid digestFrequency values', () => {
    for (const freq of ['daily', 'weekly', 'none']) {
      const result = validateBody(notificationPreferencesSchema, { digestFrequency: freq });
      expect(result.success).toBe(true);
    }
  });

  it('rejects non-boolean values for boolean fields', () => {
    const result = validateBody(notificationPreferencesSchema, {
      emailDigest: 'true',
    });
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// voteSchema
// ===========================================================================
describe('voteSchema', () => {
  it('accepts upvote (value: 1)', () => {
    const result = validateBody(voteSchema, { value: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe(1);
    }
  });

  it('accepts downvote (value: -1)', () => {
    const result = validateBody(voteSchema, { value: -1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe(-1);
    }
  });

  it('rejects value 0', () => {
    const result = validateBody(voteSchema, { value: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects value 2', () => {
    const result = validateBody(voteSchema, { value: 2 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer values', () => {
    const result = validateBody(voteSchema, { value: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects string values', () => {
    const result = validateBody(voteSchema, { value: '1' });
    expect(result.success).toBe(false);
  });

  it('rejects missing value', () => {
    const result = validateBody(voteSchema, {});
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// threadTagsSchema
// ===========================================================================
describe('threadTagsSchema', () => {
  it('accepts valid forum tags', () => {
    const result = validateBody(threadTagsSchema, {
      tags: ['discussion', 'technical', 'launch'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty tags array', () => {
    const result = validateBody(threadTagsSchema, { tags: [] });
    expect(result.success).toBe(true);
  });

  it('rejects more than 5 tags', () => {
    const result = validateBody(threadTagsSchema, {
      tags: ['discussion', 'question', 'technical', 'business', 'regulatory', 'itar'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts exactly 5 tags (the maximum)', () => {
    const result = validateBody(threadTagsSchema, {
      tags: ['discussion', 'question', 'technical', 'business', 'regulatory'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid tag values', () => {
    const result = validateBody(threadTagsSchema, {
      tags: ['invalid-tag'],
    });
    expect(result.success).toBe(false);
  });

  it('validates all defined FORUM_TAGS are accepted', () => {
    // Test each tag individually to ensure they are all valid
    for (const tag of FORUM_TAGS) {
      const result = validateBody(threadTagsSchema, { tags: [tag] });
      expect(result.success).toBe(true);
    }
  });

  it('confirms FORUM_TAGS has 12 entries', () => {
    expect(FORUM_TAGS).toHaveLength(12);
  });
});

// ===========================================================================
// contentReportSchema
// ===========================================================================
describe('contentReportSchema', () => {
  it('accepts a valid report with required fields', () => {
    const result = validateBody(contentReportSchema, {
      contentType: 'thread',
      contentId: 'abc-123',
      reason: 'spam',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid report with optional description', () => {
    const result = validateBody(contentReportSchema, {
      contentType: 'post',
      contentId: 'post-456',
      reason: 'harassment',
      description: 'This user is being abusive.',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('This user is being abusive.');
    }
  });

  it('rejects invalid contentType', () => {
    const result = validateBody(contentReportSchema, {
      contentType: 'comment',
      contentId: 'abc',
      reason: 'spam',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid reason', () => {
    const result = validateBody(contentReportSchema, {
      contentType: 'thread',
      contentId: 'abc',
      reason: 'boring',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty contentId', () => {
    const result = validateBody(contentReportSchema, {
      contentType: 'thread',
      contentId: '',
      reason: 'spam',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid content types', () => {
    for (const contentType of REPORT_CONTENT_TYPES) {
      const result = validateBody(contentReportSchema, {
        contentType,
        contentId: 'test-id',
        reason: 'spam',
      });
      expect(result.success).toBe(true);
    }
  });

  it('accepts all valid report reasons', () => {
    for (const reason of REPORT_REASONS) {
      const result = validateBody(contentReportSchema, {
        contentType: 'thread',
        contentId: 'test-id',
        reason,
      });
      expect(result.success).toBe(true);
    }
  });

  it('trims whitespace-only description to undefined', () => {
    const result = validateBody(contentReportSchema, {
      contentType: 'thread',
      contentId: 'test-id',
      reason: 'spam',
      description: '   ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
    }
  });
});

// ===========================================================================
// editContentSchema
// ===========================================================================
describe('editContentSchema', () => {
  it('accepts valid content', () => {
    const result = validateBody(editContentSchema, {
      content: 'Updated post content here.',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe('Updated post content here.');
    }
  });

  it('accepts content with optional title', () => {
    const result = validateBody(editContentSchema, {
      content: 'Updated content.',
      title: 'New Thread Title',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('New Thread Title');
    }
  });

  it('rejects empty content', () => {
    const result = validateBody(editContentSchema, {
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('trims content whitespace', () => {
    const result = validateBody(editContentSchema, {
      content: '  Trimmed content  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe('Trimmed content');
    }
  });

  it('trims title whitespace', () => {
    const result = validateBody(editContentSchema, {
      content: 'Some content.',
      title: '  Trimmed Title  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Trimmed Title');
    }
  });

  it('rejects content exceeding 10000 characters', () => {
    const longContent = 'a'.repeat(10001);
    const result = validateBody(editContentSchema, {
      content: longContent,
    });
    expect(result.success).toBe(false);
  });

  it('accepts content at exactly 10000 characters', () => {
    const maxContent = 'a'.repeat(10000);
    const result = validateBody(editContentSchema, {
      content: maxContent,
    });
    expect(result.success).toBe(true);
  });

  it('rejects title exceeding 200 characters', () => {
    const longTitle = 'a'.repeat(201);
    const result = validateBody(editContentSchema, {
      content: 'Valid content.',
      title: longTitle,
    });
    expect(result.success).toBe(false);
  });

  it('trims whitespace-only content to empty string (min check runs before transform)', () => {
    // Zod applies .min(1) before .transform(), so '   ' (length 3) passes min(1),
    // then gets trimmed to ''. This is a known Zod ordering behavior.
    const result = validateBody(editContentSchema, {
      content: '   ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe('');
    }
  });
});
