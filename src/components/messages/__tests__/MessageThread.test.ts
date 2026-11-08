import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MessageThread from '../MessageThread.vue';

describe('MessageThread', () => {
  it('renders messages and emits thread actions', async () => {
    const message = { id: 'm1', entityType: 'message', message: '你好', dateline: 1000, fromuid: 20002 };
    const followTip = { entityType: 'messageExtra', entityTemplate: 'float', message: '关注后可继续聊天' };
    const wrapper = mount(MessageThread, {
      props: {
        currentSession: { ukey: '10001_20002', messageUid: 20002 },
        currentUserUid: '10001',
        currentUserAvatar: 'self.png',
        messages: [message],
        followTip,
        followNoticeText: '关注后可继续聊天',
        loading: false,
        error: '',
        loadingMore: false,
        loadMoreError: '',
        following: false,
        confirmingFollow: false,
        ready: true,
        getEntityType: vi.fn((item) => item.entityType),
        isWarningNotice: vi.fn(() => false),
        getSystemNoticeText: vi.fn((item) => item.message),
        isSelf: vi.fn(() => false),
        getPartnerAvatar: vi.fn(() => 'partner.png'),
        getPartnerUid: vi.fn(() => '20002'),
        getPicUrl: vi.fn(() => ''),
        getMessageText: vi.fn((item) => item.message),
        renderMessageContent: vi.fn((item) => item.message),
        formatTime: vi.fn(() => '14:30'),
        getDateline: vi.fn((item) => item.dateline || 0),
        getDiagnosticLink: vi.fn(() => ''),
      },
      global: {
        stubs: {
          AppAvatar: true,
          AppImage: true,
          LoadingState: true,
          ErrorState: true,
        },
      },
    });

    expect(wrapper.get('.msg-text').text()).toBe('你好');
    await wrapper.get('.follow-action-btn').trigger('click');
    expect(wrapper.emitted('follow')).toHaveLength(1);
    await wrapper.get('.chat-area').trigger('scroll');
    expect(wrapper.emitted('scroll')).toHaveLength(1);
    await wrapper.get('.msg-avatar').trigger('click');
    expect(wrapper.emitted('open-user')?.[0]).toEqual(['20002']);
  });
});
