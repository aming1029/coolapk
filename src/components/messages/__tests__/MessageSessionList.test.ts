import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MessageSessionList from '../MessageSessionList.vue';

describe('MessageSessionList', () => {
  it('renders a session and emits selection, pagination, and resize events', async () => {
    const session = { ukey: '10001_20002', id: '10001_20002', messageUid: 20002 };
    const wrapper = mount(MessageSessionList, {
      props: {
        sessions: [session],
        currentSession: null,
        loading: false,
        loadingMore: false,
        hasMore: true,
        moreError: '',
        isNotLoggedIn: false,
        displayError: '',
        sidebarWidth: 320,
        isSameSession: vi.fn(() => false),
        isSessionUnread: vi.fn(() => true),
        getPartnerAvatar: vi.fn(() => 'avatar.png'),
        getUsername: vi.fn(() => '好友酷友'),
        formatTime: vi.fn(() => '14:30'),
        renderLastMessage: vi.fn(() => '你好'),
        getUnreadCount: vi.fn(() => 2),
        getUnreadLabel: vi.fn(() => '2'),
      },
      global: {
        stubs: {
          AppAvatar: true,
          EmptyState: true,
          LoadingState: true,
          ErrorState: true,
        },
      },
    });

    expect(wrapper.get('.username').text()).toBe('好友酷友');
    await wrapper.get('.session-item').trigger('click');
    expect(wrapper.emitted('select')?.[0]).toEqual([session]);

    await wrapper.get('.session-pagination-action').trigger('click');
    expect(wrapper.emitted('load-more')).toHaveLength(1);

    await wrapper.get('.sidebar-resizer').trigger('mousedown');
    expect(wrapper.emitted('resize-start')).toHaveLength(1);
  });
});
