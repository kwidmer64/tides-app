import '@testing-library/jest-dom/vitest';

// Recharts' ResponsiveContainer measures its container via ResizeObserver,
// which jsdom doesn't implement.
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub;
