/** 补齐旧 WebView 缺少的并行请求接口，单个请求失败不能中断其余结果。 */
export function initializeWebViewCompatibility(): void {
  if (typeof Promise.allSettled !== 'function') {
    Object.defineProperty(Promise, 'allSettled', {
      configurable: true,
      writable: true,
      value: (values: Iterable<unknown>) => Promise.all(Array.from(values, value => Promise.resolve(value).then(value => ({ status: 'fulfilled', value }), reason => ({ status: 'rejected', reason })))),
    });
  }

  // Windows 10 的旧 WebView2 可能低于 Chrome 97。评论导航使用
  // findLastIndex，缺失时会抛 TypeError 并让所在页面渲染失败。
  defineArraySearch('findLastIndex', (values, predicate, thisArg) => {
    for (let index = values.length - 1; index >= 0; index -= 1) {
      if (predicate.call(thisArg, values[index], index, values)) return index;
    }
    return -1;
  });
  defineArraySearch('findLast', (values, predicate, thisArg) => {
    for (let index = values.length - 1; index >= 0; index -= 1) {
      if (predicate.call(thisArg, values[index], index, values)) return values[index];
    }
    return undefined;
  });
}

type ArraySearch = (
  values: unknown[],
  predicate: (value: unknown, index: number, values: unknown[]) => unknown,
  thisArg: unknown,
) => unknown;

function defineArraySearch(name: 'findLast' | 'findLastIndex', search: ArraySearch): void {
  if (typeof (Array.prototype as unknown as Record<string, unknown>)[name] === 'function') return;
  Object.defineProperty(Array.prototype, name, {
    configurable: true,
    writable: true,
    value: function (this: unknown, predicate: (value: unknown, index: number, values: unknown[]) => unknown, thisArg?: unknown) {
      if (this == null) throw new TypeError(`Array.prototype.${name} called on null or undefined`);
      if (typeof predicate !== 'function') throw new TypeError('predicate must be a function');
      return search(Array.from(this as ArrayLike<unknown>), predicate, thisArg);
    },
  });
}
