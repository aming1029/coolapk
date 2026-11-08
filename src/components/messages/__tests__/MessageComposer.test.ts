import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MessageComposer from '../MessageComposer.vue';

describe('MessageComposer', () => {
  it('emits text updates and send actions', async () => {
    const wrapper = mount(MessageComposer, {
      props: {
        modelValue: '',
        pendingImages: [],
        sending: false,
        sendingImage: false,
        draftSaved: false,
        inputHeight: 160,
        isFullscreen: false,
        showShortcutHints: false,
        sessionKey: '10001_20002',
      },
      global: {
        stubs: {
          AppImage: true,
          EmojiPanel: true,
        },
      },
    });

    const editor = wrapper.get('[contenteditable="true"]');
    editor.element.textContent = '你好';
    await editor.trigger('input');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['你好']);

    await wrapper.setProps({ modelValue: '你好' });
    await wrapper.get('.app-button').trigger('click');
    expect(wrapper.emitted('send')).toHaveLength(1);
  });

  it('closes the emoji picker before other Escape handlers run', async () => {
    const wrapper = mount(MessageComposer, {
      props: {
        modelValue: '',
        pendingImages: [],
        sending: false,
        sendingImage: false,
        draftSaved: false,
        inputHeight: 160,
        isFullscreen: true,
        showShortcutHints: false,
        sessionKey: '10001_20002',
      },
      global: {
        stubs: {
          AppImage: true,
          EmojiPanel: true,
        },
      },
    });

    await wrapper.get('button[title="表情"]').trigger('click');
    expect(wrapper.find('.emoji-picker-popover').exists()).toBe(true);
    expect(wrapper.vm.dismissEmojiPicker()).toBe(true);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.emoji-picker-popover').exists()).toBe(false);
    expect(wrapper.vm.dismissEmojiPicker()).toBe(false);
  });
});
