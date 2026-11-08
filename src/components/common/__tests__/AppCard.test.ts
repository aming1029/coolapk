import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import AppCard from '../AppCard.vue';

describe('AppCard', () => {
  it('renders title, subtitle, slots, and padding state', () => {
    const wrapper = mount(AppCard, {
      props: {
        title: '会话统计',
        subtitle: '今日更新',
        noPadding: true,
      },
      slots: {
        default: '<p class="body-content">内容</p>',
        footer: '<button class="footer-action">确认</button>',
      },
    });

    expect(wrapper.get('.card-title').text()).toBe('会话统计');
    expect(wrapper.get('.card-subtitle').text()).toBe('今日更新');
    expect(wrapper.get('.body-content').text()).toBe('内容');
    expect(wrapper.get('.footer-action').text()).toBe('确认');
    expect(wrapper.classes()).toContain('no-padding');
  });
});
